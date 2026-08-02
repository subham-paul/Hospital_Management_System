<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Patient extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'code', 'name', 'dob', 'gender', 'blood_group',
        'phone', 'email', 'address', 'emergency_contact_name', 'emergency_contact_phone',
    ];

    protected $casts = ['dob' => 'date'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function admissions()
    {
        return $this->hasMany(Admission::class);
    }

    public function medicalRecords()
    {
        return $this->hasMany(MedicalRecord::class);
    }

    public function bills()
    {
        return $this->hasMany(Bill::class);
    }

    public static function nextCode(): string
    {
        $last = static::max('id') ?? 0;

        return 'PT-'.str_pad((string) ($last + 1), 5, '0', STR_PAD_LEFT);
    }
}
