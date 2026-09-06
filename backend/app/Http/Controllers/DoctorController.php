<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DoctorController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min(max($request->integer('per_page', 15), 1), 100);

        return Doctor::select('id', 'user_id', 'specialization', 'qualification', 'license_no', 'consultation_fee', 'bio', 'created_at', 'updated_at')
            ->with([
                'user:id,name,email,phone,is_active',
                'availabilities:id,doctor_id,day_of_week,start_time,end_time,is_available'
            ])
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('specialization', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->latest()
            ->paginate($perPage);
    }

    /** Creates the user account (role=doctor) and doctor profile together. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'phone' => ['nullable', 'string', 'max:30'],
            'specialization' => ['required', 'string', 'max:255'],
            'qualification' => ['nullable', 'string', 'max:255'],
            'license_no' => ['required', 'string', 'max:255'],
            'consultation_fee' => ['required', 'numeric', 'min:1'],
            'bio' => ['nullable', 'string'],
        ]);

        $doctor = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'phone' => $data['phone'] ?? null,
                'role' => User::ROLE_DOCTOR,
            ]);

            return Doctor::create([
                'user_id' => $user->id,
                'specialization' => $data['specialization'],
                'qualification' => $data['qualification'] ?? null,
                'license_no' => $data['license_no'],
                'consultation_fee' => $data['consultation_fee'],
                'bio' => $data['bio'] ?? null,
            ]);
        });

        return response()->json($doctor->load('user'), 201);
    }

    public function show(Doctor $doctor)
    {
        return $doctor->load([
            'user:id,name,email,phone,is_active',
            'availabilities:id,doctor_id,day_of_week,start_time,end_time,is_available'
        ]);
    }

    public function update(Request $request, Doctor $doctor)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($doctor->user_id)],
            'phone' => ['nullable', 'string', 'max:30'],
            'specialization' => ['sometimes', 'string', 'max:255'],
            'qualification' => ['nullable', 'string', 'max:255'],
            'license_no' => ['sometimes', 'required', 'string', 'max:255'],
            'consultation_fee' => ['sometimes', 'required', 'numeric', 'min:1'],
            'bio' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($doctor, $data) {
            $doctor->user->update(array_intersect_key($data, array_flip(['name', 'email', 'phone'])));
            $doctor->update(array_intersect_key($data, array_flip([
                'specialization', 'qualification', 'license_no', 'consultation_fee', 'bio',
            ])));
        });

        return $doctor->load('user');
    }

    public function destroy(Doctor $doctor)
    {
        // Deleting the user cascades to the doctor profile.
        $doctor->user()->delete();

        return response()->json(['message' => 'Doctor deleted.']);
    }

    /** Replace a doctor's weekly availability. */
    public function setAvailability(Request $request, Doctor $doctor)
    {
        $user = $request->user();
        if ($user->role === User::ROLE_DOCTOR && $user->doctor?->id !== $doctor->id) {
            return response()->json(['message' => 'You can only edit your own availability.'], 403);
        }

        $data = $request->validate([
            'availabilities' => ['required', 'array'],
            'availabilities.*.day_of_week' => ['required', 'integer', 'between:0,6'],
            'availabilities.*.start_time' => ['required', 'date_format:H:i'],
            'availabilities.*.end_time' => ['required', 'date_format:H:i', 'after:availabilities.*.start_time'],
            'availabilities.*.is_available' => ['boolean'],
        ]);

        DB::transaction(function () use ($doctor, $data) {
            $doctor->availabilities()->delete();
            $doctor->availabilities()->createMany($data['availabilities']);
        });

        return $doctor->load('availabilities');
    }
}
