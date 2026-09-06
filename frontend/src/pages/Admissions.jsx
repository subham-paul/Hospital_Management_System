import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';

const EMPTY = { patient_id: '', doctor_id: '', ward: '', bed_no: '', diagnosis: '', admitted_at: '', notes: '' };

export default function Admissions() {
  const { user } = useAuth();
  const canEdit = ['admin', 'receptionist'].includes(user.role);
  const [status, setStatus] = useState('');
  const { rows, page, setPage, lastPage, reload } = useList('/admissions', { status });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canEdit) return;
    client.get('/patients', { params: { per_page: 100 } }).then(({ data }) => setPatients(data.data ?? []));
    client.get('/doctors', { params: { per_page: 100 } }).then(({ data }) => setDoctors(data.data ?? []));
  }, [canEdit]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/admissions', form);
      setAdding(false);
      setForm(EMPTY);
      reload();
    } catch (err) {
      setError(err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(' ') || 'Save failed.');
    }
  };

  const discharge = async (a) => {
    if (!confirm(`Discharge ${a.patient?.name}?`)) return;
    await client.post(`/admissions/${a.id}/discharge`, {});
    reload();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="page-head">
        <h2>Admissions</h2>
        {canEdit && <button className="btn" onClick={() => { setError(''); setAdding(true); }}>+ Admit Patient</button>}
      </div>
      <div className="toolbar">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All</option>
          <option value="admitted">Admitted</option>
          <option value="discharged">Discharged</option>
        </select>
      </div>
      <div className="table-wrapper">
      <table>
        <thead>
          <tr><th>Patient</th><th>Doctor</th><th>Ward / Bed</th><th>Admitted</th><th>Discharged</th><th>Status</th>{canEdit && <th></th>}</tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>{a.patient?.name}</td>
              <td>{a.doctor?.user?.name}</td>
              <td>{a.ward} / {a.bed_no}</td>
              <td>{a.admitted_at?.slice(0, 10)}</td>
              <td>{a.discharged_at?.slice(0, 10) || '—'}</td>
              <td><span className={`badge ${a.status}`}>{a.status}</span></td>
              {canEdit && (
                <td>{a.status === 'admitted' && (
                  <button className="btn small" onClick={() => discharge(a)}>Discharge</button>
                )}</td>
              )}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="muted">No admissions.</td></tr>}
        </tbody>
      </table>
      </div>
      <Pagination page={page} lastPage={lastPage} setPage={setPage} />

      {adding && (
        <Modal title="Admit Patient" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <div className="form-grid">
              <div className="full"><label>Patient *</label>
                <select value={form.patient_id} required onChange={set('patient_id')}>
                  <option value="">Select patient…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select></div>
              <div className="full"><label>Attending doctor *</label>
                <select value={form.doctor_id} required onChange={set('doctor_id')}>
                  <option value="">Select doctor…</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.user?.name} — {d.specialization}</option>)}
                </select></div>
              <div><label>Ward *</label><input value={form.ward} required onChange={set('ward')} /></div>
              <div><label>Bed no. *</label><input value={form.bed_no} required onChange={set('bed_no')} /></div>
              <div className="full"><label>Admission date/time *</label>
                <input type="datetime-local" value={form.admitted_at} required onChange={set('admitted_at')} /></div>
              <div className="full"><label>Diagnosis</label><textarea rows={2} value={form.diagnosis} onChange={set('diagnosis')} /></div>
              <div className="full"><label>Notes</label><textarea rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn">Admit</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
