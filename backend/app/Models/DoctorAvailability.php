<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DoctorAvailability extends Model
{
    protected $fillable = [
        'doctor_id', 'day_of_week', 'start_time', 'end_time', 'is_available',
    ];

    protected $casts = [
        'day_of_week' => 'integer',
        'is_available' => 'boolean',
    ];

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }
}
