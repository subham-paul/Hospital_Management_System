<?php

namespace App\Services;

use App\Mail\AppointmentPaymentReceipt;
use App\Models\Appointment;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Razorpay\Api\Api;
use RuntimeException;
use Throwable;

class RazorpayAppointmentPayment
{
    public function isConfigured(): bool
    {
        return filled(config('services.razorpay.key_id')) && filled(config('services.razorpay.key_secret'));
    }

    public function createOrder(Appointment $appointment): array
    {
        $api = $this->api();
        $amount = (int) round((float) $appointment->payment_amount * 100);

        $order = $api->order->create([
            'receipt' => 'APT-'.str_pad((string) $appointment->id, 8, '0', STR_PAD_LEFT),
            'amount' => $amount,
            'currency' => $appointment->payment_currency,
            'notes' => [
                'appointment_id' => (string) $appointment->id,
                'doctor_id' => (string) $appointment->doctor_id,
            ],
        ]);

        return $order->toArray();
    }

    public function verifyCheckout(Appointment $appointment, string $paymentId, string $signature): array
    {
        $secret = (string) config('services.razorpay.key_secret');
        $expectedSignature = hash_hmac(
            'sha256',
            $appointment->razorpay_order_id.'|'.$paymentId,
            $secret
        );

        if (! hash_equals($expectedSignature, $signature)) {
            throw ValidationException::withMessages(['payment' => 'Payment verification failed. Please contact support before trying again.']);
        }

        $payment = $this->api()->payment->fetch($paymentId)->toArray();
        $this->assertCapturedPaymentMatches($appointment, $payment);

        return $this->complete($appointment, $payment, $signature);
    }

    public function completeFromWebhook(Appointment $appointment, array $payment): array
    {
        $this->assertCapturedPaymentMatches($appointment, $payment);

        return $this->complete($appointment, $payment);
    }

    private function complete(Appointment $appointment, array $payment, ?string $signature = null): array
    {
        [$appointment, $newlyPaid, $slotConflict] = DB::transaction(function () use ($appointment, $payment, $signature) {
            $locked = Appointment::lockForUpdate()->findOrFail($appointment->id);

            if ($locked->payment_status === 'paid') {
                return [$locked, false, false];
            }
            if (in_array($locked->payment_status, ['refund_pending', 'refunded'], true)) {
                throw ValidationException::withMessages([
                    'payment' => $locked->payment_status === 'refunded'
                        ? 'This payment was refunded because the appointment slot was no longer available.'
                        : 'A refund is already being processed for this payment. Please contact the hospital if you need help.',
                ]);
            }

            $conflict = Appointment::where('doctor_id', $locked->doctor_id)
                ->whereDate('appointment_date', $locked->appointment_date)
                ->where('appointment_time', $locked->appointment_time)
                ->where('id', '!=', $locked->id)
                ->whereNotIn('status', ['cancelled'])
                ->exists();

            if ($conflict) {
                $locked->update([
                    'status' => 'cancelled',
                    'payment_status' => 'refund_pending',
                    'razorpay_payment_id' => $payment['id'],
                    'paid_at' => now(),
                    'payment_expires_at' => null,
                ]);

                return [$locked->fresh(), false, true];
            }

            $locked->update([
                'status' => 'confirmed',
                'payment_status' => 'paid',
                'payment_gateway' => 'razorpay',
                'razorpay_payment_id' => $payment['id'],
                'razorpay_signature' => $signature ?: $locked->razorpay_signature,
                'paid_at' => now(),
                'payment_expires_at' => null,
            ]);

            return [$locked->fresh(), true, false];
        });

        if ($slotConflict) {
            try {
                $this->api()->payment->fetch($payment['id'])->refund([
                    'amount' => (int) round((float) $appointment->payment_amount * 100),
                    'notes' => ['reason' => 'Appointment slot no longer available'],
                ]);
                $appointment->update(['payment_status' => 'refunded']);

                throw ValidationException::withMessages([
                    'payment' => 'The slot became unavailable while payment was processing, so the payment was automatically refunded.',
                ]);
            } catch (ValidationException $exception) {
                throw $exception;
            } catch (Throwable $exception) {
                Log::critical('Automatic Razorpay refund failed after an appointment slot conflict.', [
                    'appointment_id' => $appointment->id,
                    'payment_id' => $payment['id'],
                    'exception' => $exception->getMessage(),
                ]);

                throw ValidationException::withMessages([
                    'payment' => 'The slot became unavailable and the refund needs attention. Please contact the hospital with payment ID '.$payment['id'].'.',
                ]);
            }
        }

        $appointment->load(['patient.user', 'doctor.user']);
        $receiptUrl = $appointment->receipt_path ? $this->temporaryReceiptUrl($appointment) : null;
        $emailSent = false;

        if ($newlyPaid) {
            try {
                $this->generateReceipt($appointment);
                $appointment->refresh()->load(['patient.user', 'doctor.user']);
                $receiptUrl = $this->temporaryReceiptUrl($appointment);

                $email = $appointment->patient->email ?: $appointment->patient->user?->email;
                if ($email && ! preg_match('/[\r\n]/', $email) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    Mail::to($email)->send(new AppointmentPaymentReceipt($appointment, $receiptUrl));
                    $emailSent = true;
                }
            } catch (Throwable $exception) {
                Log::error('Appointment payment succeeded but receipt delivery failed.', [
                    'appointment_id' => $appointment->id,
                    'payment_id' => $payment['id'],
                    'exception' => $exception->getMessage(),
                ]);
            }
        }

        return [
            'appointment' => $appointment,
            'receipt_url' => $receiptUrl,
            'email_sent' => $emailSent,
        ];
    }

    private function assertCapturedPaymentMatches(Appointment $appointment, array $payment): void
    {
        $expectedAmount = (int) round((float) $appointment->payment_amount * 100);

        if (($payment['order_id'] ?? null) !== $appointment->razorpay_order_id
            || (int) ($payment['amount'] ?? 0) !== $expectedAmount
            || strtoupper((string) ($payment['currency'] ?? '')) !== $appointment->payment_currency
            || ($payment['status'] ?? null) !== 'captured') {
            throw ValidationException::withMessages([
                'payment' => 'The payment is not captured or does not match this appointment.',
            ]);
        }
    }

    private function generateReceipt(Appointment $appointment): void
    {
        $relativePath = 'receipts/appointment-'.$appointment->id.'.pdf';
        $absolutePath = storage_path('app/private/'.$relativePath);
        File::ensureDirectoryExists(dirname($absolutePath));

        Pdf::loadView('pdf.appointment-payment-receipt', [
            'appointment' => $appointment,
        ])->setPaper('a4')->save($absolutePath);

        $appointment->update(['receipt_path' => $relativePath]);
    }

    public function temporaryReceiptUrl(Appointment $appointment): string
    {
        return URL::temporarySignedRoute(
            'receipt.download',
            now()->addDays(7),
            ['appointment' => $appointment->id]
        );
    }

    public function receiptAbsolutePath(Appointment $appointment): string
    {
        return storage_path('app/private/'.$appointment->receipt_path);
    }

    private function api(): Api
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Razorpay is not configured. Add the Razorpay credentials to the backend environment.');
        }

        return new Api(
            (string) config('services.razorpay.key_id'),
            (string) config('services.razorpay.key_secret')
        );
    }
}
