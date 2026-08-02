<?php

namespace App\Http\Controllers;

use App\Models\Patient;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        return Patient::query()
            ->when($request->query('search'), fn ($q, $s) => $q->where(
                fn ($q) => $q->where('name', 'like', "%{$s}%")
                    ->orWhere('code', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
            ))
            ->latest()
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $this->validated($request);
        $data['code'] = Patient::nextCode();

        return response()->json(Patient::create($data), 201);
    }

    public function show(Patient $patient)
    {
        return $patient->load([
            'appointments.doctor.user', 'admissions.doctor.user',
            'medicalRecords.doctor.user', 'bills',
        ]);
    }

    public function update(Request $request, Patient $patient)
    {
        $patient->update($this->validated($request));

        return $patient;
    }

    public function destroy(Patient $patient)
    {
        $patient->delete();

        return response()->json(['message' => 'Patient deleted.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'dob' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', 'in:male,female,other'],
            'blood_group' => ['nullable', 'string', 'max:5'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email'],
            'address' => ['nullable', 'string'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
        ]);
    }
}
