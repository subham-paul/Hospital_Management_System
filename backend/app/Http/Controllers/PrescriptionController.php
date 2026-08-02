<?php

namespace App\Http\Controllers;

use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PrescriptionController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Prescription::with(['patient:id,code,name', 'doctor.user:id,name', 'items'])
            ->when($user->role === User::ROLE_DOCTOR, fn ($q) => $q->where('doctor_id', $user->doctor->id))
            ->when($user->role === User::ROLE_PATIENT, fn ($q) => $q->where('patient_id', $user->patient->id))
            ->when($request->query('patient_id'), fn ($q, $id) => $q->where('patient_id', $id))
            ->latest('prescribed_date')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'medical_record_id' => ['nullable', 'exists:medical_records,id'],
            'prescribed_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.medicine_name' => ['required', 'string', 'max:255'],
            'items.*.dosage' => ['nullable', 'string', 'max:100'],
            'items.*.frequency' => ['nullable', 'string', 'max:100'],
            'items.*.duration' => ['nullable', 'string', 'max:100'],
            'items.*.instructions' => ['nullable', 'string', 'max:255'],
        ]);

        $data['doctor_id'] = $user->role === User::ROLE_DOCTOR
            ? $user->doctor->id
            : $request->validate(['doctor_id' => ['required', 'exists:doctors,id']])['doctor_id'];

        $prescription = DB::transaction(function () use ($data) {
            $prescription = Prescription::create(collect($data)->except('items')->all());
            $prescription->items()->createMany($data['items']);

            return $prescription;
        });

        return response()->json($prescription->load(['patient:id,code,name', 'doctor.user:id,name', 'items']), 201);
    }

    public function show(Request $request, Prescription $prescription)
    {
        $user = $request->user();
        if ($user->role === User::ROLE_PATIENT && $prescription->patient_id !== $user->patient?->id) {
            abort(403);
        }

        return $prescription->load(['patient', 'doctor.user:id,name', 'items', 'medicalRecord']);
    }

    public function update(Request $request, Prescription $prescription)
    {
        $user = $request->user();
        if ($user->role === User::ROLE_DOCTOR && $prescription->doctor_id !== $user->doctor->id) {
            return response()->json(['message' => 'You can only edit your own prescriptions.'], 403);
        }

        $data = $request->validate([
            'prescribed_date' => ['sometimes', 'date'],
            'notes' => ['nullable', 'string'],
            'items' => ['sometimes', 'array', 'min:1'],
            'items.*.medicine_name' => ['required_with:items', 'string', 'max:255'],
            'items.*.dosage' => ['nullable', 'string', 'max:100'],
            'items.*.frequency' => ['nullable', 'string', 'max:100'],
            'items.*.duration' => ['nullable', 'string', 'max:100'],
            'items.*.instructions' => ['nullable', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($prescription, $data) {
            $prescription->update(collect($data)->except('items')->all());

            if (isset($data['items'])) {
                $prescription->items()->delete();
                $prescription->items()->createMany($data['items']);
            }
        });

        return $prescription->load(['patient:id,code,name', 'doctor.user:id,name', 'items']);
    }

    public function destroy(Prescription $prescription)
    {
        $prescription->delete();

        return response()->json(['message' => 'Prescription deleted.']);
    }
}
