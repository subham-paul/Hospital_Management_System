<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\User;
use App\Services\AppointmentAvailability;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    public function __construct(private readonly AppointmentAvailability $availability)
    {
    }

    /** Listing is scoped by role: doctors see their own, patients see their own. */
    public function index(Request $request)
    {
        $this->availability->expireReservations();
        $user = $request->user();

        return Appointment::with(['patient:id,code,name', 'doctor.user:id,name'])
            ->when($user->role === User::ROLE_DOCTOR, fn ($q) => $q->where('doctor_id', $user->doctor->id))
            ->when($user->role === User::ROLE_PATIENT, fn ($q) => $q->where('patient_id', $user->patient->id))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('date'), fn ($q, $d) => $q->whereDate('appointment_date', $d))
            ->orderBy('appointment_date')->orderBy('appointment_time')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'patient_id' => [
                Rule::requiredIf($user->role !== User::ROLE_PATIENT),
                'nullable',
                'exists:patients,id',
            ],
            'doctor_id' => ['required', 'exists:doctors,id'],
            'appointment_date' => [
                'required',
                'date',
                'after_or_equal:'.Carbon::now(AppointmentAvailability::BOOKING_TIMEZONE)->toDateString(),
            ],
            'appointment_time' => ['required', 'date_format:H:i'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        // Patients can only book for themselves.
        if ($user->role === User::ROLE_PATIENT) {
            if (! $user->patient) {
                return response()->json(['message' => 'Patient profile not found.'], 422);
            }

            $data['patient_id'] = $user->patient->id;
        }

        $appointment = DB::transaction(function () use ($data, $user) {
            Doctor::lockForUpdate()->findOrFail($data['doctor_id']);
            $error = $this->availability->check($data['doctor_id'], $data['appointment_date'], $data['appointment_time']);
            abort_if($error, 422, $error);

            return Appointment::create([
                ...$data,
                'status' => 'confirmed',
                'payment_status' => 'not_required',
                'created_by' => $user->id,
            ]);
        });

        return response()->json($appointment->load(['patient:id,code,name', 'doctor.user:id,name']), 201);
    }

    public function show(Request $request, Appointment $appointment)
    {
        $this->authorizeView($request->user(), $appointment);

        return $appointment->load(['patient', 'doctor.user:id,name', 'creator:id,name']);
    }

    /** Status transitions + rescheduling. */
    public function update(Request $request, Appointment $appointment)
    {
        $user = $request->user();
        $this->authorizeView($user, $appointment);

        $data = $request->validate([
            'status' => ['sometimes', Rule::in(Appointment::STATUSES)],
            'appointment_date' => [
                'sometimes',
                'date',
                'after_or_equal:'.Carbon::now(AppointmentAvailability::BOOKING_TIMEZONE)->toDateString(),
            ],
            'appointment_time' => ['sometimes', 'date_format:H:i'],
            'notes' => ['nullable', 'string'],
        ]);

        // Patients may only cancel their own pending appointments.
        if ($user->role === User::ROLE_PATIENT) {
            $data = array_intersect_key($data, array_flip(['status']));
            if (($data['status'] ?? null) !== 'cancelled') {
                return response()->json(['message' => 'Patients can only cancel appointments.'], 403);
            }
            if ($appointment->payment_status === 'paid') {
                return response()->json(['message' => 'Please contact the hospital to cancel a paid appointment and arrange the refund.'], 422);
            }
            if ($appointment->payment_status === 'pending') {
                $data['payment_status'] = 'cancelled';
            }
        }

        if (isset($data['appointment_date']) || isset($data['appointment_time'])) {
            $date = $data['appointment_date'] ?? $appointment->appointment_date->toDateString();
            $time = $data['appointment_time'] ?? substr($appointment->appointment_time, 0, 5);
            $error = $this->availability->check($appointment->doctor_id, $date, $time, $appointment->id);
            if ($error) {
                return response()->json(['message' => $error], 422);
            }
        }

        $appointment->update($data);

        return $appointment->load(['patient:id,code,name', 'doctor.user:id,name']);
    }

    public function destroy(Appointment $appointment)
    {
        $appointment->delete();

        return response()->json(['message' => 'Appointment deleted.']);
    }

    private function authorizeView(User $user, Appointment $appointment): void
    {
        $allowed = match ($user->role) {
            User::ROLE_DOCTOR => $appointment->doctor_id === $user->doctor?->id,
            User::ROLE_PATIENT => $appointment->patient_id === $user->patient?->id,
            default => true,
        };

        abort_unless($allowed, 403, 'Not authorized for this appointment.');
    }
}
