<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'app' => 'Hospital Management System API',
    'status' => 'running',
]));
