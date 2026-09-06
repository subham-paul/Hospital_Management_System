<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    public const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
    public const PAYMENT_STATUSES = ['not_required', 'pending', 'paid', 'failed', 'expired', 'cancelled', 'refund_pending', 'refunded'];

    protected $fillable = [
        'patient_id', 'doctor_id', 'appointment_date', 'appointment_time',
        'status', 'reason', 'notes', 'created_by', 'payment_status',
        'payment_amount', 'payment_currency', 'payment_gateway',
        'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
        'payment_expires_at', 'paid_at', 'receipt_path',
    ];

    protected $hidden = ['razorpay_signature', 'receipt_path'];

    protected $casts = [
        'appointment_date' => 'date',
        'payment_amount' => 'decimal:2',
        'payment_expires_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function doctor()
    {
        return $this->belongsTo(Doctor::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
