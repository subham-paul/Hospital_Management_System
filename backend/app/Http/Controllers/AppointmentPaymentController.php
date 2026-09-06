<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Doctor;
use App\Services\AppointmentAvailability;
use App\Services\RazorpayAppointmentPayment;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use JsonException;
use Throwable;

class AppointmentPaymentController extends Controller
{
    public function __construct(
        private readonly AppointmentAvailability $availability,
        private readonly RazorpayAppointmentPayment $payments,
    ) {
    }

    public function createOrder(Request $request)
    {
        $user = $request->user();
        if (! $user->patient) {
            return response()->json(['message' => 'Patient profile not found.'], 422);
        }
        if (! $this->payments->isConfigured()) {
            return response()->json(['message' => 'Online payment is not configured yet. Please contact the administrator.'], 503);
        }

        $data = $request->validate([
            'doctor_id' => ['required', 'exists:doctors,id'],
            'appointment_date' => [
                'required',
                'date',
                'after_or_equal:'.Carbon::now(AppointmentAvailability::BOOKING_TIMEZONE)->toDateString(),
            ],
            'appointment_time' => ['required', 'date_format:H:i'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $doctor = Doctor::with('user')->findOrFail($data['doctor_id']);
        if ((float) $doctor->consultation_fee < 1) {
            return response()->json(['message' => 'This doctor does not have a valid consultation fee. Please contact the administrator.'], 422);
        }

        $appointment = DB::transaction(function () use ($data, $user, $doctor) {
            Doctor::lockForUpdate()->findOrFail($doctor->id);
            $error = $this->availability->check($doctor->id, $data['appointment_date'], $data['appointment_time']);
            if ($error) {
                throw ValidationException::withMessages(['appointment_time' => $error]);
            }

            return Appointment::create([
                ...$data,
                'patient_id' => $user->patient->id,
                'status' => 'pending',
                'payment_status' => 'pending',
                'payment_amount' => $doctor->consultation_fee,
                'payment_currency' => 'INR',
                'payment_gateway' => 'razorpay',
                'payment_expires_at' => now()->addMinutes(15),
                'created_by' => $user->id,
            ]);
        });

        try {
            $order = $this->payments->createOrder($appointment);
            $appointment->update(['razorpay_order_id' => $order['id']]);
        } catch (Throwable $exception) {
            $appointment->update(['status' => 'cancelled', 'payment_status' => 'failed']);
            Log::error('Unable to create Razorpay appointment order.', [
                'appointment_id' => $appointment->id,
                'exception' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'Unable to start payment right now. Please try again.'], 502);
        }

        $patient = $user->patient;

        return response()->json([
            'appointment_id' => $appointment->id,
            'key' => config('services.razorpay.key_id'),
            'order_id' => $order['id'],
            'amount' => $order['amount'],
            'currency' => $order['currency'],
            'name' => config('app.name', 'Hospital Management System'),
            'description' => 'Consultation with '.$doctor->user->name,
            'prefill' => [
                'name' => $patient->name,
                'email' => $patient->email ?: $user->email,
                'contact' => $patient->phone ?: $user->phone,
            ],
            'expires_at' => $appointment->payment_expires_at?->toIso8601String(),
        ], 201);
    }

    public function verify(Request $request, Appointment $appointment)
    {
        $this->authorizePatient($request, $appointment);
        $data = $request->validate([
            'razorpay_payment_id' => ['required', 'string', 'max:255'],
            'razorpay_order_id' => ['required', 'string', 'max:255'],
            'razorpay_signature' => ['required', 'string', 'max:255'],
        ]);

        if ($data['razorpay_order_id'] !== $appointment->razorpay_order_id) {
            throw ValidationException::withMessages(['payment' => 'The payment order does not match this appointment.']);
        }

        $result = $this->payments->verifyCheckout(
            $appointment,
            $data['razorpay_payment_id'],
            $data['razorpay_signature'],
        );

        return response()->json([
            'message' => 'Payment successful. Your appointment is confirmed.',
            ...$this->paymentResponse($result),
        ]);
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        $this->authorizePatient($request, $appointment);

        if (in_array($appointment->payment_status, ['paid', 'refund_pending', 'refunded'], true)) {
            return response()->json(['message' => 'This payment can no longer be cancelled from checkout.'], 422);
        }

        $appointment->update(['status' => 'cancelled', 'payment_status' => 'cancelled']);

        return response()->json(['message' => 'Payment session cancelled.']);
    }

    public function webhook(Request $request)
    {
        $secret = (string) config('services.razorpay.webhook_secret');
        if ($secret === '') {
            return response()->json(['message' => 'Webhook is not configured.'], 503);
        }

        $body = $request->getContent();
        $receivedSignature = (string) $request->header('X-Razorpay-Signature');
        $expectedSignature = hash_hmac('sha256', $body, $secret);

        if ($receivedSignature === '' || ! hash_equals($expectedSignature, $receivedSignature)) {
            return response()->json(['message' => 'Invalid webhook signature.'], 401);
        }

        try {
            $event = json_decode($body, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return response()->json(['message' => 'Invalid webhook payload.'], 400);
        }

        if (($event['event'] ?? null) !== 'payment.captured') {
            return response()->json(['message' => 'Event acknowledged.']);
        }

        $payment = $event['payload']['payment']['entity'] ?? [];
        $appointment = Appointment::where('razorpay_order_id', $payment['order_id'] ?? '')->first();
        if (! $appointment) {
            return response()->json(['message' => 'Order not found; event acknowledged.']);
        }

        try {
            $this->payments->completeFromWebhook($appointment, $payment);
        } catch (ValidationException $exception) {
            Log::warning('Razorpay webhook payment could not confirm the reserved slot.', [
                'appointment_id' => $appointment->id,
                'exception' => $exception->getMessage(),
            ]);

            // The service has already recorded/refunded a slot conflict; acknowledge to avoid retries.
            return response()->json(['message' => 'Payment handled with an appointment exception.']);
        } catch (Throwable $exception) {
            Log::error('Razorpay webhook payment finalization failed.', [
                'appointment_id' => $appointment->id,
                'exception' => $exception->getMessage(),
            ]);

            return response()->json(['message' => 'Unable to finalize payment.'], 500);
        }

        return response()->json(['message' => 'Payment finalized.']);
    }

    public function downloadReceipt(Appointment $appointment)
    {
        abort_unless($appointment->payment_status === 'paid' && $appointment->receipt_path, 404);
        $path = $this->payments->receiptAbsolutePath($appointment);
        abort_unless(File::exists($path), 404);

        return response()->download($path, 'appointment-receipt-'.$appointment->id.'.pdf', [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function authorizePatient(Request $request, Appointment $appointment): void
    {
        abort_unless($appointment->patient_id === $request->user()->patient?->id, 403);
    }

    private function paymentResponse(array $result): array
    {
        $appointment = $result['appointment']->load(['patient:id,code,name', 'doctor.user:id,name']);

        return [
            'appointment' => $appointment,
            'payment' => [
                'status' => $appointment->payment_status,
                'amount' => $appointment->payment_amount,
                'currency' => $appointment->payment_currency,
                'payment_id' => $appointment->razorpay_payment_id,
                'order_id' => $appointment->razorpay_order_id,
                'paid_at' => $appointment->paid_at,
            ],
            'receipt_url' => $result['receipt_url'],
            'email_sent' => $result['email_sent'],
        ];
    }
}
