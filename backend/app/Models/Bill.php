<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bill extends Model
{
    public const STATUSES = ['unpaid', 'partially_paid', 'paid', 'cancelled'];

    protected $fillable = [
        'patient_id', 'admission_id', 'appointment_id', 'bill_no',
        'subtotal', 'tax', 'discount', 'total', 'paid_amount',
        'status', 'payment_method', 'billed_at',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'billed_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function admission()
    {
        return $this->belongsTo(Admission::class);
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function items()
    {
        return $this->hasMany(BillItem::class);
    }

    public static function nextBillNo(): string
    {
        $last = static::max('id') ?? 0;

        return 'INV-'.str_pad((string) ($last + 1), 6, '0', STR_PAD_LEFT);
    }
}
