import { useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';

const EMPTY = {
  name: '', dob: '', gender: '', blood_group: '', phone: '', email: '',
  address: '', emergency_contact_name: '', emergency_contact_phone: '',
};

export default function Patients() {
  const { user } = useAuth();
  const canEdit = ['admin', 'receptionist'].includes(user.role);
  const [search, setSearch] = useState('');
  const { rows, page, setPage, lastPage, reload } = useList('/patients', { search });
  const [editing, setEditing] = useState(null); // null | 'new' | patient
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const open = (p) => {
    setError('');
    setEditing(p ?? 'new');
    setForm(p ? { ...EMPTY, ...p, dob: p.dob?.slice(0, 10) ?? '' } : EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing === 'new') await client.post('/patients', form);
      else await client.put(`/patients/${editing.id}`, form);
      setEditing(null);
      reload();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors ? Object.values(errors).flat().join(' ') : 'Save failed.');
    }
  };

  const remove = async (p) => {
    if (!confirm(`Delete patient ${p.name}?`)) return;
    await client.delete(`/patients/${p.id}`);
    reload();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="page-head">
        <h2>Patients</h2>
        {canEdit && <button className="btn" onClick={() => open(null)}>+ Add Patient</button>}
      </div>
      <div className="toolbar">
        <input placeholder="Search name / code / phone…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <table>
        <thead>
          <tr><th>Code</th><th>Name</th><th>Gender</th><th>Blood</th><th>Phone</th>{canEdit && <th></th>}</tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>{p.code}</td><td>{p.name}</td><td>{p.gender || '—'}</td>
              <td>{p.blood_group || '—'}</td><td>{p.phone || '—'}</td>
              {canEdit && (
                <td>
                  <button className="btn secondary small" onClick={() => open(p)}>Edit</button>{' '}
                  <button className="btn danger small" onClick={() => remove(p)}>Delete</button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="muted">No patients found.</td></tr>}
        </tbody>
      </table>
      <Pagination page={page} lastPage={lastPage} setPage={setPage} />

      {editing && (
        <Modal title={editing === 'new' ? 'Add Patient' : 'Edit Patient'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="form-grid">
              <div className="full"><label>Name *</label><input value={form.name} required onChange={set('name')} /></div>
              <div><label>Date of birth</label><input type="date" value={form.dob} onChange={set('dob')} /></div>
              <div><label>Gender</label>
                <select value={form.gender || ''} onChange={set('gender')}>
                  <option value="">—</option><option value="male">Male</option>
                  <option value="female">Female</option><option value="other">Other</option>
                </select></div>
              <div><label>Blood group</label><input value={form.blood_group || ''} onChange={set('blood_group')} /></div>
              <div><label>Phone</label><input value={form.phone || ''} onChange={set('phone')} /></div>
              <div className="full"><label>Email</label><input type="email" value={form.email || ''} onChange={set('email')} /></div>
              <div className="full"><label>Address</label><textarea rows={2} value={form.address || ''} onChange={set('address')} /></div>
              <div><label>Emergency contact</label><input value={form.emergency_contact_name || ''} onChange={set('emergency_contact_name')} /></div>
              <div><label>Emergency phone</label><input value={form.emergency_contact_phone || ''} onChange={set('emergency_contact_phone')} /></div>
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
