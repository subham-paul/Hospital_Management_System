<?php

namespace Database\Seeders;

use App\Models\Admission;
use App\Models\Appointment;
use App\Models\Bill;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ---- Staff accounts (password for all demo users: "password") ----
        User::create([
            'name' => 'System Admin',
            'email' => 'admin@hms.test',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
        ]);

        User::create([
            'name' => 'Rina Das',
            'email' => 'reception@hms.test',
            'password' => 'password',
            'role' => User::ROLE_RECEPTIONIST,
        ]);

        // ---- Doctors ----
        $doctors = collect([
            ['Dr. Anil Sharma', 'anil@hms.test', 'Cardiology', 'MD, DM', 800],
            ['Dr. Priya Menon', 'priya@hms.test', 'Pediatrics', 'MD', 600],
            ['Dr. Rahul Bose', 'rahul@hms.test', 'Orthopedics', 'MS', 700],
        ])->map(function ($d) {
            $user = User::create([
                'name' => $d[0], 'email' => $d[1], 'password' => 'password',
                'role' => User::ROLE_DOCTOR,
            ]);

            $doctor = Doctor::create([
                'user_id' => $user->id,
                'specialization' => $d[2],
                'qualification' => $d[3],
                'consultation_fee' => $d[4],
                'license_no' => 'LIC-'.rand(10000, 99999),
            ]);

            // Mon-Fri, 09:00-17:00
            foreach (range(1, 5) as $day) {
                $doctor->availabilities()->create([
                    'day_of_week' => $day,
                    'start_time' => '09:00',
                    'end_time' => '17:00',
                ]);
            }

            return $doctor;
        });

        // ---- Patients ----
        $patientUser = User::create([
            'name' => 'Amit Roy',
            'email' => 'patient@hms.test',
            'password' => 'password',
            'role' => User::ROLE_PATIENT,
        ]);

        $patients = collect([
            ['Amit Roy', $patientUser->id, 'male', 'B+'],
            ['Sunita Devi', null, 'female', 'O+'],
            ['Karan Mehta', null, 'male', 'A-'],
        ])->map(fn ($p) => Patient::create([
            'user_id' => $p[1],
            'code' => Patient::nextCode(),
            'name' => $p[0],
            'gender' => $p[2],
            'blood_group' => $p[3],
            'dob' => now()->subYears(rand(20, 60))->toDateString(),
            'phone' => '98'.rand(10000000, 99999999),
        ]));

        // ---- Sample workflow data ----
        $appointment = Appointment::create([
            'patient_id' => $patients[0]->id,
            'doctor_id' => $doctors[0]->id,
            'appointment_date' => now()->next('Monday')->toDateString(),
            'appointment_time' => '10:00',
            'status' => 'confirmed',
            'reason' => 'Chest pain follow-up',
        ]);

        $record = MedicalRecord::create([
            'patient_id' => $patients[0]->id,
            'doctor_id' => $doctors[0]->id,
            'appointment_id' => $appointment->id,
            'record_date' => now()->toDateString(),
            'symptoms' => 'Intermittent chest pain, shortness of breath',
            'diagnosis' => 'Mild hypertension',
            'treatment' => 'Lifestyle changes, medication',
        ]);

        Prescription::create([
            'patient_id' => $patients[0]->id,
            'doctor_id' => $doctors[0]->id,
            'medical_record_id' => $record->id,
            'prescribed_date' => now()->toDateString(),
        ])->items()->createMany([
            ['medicine_name' => 'Amlodipine', 'dosage' => '5mg', 'frequency' => '0-0-1', 'duration' => '30 days'],
            ['medicine_name' => 'Aspirin', 'dosage' => '75mg', 'frequency' => '1-0-0', 'duration' => '30 days'],
        ]);

        Admission::create([
            'patient_id' => $patients[1]->id,
            'doctor_id' => $doctors[2]->id,
            'ward' => 'General Ward A',
            'bed_no' => 'A-12',
            'diagnosis' => 'Fracture - left tibia',
            'admitted_at' => now()->subDays(2),
            'status' => 'admitted',
        ]);

        $bill = Bill::create([
            'bill_no' => Bill::nextBillNo(),
            'patient_id' => $patients[0]->id,
            'appointment_id' => $appointment->id,
            'subtotal' => 800,
            'tax' => 40,
            'discount' => 0,
            'total' => 840,
            'billed_at' => now(),
        ]);
        $bill->items()->create([
            'description' => 'Consultation - Cardiology',
            'quantity' => 1, 'unit_price' => 800, 'amount' => 800,
        ]);
    }
}
