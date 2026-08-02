<?php

namespace App\Http\Controllers;

use App\Models\Admission;
use App\Models\Appointment;
use App\Models\Bill;
use App\Models\Doctor;
use App\Models\MedicalRecord;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /** Role-specific dashboard statistics. */
    public function stats(Request $request)
    {
        $user = $request->user();

        return match ($user->role) {
            User::ROLE_ADMIN => $this->adminStats(),
            User::ROLE_DOCTOR => $this->doctorStats($user),
            User::ROLE_RECEPTIONIST => $this->receptionistStats(),
            User::ROLE_PATIENT => $this->patientStats($user),
        };
    }

    private function adminStats(): array
    {
        return [
            'patients' => Patient::count(),
            'doctors' => Doctor::count(),
            'users' => User::count(),
            'appointments_today' => Appointment::whereDate('appointment_date', today())->count(),
            'current_admissions' => Admission::where('status', 'admitted')->count(),
            'revenue_total' => (float) Bill::where('status', '!=', 'cancelled')->sum('paid_amount'),
            'revenue_outstanding' => (float) Bill::whereIn('status', ['unpaid', 'partially_paid'])
                ->selectRaw('COALESCE(SUM(total - paid_amount), 0) as due')->value('due'),
            'recent_appointments' => Appointment::with(['patient:id,code,name', 'doctor.user:id,name'])
                ->latest()->limit(5)->get(),
        ];
    }

    private function doctorStats(User $user): array
    {
        $doctorId = $user->doctor->id;

        return [
            'appointments_today' => Appointment::where('doctor_id', $doctorId)
                ->whereDate('appointment_date', today())->whereNotIn('status', ['cancelled'])->count(),
            'appointments_pending' => Appointment::where('doctor_id', $doctorId)->where('status', 'pending')->count(),
            'my_patients' => Appointment::where('doctor_id', $doctorId)->distinct('patient_id')->count('patient_id'),
            'records_written' => MedicalRecord::where('doctor_id', $doctorId)->count(),
            'prescriptions_written' => Prescription::where('doctor_id', $doctorId)->count(),
            'todays_schedule' => Appointment::with('patient:id,code,name')
                ->where('doctor_id', $doctorId)->whereDate('appointment_date', today())
                ->whereNotIn('status', ['cancelled'])->orderBy('appointment_time')->get(),
        ];
    }

    private function receptionistStats(): array
    {
        return [
            'patients' => Patient::count(),
            'appointments_today' => Appointment::whereDate('appointment_date', today())->count(),
            'pending_appointments' => Appointment::where('status', 'pending')->count(),
            'current_admissions' => Admission::where('status', 'admitted')->count(),
            'unpaid_bills' => Bill::whereIn('status', ['unpaid', 'partially_paid'])->count(),
            'todays_appointments' => Appointment::with(['patient:id,code,name', 'doctor.user:id,name'])
                ->whereDate('appointment_date', today())->orderBy('appointment_time')->get(),
        ];
    }

    private function patientStats(User $user): array
    {
        $patientId = $user->patient->id;

        return [
            'upcoming_appointments' => Appointment::with('doctor.user:id,name')
                ->where('patient_id', $patientId)
                ->whereDate('appointment_date', '>=', today())
                ->whereNotIn('status', ['cancelled', 'completed'])
                ->orderBy('appointment_date')->get(),
            'medical_records' => MedicalRecord::where('patient_id', $patientId)->count(),
            'prescriptions' => Prescription::where('patient_id', $patientId)->count(),
            'bills_due' => (float) Bill::where('patient_id', $patientId)
                ->whereIn('status', ['unpaid', 'partially_paid'])
                ->selectRaw('COALESCE(SUM(total - paid_amount), 0) as due')->value('due'),
            'is_admitted' => Admission::where('patient_id', $patientId)->where('status', 'admitted')->exists(),
        ];
    }
}
