<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prescription_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('prescription_id')->constrained()->cascadeOnDelete();
            $table->string('medicine_name');
            $table->string('dosage')->nullable();      // e.g. 500mg
            $table->string('frequency')->nullable();   // e.g. 1-0-1
            $table->string('duration')->nullable();    // e.g. 7 days
            $table->string('instructions')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prescription_items');
    }
};
