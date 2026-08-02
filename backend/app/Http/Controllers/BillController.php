<?php

namespace App\Http\Controllers;

use App\Models\Bill;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return Bill::with(['patient:id,code,name', 'items'])
            ->when($user->role === User::ROLE_PATIENT, fn ($q) => $q->where('patient_id', $user->patient->id))
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('patient_id'), fn ($q, $id) => $q->where('patient_id', $id))
            ->latest('billed_at')
            ->paginate($request->integer('per_page', 15));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => ['required', 'exists:patients,id'],
            'admission_id' => ['nullable', 'exists:admissions,id'],
            'appointment_id' => ['nullable', 'exists:appointments,id'],
            'tax' => ['nullable', 'numeric', 'min:0'],
            'discount' => ['nullable', 'numeric', 'min:0'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.description' => ['required', 'string', 'max:255'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0'],
        ]);

        $bill = DB::transaction(function () use ($data) {
            $subtotal = collect($data['items'])
                ->sum(fn ($i) => $i['quantity'] * $i['unit_price']);
            $tax = $data['tax'] ?? 0;
            $discount = $data['discount'] ?? 0;

            $bill = Bill::create([
                'bill_no' => Bill::nextBillNo(),
                'patient_id' => $data['patient_id'],
                'admission_id' => $data['admission_id'] ?? null,
                'appointment_id' => $data['appointment_id'] ?? null,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total' => max(0, $subtotal + $tax - $discount),
                'billed_at' => now(),
            ]);

            $bill->items()->createMany(collect($data['items'])->map(fn ($i) => [
                ...$i,
                'amount' => $i['quantity'] * $i['unit_price'],
            ])->all());

            return $bill;
        });

        return response()->json($bill->load(['patient:id,code,name', 'items']), 201);
    }

    public function show(Request $request, Bill $bill)
    {
        $user = $request->user();
        if ($user->role === User::ROLE_PATIENT && $bill->patient_id !== $user->patient?->id) {
            abort(403);
        }

        return $bill->load(['patient', 'items', 'admission', 'appointment']);
    }

    /** Record a payment against the bill. */
    public function pay(Request $request, Bill $bill)
    {
        if (in_array($bill->status, ['paid', 'cancelled'], true)) {
            return response()->json(['message' => "Bill is already {$bill->status}."], 422);
        }

        $due = $bill->total - $bill->paid_amount;

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01', "max:{$due}"],
            'payment_method' => ['required', 'string', 'max:50'],
        ]);

        $paid = $bill->paid_amount + $data['amount'];

        $bill->update([
            'paid_amount' => $paid,
            'payment_method' => $data['payment_method'],
            'status' => $paid >= (float) $bill->total ? 'paid' : 'partially_paid',
        ]);

        return $bill->load(['patient:id,code,name', 'items']);
    }

    public function cancel(Bill $bill)
    {
        if ($bill->status === 'paid') {
            return response()->json(['message' => 'A paid bill cannot be cancelled.'], 422);
        }

        $bill->update(['status' => 'cancelled']);

        return $bill;
    }

    public function destroy(Bill $bill)
    {
        $bill->delete();

        return response()->json(['message' => 'Bill deleted.']);
    }
}
