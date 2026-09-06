<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // MySQL may use the original composite unique index for the doctor FK.
        // Give that foreign key a dedicated index before replacing the slot index.
        Schema::table('appointments', function (Blueprint $table) {
            $table->index('doctor_id', 'appointments_doctor_id_index');
        });

        Schema::table('appointments', function (Blueprint $table) {
            // Cancelled and expired reservations must not permanently occupy a slot.
            $table->dropUnique(['doctor_id', 'appointment_date', 'appointment_time']);
            $table->index(['doctor_id', 'appointment_date', 'appointment_time'], 'appointments_slot_index');

            $table->string('payment_status', 30)->default('not_required')->after('status')->index();
            $table->decimal('payment_amount', 10, 2)->nullable()->after('payment_status');
            $table->char('payment_currency', 3)->default('INR')->after('payment_amount');
            $table->string('payment_gateway', 30)->nullable()->after('payment_currency');
            $table->string('razorpay_order_id')->nullable()->unique()->after('payment_gateway');
            $table->string('razorpay_payment_id')->nullable()->unique()->after('razorpay_order_id');
            $table->string('razorpay_signature')->nullable()->after('razorpay_payment_id');
            $table->timestamp('payment_expires_at')->nullable()->after('razorpay_signature');
            $table->timestamp('paid_at')->nullable()->after('payment_expires_at');
            $table->string('receipt_path')->nullable()->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('appointments_slot_index');
            $table->dropUnique(['razorpay_order_id']);
            $table->dropUnique(['razorpay_payment_id']);
            $table->dropColumn([
                'payment_status', 'payment_amount', 'payment_currency', 'payment_gateway',
                'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature',
                'payment_expires_at', 'paid_at', 'receipt_path',
            ]);
            $table->unique(['doctor_id', 'appointment_date', 'appointment_time']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex('appointments_doctor_id_index');
        });
    }
};
