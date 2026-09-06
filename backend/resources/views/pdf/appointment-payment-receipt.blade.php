<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Appointment receipt</title>
    <style>
        @page { margin: 28px; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #173141; font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        .header { padding: 25px 28px; border-radius: 12px 12px 0 0; color: #fff; background: #102a3a; }
        .brand { color: #73d5cb; font-size: 10px; font-weight: bold; letter-spacing: 1.4px; text-transform: uppercase; }
        h1 { margin: 8px 0 0; font-size: 25px; }
        .status { float: right; margin-top: -38px; padding: 7px 12px; border-radius: 14px; background: #0d9488; font-weight: bold; }
        .body { padding: 28px; border: 1px solid #dce7e9; border-top: 0; }
        .receipt-meta { width: 100%; margin-bottom: 25px; }
        .receipt-meta td { vertical-align: top; }
        .right { text-align: right; }
        .label { margin-bottom: 5px; color: #69808b; font-size: 9px; font-weight: bold; letter-spacing: .8px; text-transform: uppercase; }
        .value { font-size: 13px; font-weight: bold; }
        .appointment { padding: 18px; border: 1px solid #dce7e9; border-radius: 9px; background: #f7fbfb; }
        .doctor { margin: 5px 0 2px; font-size: 17px; font-weight: bold; }
        .muted { color: #69808b; }
        .details { width: 100%; margin-top: 20px; border-collapse: collapse; }
        .details td { padding: 12px 4px; border-bottom: 1px solid #e2eaec; }
        .details .amount { text-align: right; font-weight: bold; }
        .total td { padding-top: 17px; border: 0; font-size: 15px; font-weight: bold; }
        .total .amount { color: #0f766e; font-size: 21px; }
        .footer { margin-top: 26px; padding-top: 14px; border-top: 1px solid #dce7e9; color: #69808b; font-size: 10px; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">Hospital Management System</div>
        <h1>Payment receipt</h1>
        <div class="status">PAID</div>
    </div>
    <div class="body">
        <table class="receipt-meta">
            <tr>
                <td><div class="label">Billed to</div><div class="value">{{ $appointment->patient->name }}</div><div class="muted">{{ $appointment->patient->email ?: $appointment->patient->user?->email }}</div></td>
                <td class="right"><div class="label">Receipt number</div><div class="value">APT-{{ str_pad((string) $appointment->id, 8, '0', STR_PAD_LEFT) }}</div><div class="muted">Paid {{ $appointment->paid_at?->format('d M Y, h:i A') }}</div></td>
            </tr>
        </table>

        <div class="appointment">
            <div class="label">Confirmed appointment</div>
            <div class="doctor">Dr. {{ $appointment->doctor->user->name }}</div>
            <div class="muted">{{ $appointment->doctor->specialization }}</div>
            <div style="margin-top:13px;font-weight:bold;">{{ $appointment->appointment_date->format('l, d M Y') }} · {{ \Carbon\Carbon::createFromFormat('H:i:s', $appointment->appointment_time)->format('h:i A') }}</div>
        </div>

        <table class="details">
            <tr><td class="muted">Consultation fee</td><td class="amount">INR {{ number_format((float) $appointment->payment_amount, 2) }}</td></tr>
            <tr><td class="muted">Payment gateway</td><td class="amount">Razorpay</td></tr>
            <tr><td class="muted">Payment ID</td><td class="amount">{{ $appointment->razorpay_payment_id }}</td></tr>
            <tr class="total"><td>Total paid</td><td class="amount">INR {{ number_format((float) $appointment->payment_amount, 2) }}</td></tr>
        </table>

        <div class="footer">This is a computer-generated receipt and does not require a signature. Keep this document for your records and quote the receipt or payment ID if you contact the hospital.</div>
    </div>
</body>
</html>
