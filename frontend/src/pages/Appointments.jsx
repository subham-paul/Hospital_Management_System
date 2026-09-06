import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Download, IndianRupee, ShieldCheck } from 'lucide-react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';
import { formatTime, formatTimeRange } from '../utils/dateTime';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatCurrency = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
}).format(Number(amount || 0));

const loadRazorpay = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve();
    return;
  }

  const existing = document.querySelector('script[data-razorpay-checkout]');
  if (existing) {
    existing.addEventListener('load', resolve, { once: true });
    existing.addEventListener('error', () => reject(new Error('Unable to load secure checkout.')), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.dataset.razorpayCheckout = 'true';
  script.onload = resolve;
  script.onerror = () => reject(new Error('Unable to load secure checkout.'));
  document.body.appendChild(script);
});

const toLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toLocalTime = (date) => (
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
);

const isPastAppointment = (date, time) => {
  if (!date || !time) return false;
  return new Date(`${date}T${time}:00`).getTime() <= Date.now();
};

const slotForDate = (doctor, date) => {
  if (!doctor || !date) return null;
  const day = new Date(`${date}T12:00:00`).getDay();
  return (doctor.availabilities || []).find((slot) => (
    slot.day_of_week === day && slot.is_available
  )) || null;
};

export default function Appointments() {
  const { user } = useAuth();
  const canBook = ['admin', 'receptionist', 'patient'].includes(user.role);
  const isStaff = ['admin', 'receptionist'].includes(user.role);
  const [status, setStatus] = useState('');
  const { rows, page, setPage, lastPage, reload } = useList('/appointments', { status });

  const [booking, setBooking] = useState(false);
  const [form, setForm] = useState({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', reason: '' });
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [clock, setClock] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    client.get('/doctors', { params: { per_page: 100 } }).then(({ data }) => setDoctors(data.data ?? []));
    if (isStaff) {
      client.get('/patients', { params: { per_page: 100 } }).then(({ data }) => setPatients(data.data ?? []));
    }
  }, [isStaff]);

  useEffect(() => {
    if (!booking) return undefined;
    setClock(Date.now());
    const timer = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, [booking]);

  const today = toLocalDate(new Date(clock));
  const nextMinute = new Date(clock);
  nextMinute.setSeconds(0, 0);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1);
  const minimumDate = toLocalDate(nextMinute);
  const earliestTime = toLocalTime(nextMinute);
  const selectedDoctor = doctors.find((doctor) => String(doctor.id) === String(form.doctor_id));
  const availableSlots = (selectedDoctor?.availabilities || [])
    .filter((slot) => slot.is_available)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  const availabilityLimitsFor = (date) => {
    const slot = slotForDate(selectedDoctor, date);
    if (!slot) return null;
    const scheduleStart = slot.start_time.slice(0, 5);
    const scheduleEnd = slot.end_time.slice(0, 5);
    const minimumTime = date === minimumDate && earliestTime > scheduleStart ? earliestTime : scheduleStart;
    return { slot, minimumTime, maximumTime: scheduleEnd };
  };

  const selectedLimits = availabilityLimitsFor(form.appointment_date);
  const selectedSlotIsInvalid = Boolean(form.appointment_date && form.appointment_time && (
    isPastAppointment(form.appointment_date, form.appointment_time)
    || !selectedLimits
    || form.appointment_time < selectedLimits.minimumTime
    || form.appointment_time >= selectedLimits.maximumTime
  ));
  const selectedDayHasTime = Boolean(selectedLimits && selectedLimits.minimumTime < selectedLimits.maximumTime);

  const book = async (e) => {
    e.preventDefault();
    setError('');
    const limits = availabilityLimitsFor(form.appointment_date);
    if (!limits) {
      setError('This doctor is not available on the selected day. Please choose one of the listed available days.');
      return;
    }
    if (limits.minimumTime >= limits.maximumTime) {
      setError('No appointment times remain for this doctor today. Please choose another available date.');
      return;
    }
    if (isPastAppointment(form.appointment_date, form.appointment_time)
      || form.appointment_time < limits.minimumTime || form.appointment_time >= limits.maximumTime) {
      setError(`Choose a time from ${formatTime(limits.minimumTime)} and before ${formatTime(limits.maximumTime)}.`);
      return;
    }
    let reservedAppointmentId = null;
    setSubmitting(true);
    try {
      const payload = user.role === 'patient'
        ? {
            doctor_id: form.doctor_id,
            appointment_date: form.appointment_date,
            appointment_time: form.appointment_time,
            reason: form.reason,
          }
        : form;

      if (user.role !== 'patient') {
        await client.post('/appointments', payload);
        setBooking(false);
        setForm({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', reason: '' });
        reload();
        return;
      }

      const { data: order } = await client.post('/appointment-payments/order', payload);
      reservedAppointmentId = order.appointment_id;
      await loadRazorpay();

      let verificationStarted = false;
      const checkout = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.order_id,
        prefill: order.prefill,
        theme: { color: '#0d9488' },
        modal: {
          confirm_close: true,
          ondismiss: async () => {
            setCheckoutOpen(false);
            if (!verificationStarted) {
              try { await client.post(`/appointment-payments/${order.appointment_id}/cancel`); } catch { /* reservation expires automatically */ }
            }
          },
        },
        handler: async (response) => {
          verificationStarted = true;
          setSubmitting(true);
          setError('');
          try {
            const { data } = await client.post(`/appointment-payments/${order.appointment_id}/verify`, response);
            setPaymentResult(data);
            setCheckoutOpen(false);
            reload();
          } catch (err) {
            setError(err.response?.data?.message
              || Object.values(err.response?.data?.errors || {}).flat().join(' ')
              || 'Payment was received but verification is still pending. Please contact the hospital with your payment ID.');
            setCheckoutOpen(false);
          } finally {
            setSubmitting(false);
          }
        },
      });

      checkout.on('payment.failed', (response) => {
        setError(response.error?.description || 'Payment failed. You can retry securely in the Razorpay window.');
      });
      setCheckoutOpen(true);
      checkout.open();
    } catch (err) {
      if (reservedAppointmentId) {
        try { await client.post(`/appointment-payments/${reservedAppointmentId}/cancel`); } catch { /* reservation expires automatically */ }
      }
      setError(err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(' ')
        || err.message
        || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const setStatusOf = async (a, newStatus) => {
    try {
      await client.put(`/appointments/${a.id}`, { status: newStatus });
      reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed.');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const setDoctor = (e) => {
    setForm({ ...form, doctor_id: e.target.value, appointment_date: '', appointment_time: '' });
    setError('');
  };

  const closeBooking = () => {
    if (submitting || checkoutOpen) return;
    setBooking(false);
    setPaymentResult(null);
    setError('');
    setForm({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', reason: '' });
  };

  const openBooking = () => {
    setClock(Date.now());
    setError('');
    setPaymentResult(null);
    setBooking(true);
  };

  const paymentLabel = (appointment) => {
    const labels = {
      paid: 'Paid',
      pending: 'Awaiting payment',
      failed: 'Failed',
      expired: 'Expired',
      cancelled: 'Cancelled',
      refund_pending: 'Refund pending',
      refunded: 'Refunded',
      not_required: 'Pay at hospital',
    };
    return labels[appointment.payment_status] || '—';
  };

  const setAppointmentDate = (e) => {
    const appointmentDate = e.target.value;
    const limits = availabilityLimitsFor(appointmentDate);
    const invalidTime = form.appointment_time && (!limits
      || form.appointment_time < limits.minimumTime || form.appointment_time >= limits.maximumTime);
    setForm({
      ...form,
      appointment_date: appointmentDate,
      appointment_time: invalidTime ? '' : form.appointment_time,
    });
    if (!limits) {
      const day = new Date(`${appointmentDate}T12:00:00`).getDay();
      setError(`${selectedDoctor?.user?.name || 'This doctor'} is not available on ${DAY_NAMES[day]}. Choose an available day.`);
    } else if (limits.minimumTime >= limits.maximumTime) {
      setError('No appointment times remain today. Please choose another available date.');
    } else {
      setError('');
    }
  };

  const setAppointmentTime = (e) => {
    const appointmentTime = e.target.value;
    const limits = availabilityLimitsFor(form.appointment_date);
    setForm({ ...form, appointment_time: appointmentTime });
    if (!limits) {
      setError('Choose one of the doctor’s available days first.');
    } else if (appointmentTime < limits.minimumTime || appointmentTime >= limits.maximumTime) {
      setError(`Choose a time from ${formatTime(limits.minimumTime)} and before ${formatTime(limits.maximumTime)}.`);
    } else {
      setError('');
    }
  };

  const actionsFor = (a) => {
    if (user.role === 'patient') {
      return a.status === 'pending' || a.status === 'confirmed'
        ? <button className="btn danger small" onClick={() => setStatusOf(a, 'cancelled')}>Cancel</button> : null;
    }
    return (
      <>
        {a.status === 'pending' && (
          <button className="btn small" onClick={() => setStatusOf(a, 'confirmed')}>Confirm</button>
        )}{' '}
        {['pending', 'confirmed'].includes(a.status) && (
          <>
            <button className="btn secondary small" onClick={() => setStatusOf(a, 'completed')}>Complete</button>{' '}
            <button className="btn danger small" onClick={() => setStatusOf(a, 'cancelled')}>Cancel</button>
          </>
        )}
      </>
    );
  };

  return (
    <>
      <div className="page-head">
        <h2>Appointments</h2>
        {canBook && <button className="btn" onClick={openBooking}>+ Book Appointment</button>}
      </div>
      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="table-wrapper">
      <table>
        <thead>
          <tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Reason</th><th>Status</th><th>Payment</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>{a.appointment_date?.slice(0, 10)}</td>
              <td><span className="appointment-time">{formatTime(a.appointment_time)}</span></td>
              <td>{a.patient?.name}</td>
              <td>{a.doctor?.user?.name}</td>
              <td className="muted">{a.reason || '—'}</td>
              <td><span className={`badge ${a.status}`}>{a.status}</span></td>
              <td>
                <span className={`badge ${a.payment_status === 'not_required' ? 'confirmed' : a.payment_status}`}>
                  {paymentLabel(a)}
                </span>
                {a.razorpay_payment_id && <small className="payment-id-inline">{a.razorpay_payment_id}</small>}
              </td>
              <td>{actionsFor(a)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="muted">No appointments.</td></tr>}
        </tbody>
      </table>
      </div>
      <Pagination page={page} lastPage={lastPage} setPage={setPage} />

      {booking && (
        <Modal title={paymentResult ? 'Appointment confirmed' : 'Book Appointment'} onClose={closeBooking}>
          {paymentResult ? (
            <div className="payment-success">
              <div className="payment-success-icon"><CheckCircle2 size={31} /></div>
              <span className="payment-success-kicker">Payment successful</span>
              <h3>Your appointment is confirmed</h3>
              <p>{paymentResult.email_sent
                ? 'A professional receipt and PDF copy have been sent to your email.'
                : 'Your payment is confirmed. You can download the PDF receipt below.'}</p>

              <div className="payment-result-card">
                <div><span>Doctor</span><strong>{paymentResult.appointment?.doctor?.user?.name}</strong></div>
                <div><span>Appointment</span><strong>{paymentResult.appointment?.appointment_date?.slice(0, 10)} · {formatTime(paymentResult.appointment?.appointment_time)}</strong></div>
                <div><span>Amount paid</span><strong>{formatCurrency(paymentResult.payment?.amount, paymentResult.payment?.currency)}</strong></div>
                <div><span>Payment ID</span><strong className="transaction-id">{paymentResult.payment?.payment_id}</strong></div>
              </div>

              <div className="payment-success-actions">
                {paymentResult.receipt_url && (
                  <a className="btn secondary" href={paymentResult.receipt_url} target="_blank" rel="noreferrer">
                    <Download size={16} /> Download PDF
                  </a>
                )}
                <button type="button" className="btn" onClick={closeBooking}>Done</button>
              </div>
            </div>
          ) : <form onSubmit={book}>
            <div className="form-grid">
              {isStaff && (
                <div className="full"><label>Patient *</label>
                  <select value={form.patient_id} required onChange={set('patient_id')}>
                    <option value="">Select patient…</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select></div>
              )}
              <div className="full"><label>Doctor *</label>
                <select value={form.doctor_id} required onChange={setDoctor}>
                  <option value="">Select doctor…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.user?.name} — {d.specialization}</option>
                  ))}
                </select></div>
              {selectedDoctor && (
                <div className="full booking-schedule">
                  <div className="booking-schedule-head"><strong>Available days & times</strong><span>{selectedDoctor.user?.name}</span></div>
                  {availableSlots.length > 0 ? (
                    <div className="schedule-chips">
                      {availableSlots.map((slot) => (
                        <span className="schedule-chip" key={slot.day_of_week}>
                          <strong>{DAY_SHORT[slot.day_of_week]}</strong>
                          <small>{formatTimeRange(slot.start_time, slot.end_time)}</small>
                        </span>
                      ))}
                    </div>
                  ) : <p className="schedule-empty">No appointment schedule has been configured for this doctor.</p>}
                </div>
              )}
              {user.role === 'patient' && selectedDoctor && (
                <div className="full payment-summary">
                  <div className="payment-summary-icon"><IndianRupee size={20} /></div>
                  <div className="payment-summary-copy">
                    <span>Payable consultation fee</span>
                    <strong>{formatCurrency(selectedDoctor.consultation_fee)}</strong>
                    <small>Appointment confirmation follows successful payment.</small>
                  </div>
                  <div className="secure-payment"><ShieldCheck size={15} /><span>Secured by Razorpay</span></div>
                </div>
              )}
              <div><label>Date *</label><input type="date" value={form.appointment_date} min={minimumDate}
                disabled={!selectedDoctor || availableSlots.length === 0} required onChange={setAppointmentDate} /></div>
              <div><label>Time *</label><input type="time" value={form.appointment_time}
                min={selectedLimits?.minimumTime} max={selectedLimits?.maximumTime}
                disabled={!selectedDayHasTime} required onChange={setAppointmentTime} />
                {selectedLimits && selectedDayHasTime && (
                  <small className="field-hint">
                    {form.appointment_date === today ? 'Today' : 'This day'}: appointments can start from {formatTime(selectedLimits.minimumTime)} and before {formatTime(selectedLimits.maximumTime)}.
                  </small>
                )}
              </div>
              <div className="full"><label>Reason</label><input value={form.reason} onChange={set('reason')} /></div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn secondary" disabled={submitting || checkoutOpen} onClick={closeBooking}>Cancel</button>
              <button className="btn" disabled={submitting || checkoutOpen || selectedSlotIsInvalid
                || (selectedDoctor && availableSlots.length === 0)
                || (user.role === 'patient' && Number(selectedDoctor?.consultation_fee || 0) < 1)}>
                {user.role === 'patient' ? <><CreditCard size={16} /> {checkoutOpen ? 'Payment open' : submitting ? 'Preparing payment…' : `Pay ${formatCurrency(selectedDoctor?.consultation_fee)} & book`}</> : submitting ? 'Booking…' : 'Book'}
              </button>
            </div>
          </form>}
        </Modal>
      )}
    </>
  );
}
