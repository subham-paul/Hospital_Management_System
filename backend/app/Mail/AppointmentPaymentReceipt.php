<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AppointmentPaymentReceipt extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Appointment $appointment,
        public string $downloadUrl,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Appointment confirmed · Receipt #APT-'.str_pad((string) $this->appointment->id, 8, '0', STR_PAD_LEFT),
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.appointment-payment-receipt');
    }

    public function attachments(): array
    {
        $path = storage_path('app/private/'.$this->appointment->receipt_path);

        return [
            Attachment::fromPath($path)
                ->as('appointment-receipt-'.$this->appointment->id.'.pdf')
                ->withMime('application/pdf'),
        ];
    }
}
