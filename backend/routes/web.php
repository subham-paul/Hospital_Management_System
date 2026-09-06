<?php

use App\Http\Controllers\AppointmentPaymentController;
use Illuminate\Support\Facades\Route;

Route::get('/receipts/appointments/{appointment}', [AppointmentPaymentController::class, 'downloadReceipt'])
    ->middleware('signed')
    ->name('receipt.download');

Route::get('/', fn () => response()->json([
    'app' => 'Hospital Management System API',
    'status' => 'running',
]));
