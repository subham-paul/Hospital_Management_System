<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Doctor;
use Carbon\Carbon;

class AppointmentAvailability
{
    public const BOOKING_TIMEZONE = 'Asia/Kolkata';

    public function expireReservations(): void
    {
        Appointment::where('payment_status', 'pending')
            ->whereNotNull('payment_expires_at')
            ->where('payment_expires_at', '<=', now())
            ->update([
                'status' => 'cancelled',
                'payment_status' => 'expired',
            ]);
    }

    public function check(int $doctorId, string $date, string $time, ?int $ignoreId = null): ?string
    {
        $this->expireReservations();

        $appointmentAt = Carbon::createFromFormat('Y-m-d H:i', "{$date} {$time}", self::BOOKING_TIMEZONE);
        if ($appointmentAt->lessThanOrEqualTo(Carbon::now(self::BOOKING_TIMEZONE))) {
            return 'Please choose a future appointment date and time.';
        }

        $doctor = Doctor::with('availabilities')->findOrFail($doctorId);
        $day = Carbon::parse($date)->dayOfWeek;
        $slot = $doctor->availabilities->firstWhere('day_of_week', $day);

        if (! $slot || ! $slot->is_available) {
            return 'Doctor is not available on that day.';
        }

        $start = substr($slot->start_time, 0, 5);
        $end = substr($slot->end_time, 0, 5);
        if ($time < $start || $time >= $end) {
            return "Doctor is only available between {$slot->start_time} and {$slot->end_time} on that day.";
        }

        $taken = Appointment::where('doctor_id', $doctorId)
            ->whereDate('appointment_date', $date)
            ->where('appointment_time', $time.':00')
            ->whereNotIn('status', ['cancelled'])
            ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
            ->exists();

        return $taken ? 'That slot is already booked.' : null;
    }
}
