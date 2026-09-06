import { useEffect, useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';

const EMPTY_ITEM = { medicine_name: '', dosage: '', frequency: '', duration: '' };
const EMPTY = { patient_id: '', prescribed_date: '', notes: '', items: [{ ...EMPTY_ITEM }] };

export default function Prescriptions() {
  const { user } = useAuth();
  const canEdit = ['admin', 'doctor'].includes(user.role);
  const { rows, page, setPage, lastPage, reload } = useList('/prescriptions');
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [patients, setPatients] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!canEdit) return;
    client.get('/patients', { params: { per_page: 100 } }).then(({ data }) => setPatients(data.data ?? []));
  }, [canEdit]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await client.post('/prescriptions', form);
      setAdding(false);
      setForm({ ...EMPTY, items: [{ ...EMPTY_ITEM }] });
      reload();
    } catch (err) {
      setError(err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(' ') || 'Save failed.');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setItem = (i, k) => (e) => {
    const items = form.items.map((it, idx) => (idx === i ? { ...it, [k]: e.target.value } : it));
    setForm({ ...form, items });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  return (
    <>
      <div className="page-head">
        <h2>Prescriptions</h2>
        {canEdit && <button className="btn" onClick={() => { setError(''); setAdding(true); }}>+ New Prescription</button>}
      </div>
      <div className="table-wrapper">
      <table>
        <thead>
          <tr><th>Date</th><th>Patient</th><th>Doctor</th><th>Medicines</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{p.prescribed_date?.slice(0, 10)}</td>
              <td>{p.patient?.name}</td>
              <td>{p.doctor?.user?.name}</td>
              <td className="muted">{(p.items || []).map((i) => i.medicine_name).join(', ')}</td>
              <td><button className="btn secondary small" onClick={() => setViewing(p)}>View</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="muted">No prescriptions.</td></tr>}
        </tbody>
      </table>
      </div>
      <Pagination page={page} lastPage={lastPage} setPage={setPage} />

      {viewing && (
        <Modal title={`Prescription — ${viewing.patient?.name}`} onClose={() => setViewing(null)}>
          <p className="muted" style={{ marginBottom: 10 }}>
            {viewing.prescribed_date?.slice(0, 10)} · Dr. {viewing.doctor?.user?.name}
          </p>
          <table>
            <thead><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
            <tbody>
              {(viewing.items || []).map((i) => (
                <tr key={i.id}>
                  <td>{i.medicine_name}</td><td>{i.dosage || '—'}</td>
                  <td>{i.frequency || '—'}</td><td>{i.duration || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {viewing.notes && <p style={{ marginTop: 10 }}>{viewing.notes}</p>}
          <div className="form-actions">
            <button className="btn secondary" onClick={() => setViewing(null)}>Close</button>
          </div>
        </Modal>
      )}

      {adding && (
        <Modal title="New Prescription" onClose={() => setAdding(false)}>
          <form onSubmit={save}>
            <div className="form-grid">
              <div><label>Patient *</label>
                <select value={form.patient_id} required onChange={set('patient_id')}>
                  <option value="">Select patient…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select></div>
              <div><label>Date *</label>
                <input type="date" value={form.prescribed_date} required onChange={set('prescribed_date')} /></div>
              <div className="full">
                <label>Medicines *</label>
                <div className="items-editor">
                  {form.items.map((item, i) => (
                    <div className="item-row" key={i}>
                      <input placeholder="Medicine" value={item.medicine_name} required onChange={setItem(i, 'medicine_name')} />
                      <input placeholder="Dosage" value={item.dosage} onChange={setItem(i, 'dosage')} />
                      <input placeholder="Frequency" value={item.frequency} onChange={setItem(i, 'frequency')} />
                      <input placeholder="Duration" value={item.duration} onChange={setItem(i, 'duration')} />
                      <button type="button" className="btn danger small" disabled={form.items.length === 1}
                        onClick={() => removeItem(i)}>×</button>
                    </div>
                  ))}
                  <button type="button" className="btn secondary small" onClick={addItem}>+ Add medicine</button>
                </div>
              </div>
              <div className="full"><label>Notes</label><textarea rows={2} value={form.notes} onChange={set('notes')} /></div>
            </div>
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setAdding(false)}>Cancel</button>
              <button className="btn">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
