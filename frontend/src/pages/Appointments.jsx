import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';

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

  useEffect(() => {
    client.get('/doctors', { params: { per_page: 100 } }).then(({ data }) => setDoctors(data.data ?? []));
    if (isStaff) {
      client.get('/patients', { params: { per_page: 100 } }).then(({ data }) => setPatients(data.data ?? []));
    }
  }, [isStaff]);

  const book = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = user.role === 'patient'
        ? {
            doctor_id: form.doctor_id,
            appointment_date: form.appointment_date,
            appointment_time: form.appointment_time,
            reason: form.reason,
          }
        : form;

      await client.post('/appointments', payload);
      setBooking(false);
      setForm({ patient_id: '', doctor_id: '', appointment_date: '', appointment_time: '', reason: '' });
      reload();
    } catch (err) {
      setError(err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(' ') || 'Booking failed.');
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
        {canBook && <button className="btn" onClick={() => { setError(''); setBooking(true); }}>+ Book Appointment</button>}
      </div>
      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {['pending', 'confirmed', 'completed', 'cancelled'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <table>
        <thead>
          <tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Reason</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>{a.appointment_date?.slice(0, 10)}</td>
              <td>{a.appointment_time?.slice(0, 5)}</td>
              <td>{a.patient?.name}</td>
              <td>{a.doctor?.user?.name}</td>
              <td className="muted">{a.reason || '—'}</td>
              <td><span className={`badge ${a.status}`}>{a.status}</span></td>
              <td>{actionsFor(a)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="muted">No appointments.</td></tr>}
        </tbody>
      </table>
      <Pagination page={page} lastPage={lastPage} setPage={setPage} />

      {booking && (
        <Modal title="Book Appointment" onClose={() => setBooking(false)}>
          <form onSubmit={book}>
            <div className="form-grid">
              {isStaff && (
                <div className="full"><label>Patient *</label>
                  <select value={form.patient_id} required onChange={set('patient_id')}>
                    <option value="">Select patient…</option>
                    {patients.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select></div>
              )}
              <div className="full"><label>Doctor *</label>
                <select value={form.doctor_id} required onChange={set('doctor_id')}>
                  <option value="">Select doctor…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.user?.name} — {d.specialization}</option>
                  ))}
                </select></div>
              <div><label>Date *</label><input type="date" value={form.appointment_date} required onChange={set('appointment_date')} /></div>
              <div><label>Time *</label><input type="time" value={form.appointment_time} required onChange={set('appointment_time')} /></div>
              <div className="full"><label>Reason</label><input value={form.reason} onChange={set('reason')} /></div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setBooking(false)}>Cancel</button>
              <button className="btn">Book</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
