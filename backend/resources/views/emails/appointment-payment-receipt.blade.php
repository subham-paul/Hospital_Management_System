<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Appointment confirmed</title>
</head>
<body style="margin:0;padding:0;background:#eef4f5;font-family:Arial,Helvetica,sans-serif;color:#173141;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4f5;padding:32px 14px;">
    <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dce7e9;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(16,42,58,.08);">
            <tr>
                <td style="padding:28px 34px;background:#102a3a;color:#ffffff;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                            <td>
                                <div style="font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#91ddd5;font-weight:700;">Hospital Management System</div>
                                <div style="margin-top:8px;font-size:25px;line-height:1.25;font-weight:700;">Appointment confirmed</div>
                            </td>
                            <td align="right" valign="top"><span style="display:inline-block;padding:8px 12px;border-radius:999px;background:#0d9488;font-size:12px;font-weight:700;">PAID</span></td>
                        </tr>
                    </table>
                </td>
            </tr>
            <tr>
                <td style="padding:32px 34px;">
                    <p style="margin:0 0 9px;font-size:18px;font-weight:700;">Hello {{ $appointment->patient->name }},</p>
                    <p style="margin:0 0 25px;color:#607782;font-size:14px;line-height:1.7;">Your payment was received and your consultation has been confirmed. Keep this email or the attached PDF receipt for your records.</p>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #dce7e9;border-radius:12px;background:#f8fbfb;">
                        <tr>
                            <td style="padding:19px 20px;border-bottom:1px solid #dce7e9;">
                                <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#69808b;font-weight:700;">Appointment</div>
                                <div style="margin-top:7px;font-size:17px;font-weight:700;">Dr. {{ $appointment->doctor->user->name }}</div>
                                <div style="margin-top:4px;color:#69808b;font-size:13px;">{{ $appointment->doctor->specialization }}</div>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:19px 20px;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td width="50%" valign="top">
                                            <div style="font-size:11px;text-transform:uppercase;color:#69808b;font-weight:700;">Date &amp; time</div>
                                            <div style="margin-top:6px;font-size:14px;font-weight:700;">{{ $appointment->appointment_date->format('d M Y') }} at {{ \Carbon\Carbon::createFromFormat('H:i:s', $appointment->appointment_time)->format('h:i A') }}</div>
                                        </td>
                                        <td width="50%" valign="top">
                                            <div style="font-size:11px;text-transform:uppercase;color:#69808b;font-weight:700;">Receipt number</div>
                                            <div style="margin-top:6px;font-size:14px;font-weight:700;">APT-{{ str_pad((string) $appointment->id, 8, '0', STR_PAD_LEFT) }}</div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;border:1px solid #dce7e9;border-radius:12px;">
                        <tr><td style="padding:14px 18px;color:#69808b;font-size:13px;border-bottom:1px solid #e7eef0;">Consultation fee</td><td align="right" style="padding:14px 18px;font-size:14px;font-weight:700;border-bottom:1px solid #e7eef0;">₹{{ number_format((float) $appointment->payment_amount, 2) }}</td></tr>
                        <tr><td style="padding:14px 18px;color:#69808b;font-size:13px;border-bottom:1px solid #e7eef0;">Payment ID</td><td align="right" style="padding:14px 18px;font-size:12px;font-weight:700;border-bottom:1px solid #e7eef0;">{{ $appointment->razorpay_payment_id }}</td></tr>
                        <tr><td style="padding:16px 18px;font-size:14px;font-weight:700;">Total paid</td><td align="right" style="padding:16px 18px;color:#0f766e;font-size:20px;font-weight:700;">₹{{ number_format((float) $appointment->payment_amount, 2) }}</td></tr>
                    </table>

                    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:26px;"><tr><td style="border-radius:9px;background:#0d9488;"><a href="{{ $downloadUrl }}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Download PDF receipt</a></td></tr></table>
                    <p style="margin:16px 0 0;color:#82959d;font-size:11px;line-height:1.6;">The secure download link is valid for 7 days. A PDF copy is also attached to this email.</p>
                </td>
            </tr>
            <tr><td style="padding:20px 34px;background:#f8fbfb;border-top:1px solid #dce7e9;color:#82959d;font-size:11px;line-height:1.6;">Please arrive a few minutes before your appointment. If you need help, contact the hospital and quote your receipt number.</td></tr>
        </table>
    </td></tr>
</table>
</body>
</html>
