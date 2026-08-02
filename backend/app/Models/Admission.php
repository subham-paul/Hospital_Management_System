<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Admission extends Model
{
    public const STATUSES = ['admitted', 'discharged'];

    protected $fillable = [
        'patient_id', 'doctor_id', 'ward', 'bed_no', 'diagnosis',
        'admitted_at', 'discharged_at', 'status', 'notes',
    ];

    protected $casts = [
        'admitted_at' => 'datetime',
        'discharged_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }
}
