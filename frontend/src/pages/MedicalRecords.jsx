import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';

const EMPTY = { patient_id: '', doctor_id: '', record_date: '', symptoms: '', diagnosis: '', treatment: '', notes: '' };

export default function MedicalRecords() {
  const { user } = useAuth();
  const canEdit = ['admin', 'doctor'].includes(user.role);
  const { rows, page, setPage, lastPage, reload } = useList('/medical-records');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canEdit) return;
    client.get('/patients', { params: { per_page: 100 } }).then(({ data }) => setPatients(data.data ?? []));
  }, [canEdit]);

  // Fetch appointments when patient is selected to auto-populate doctor and date
  useEffect(() => {
    if (!form.patient_id || editing !== 'new') return;
    client.get(`/appointments`, { params: { patient_id: form.patient_id, per_page: 100 } })
      .then(({ data }) => {
        const appts = data.data ?? [];
        setAppointments(appts);
        // Get the most recent appointment
        const lastAppt = appts[0];
        if (lastAppt) {
          setForm((prevForm) => ({
            ...prevForm,
            doctor_id: lastAppt.doctor_id || '',
            record_date: lastAppt.appointment_date?.slice(0, 10) || '',
          }));
        }
      })
      .catch(() => {
        setAppointments([]);
      });
  }, [form.patient_id, editing]);

  const open = (r) => {
    setError('');
    setEditing(r ?? 'new');
    setForm(r ? { ...EMPTY, ...r, record_date: r.record_date?.slice(0, 10) ?? '' } : EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing === 'new') await client.post('/medical-records', form);
      else await client.put(`/medical-records/${editing.id}`, form);
      setEditing(null);
      reload();
    } catch (err) {
      setError(err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(' ') || 'Save failed.');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="page-head">
        <h2>Medical Records</h2>
        {canEdit && <button className="btn" onClick={() => open(null)}>+ New Record</button>}
      </div>
      <div className="table-wrapper">
      <table>
        <thead>
          <tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Diagnosis</th>{canEdit && <th></th>}</tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.record_date?.slice(0, 10)}</td>
              <td>{r.patient?.name}</td>
              <td>{r.doctor?.user?.name}</td>
              <td>{r.diagnosis}</td>
              {canEdit && (
                <td><button className="btn secondary small" onClick={() => open(r)}>Edit</button></td>
              )}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="muted">No records.</td></tr>}
        </tbody>
      </table>
      </div>
      <Pagination page={page} lastPage={lastPage} setPage={setPage} />

      {editing && (
        <Modal title={editing === 'new' ? 'New Medical Record' : 'Edit Medical Record'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="form-grid">
              {editing === 'new' && (
                <>
                  <div className="full"><label>Patient *</label>
                    <select value={form.patient_id} required onChange={set('patient_id')}>
                      <option value="">Select patient…</option>
                      {patients.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                    </select></div>
                  {form.patient_id && (
                    <>
                      <div className="full"><label>Doctor (Auto-filled from appointment)</label>
                        <input type="text" value={appointments.find(a => a.doctor_id === form.doctor_id)?.doctor?.user?.name || 'Loading...'} readOnly className="input-readonly" /></div>
                    </>
                  )}
                </>
              )}
              <div className="full"><label>Record date (Auto-filled from appointment) *</label>
                <input type="date" value={form.record_date} required onChange={set('record_date')} className={editing === 'new' ? 'input-auto-filled' : ''} /></div>
              <div className="full"><label>Symptoms</label><textarea rows={2} value={form.symptoms || ''} onChange={set('symptoms')} /></div>
              <div className="full"><label>Diagnosis *</label><textarea rows={2} value={form.diagnosis} required onChange={set('diagnosis')} /></div>
              <div className="full"><label>Treatment</label><textarea rows={2} value={form.treatment || ''} onChange={set('treatment')} /></div>
              <div className="full"><label>Notes</label><textarea rows={2} value={form.notes || ''} onChange={set('notes')} /></div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
