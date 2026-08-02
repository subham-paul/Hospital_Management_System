<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrescriptionItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'prescription_id', 'medicine_name', 'dosage', 'frequency', 'duration', 'instructions',
    ];

    public function prescription()
    {
        return $this->belongsTo(Prescription::class);
    }
}
