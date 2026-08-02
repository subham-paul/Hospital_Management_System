<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppointmentController extends Controller
{
    /** Listing is scoped by role: doctors see their own, patients see their own. */
    public function index(Request $request)
    {
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
            'appointment_date' => ['required', 'date', 'after_or_equal:today'],
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

        $error = $this->checkAvailability($data['doctor_id'], $data['appointment_date'], $data['appointment_time']);
        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        $appointment = Appointment::create([
            ...$data,
            'status' => $user->role === User::ROLE_PATIENT ? 'pending' : 'confirmed',
            'created_by' => $user->id,
        ]);

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
            'appointment_date' => ['sometimes', 'date', 'after_or_equal:today'],
            'appointment_time' => ['sometimes', 'date_format:H:i'],
            'notes' => ['nullable', 'string'],
        ]);

        // Patients may only cancel their own pending appointments.
        if ($user->role === User::ROLE_PATIENT) {
            $data = array_intersect_key($data, array_flip(['status']));
            if (($data['status'] ?? null) !== 'cancelled') {
                return response()->json(['message' => 'Patients can only cancel appointments.'], 403);
            }
        }

        if (isset($data['appointment_date']) || isset($data['appointment_time'])) {
            $date = $data['appointment_date'] ?? $appointment->appointment_date->toDateString();
            $time = $data['appointment_time'] ?? substr($appointment->appointment_time, 0, 5);
            $error = $this->checkAvailability($appointment->doctor_id, $date, $time, $appointment->id);
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

    /** Validates against the doctor's weekly schedule and double-booking. */
    private function checkAvailability(int $doctorId, string $date, string $time, ?int $ignoreId = null): ?string
    {
        $doctor = Doctor::with('availabilities')->findOrFail($doctorId);
        $day = Carbon::parse($date)->dayOfWeek;

        $slot = $doctor->availabilities->firstWhere('day_of_week', $day);
        if (! $slot || ! $slot->is_available) {
            return 'Doctor is not available on that day.';
        }
        if ($time < substr($slot->start_time, 0, 5) || $time >= substr($slot->end_time, 0, 5)) {
            return "Doctor is only available between {$slot->start_time} and {$slot->end_time} on that day.";
        }

        $taken = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->where('appointment_time', $time.':00')
            ->whereNotIn('status', ['cancelled'])
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        return $taken ? 'That slot is already booked.' : null;
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
