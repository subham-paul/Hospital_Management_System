<?php

namespace App\Http\Controllers;

use App\Models\Admission;
use App\Models\User;
use Illuminate\Http\Request;

class AdmissionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Admission::with(['patient:id,code,name', 'doctor.user:id,name'])
            ->when($user->role === User::ROLE_DOCTOR, fn ($q) => $q->where('doctor_id', $user->doctor->id))
            ->when($user->role === User::ROLE_PATIENT, fn ($q) => $q->where('patient_id', $user->patient->id))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest('admitted_at')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'doctor_id' => ['required', 'exists:doctors,id'],
            'ward' => ['required', 'string', 'max:100'],
            'bed_no' => ['required', 'string', 'max:50'],
            'diagnosis' => ['nullable', 'string'],
            'admitted_at' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        $alreadyAdmitted = Admission::where('patient_id', $data['patient_id'])
            ->where('status', 'admitted')->exists();
        if ($alreadyAdmitted) {
            return response()->json(['message' => 'Patient is already admitted.'], 422);
        }

        $bedTaken = Admission::where('ward', $data['ward'])->where('bed_no', $data['bed_no'])
            ->where('status', 'admitted')->exists();
        if ($bedTaken) {
            return response()->json(['message' => 'That bed is currently occupied.'], 422);
        }

        return response()->json(
            Admission::create([...$data, 'status' => 'admitted'])->load(['patient:id,code,name', 'doctor.user:id,name']),
            201
        );
    }

    public function show(Admission $admission)
    {
        return $admission->load(['patient', 'doctor.user:id,name']);
    }

    public function update(Request $request, Admission $admission)
    {
        $data = $request->validate([
            'doctor_id' => ['sometimes', 'exists:doctors,id'],
            'ward' => ['sometimes', 'string', 'max:100'],
            'bed_no' => ['sometimes', 'string', 'max:50'],
            'diagnosis' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $admission->update($data);

        return $admission->load(['patient:id,code,name', 'doctor.user:id,name']);
    }

    public function discharge(Request $request, Admission $admission)
    {
        if ($admission->status === 'discharged') {
            return response()->json(['message' => 'Patient is already discharged.'], 422);
        }

        $data = $request->validate([
            'discharged_at' => ['nullable', 'date', 'after_or_equal:'.$admission->admitted_at],
            'notes' => ['nullable', 'string'],
        ]);

        $admission->update([
            'status' => 'discharged',
            'discharged_at' => $data['discharged_at'] ?? now(),
            'notes' => $data['notes'] ?? $admission->notes,
        ]);

        return $admission->load(['patient:id,code,name', 'doctor.user:id,name']);
    }

    public function destroy(Admission $admission)
    {
        $admission->delete();

        return response()->json(['message' => 'Admission deleted.']);
    }
}
