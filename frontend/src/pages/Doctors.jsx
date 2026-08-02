import { useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';

const EMPTY = {
  name: '', email: '', password: '', phone: '', specialization: '',
  qualification: '', license_no: '', consultation_fee: '', bio: '',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Doctors() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [search, setSearch] = useState('');
  const { rows, page, setPage, lastPage, reload } = useList('/doctors', { search });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const open = (d) => {
    setError('');
    setEditing(d ?? 'new');
    setForm(d ? {
      ...EMPTY, ...d, name: d.user?.name ?? '', email: d.user?.email ?? '',
      phone: d.user?.phone ?? '', password: '',
    } : EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing === 'new') await client.post('/doctors', form);
      else await client.put(`/doctors/${editing.id}`, form);
      setEditing(null);
      reload();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors ? Object.values(errors).flat().join(' ') : 'Save failed.');
    }
  };

  const remove = async (d) => {
    if (!confirm(`Delete Dr. ${d.user?.name}?`)) return;
    await client.delete(`/doctors/${d.id}`);
    reload();
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const availabilityText = (d) => {
    const days = (d.availabilities || []).filter((a) => a.is_available)
      .map((a) => DAYS[a.day_of_week]);
    return days.length ? days.join(', ') : '—';
  };

  return (
    <>
      <div className="page-head">
        <h2>Doctors</h2>
        {isAdmin && <button className="btn" onClick={() => open(null)}>+ Add Doctor</button>}
      </div>
      <div className="toolbar">
        <input placeholder="Search name / specialization…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <table>
        <thead>
          <tr><th>Name</th><th>Specialization</th><th>Fee</th><th>Available Days</th>{isAdmin && <th></th>}</tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td>{d.user?.name}</td><td>{d.specialization}</td>
              <td>₹{Number(d.consultation_fee).toLocaleString()}</td>
              <td className="muted">{availabilityText(d)}</td>
              {isAdmin && (
                <td>
                  <button className="btn secondary small" onClick={() => open(d)}>Edit</button>{' '}
                  <button className="btn danger small" onClick={() => remove(d)}>Delete</button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="muted">No doctors found.</td></tr>}
        </tbody>
      </table>
      <Pagination page={page} lastPage={lastPage} setPage={setPage} />

      {editing && (
        <Modal title={editing === 'new' ? 'Add Doctor' : 'Edit Doctor'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="form-grid">
              <div><label>Name *</label><input value={form.name} required onChange={set('name')} /></div>
              <div><label>Email *</label><input type="email" value={form.email} required onChange={set('email')} /></div>
              {editing === 'new' && (
                <div><label>Password *</label>
                  <input type="password" value={form.password} required minLength={8} onChange={set('password')} /></div>
              )}
              <div><label>Phone</label><input value={form.phone || ''} onChange={set('phone')} /></div>
              <div><label>Specialization *</label><input value={form.specialization} required onChange={set('specialization')} /></div>
              <div><label>Qualification</label><input value={form.qualification || ''} onChange={set('qualification')} /></div>
              <div><label>License no.</label><input value={form.license_no || ''} onChange={set('license_no')} /></div>
              <div><label>Consultation fee</label>
                <input type="number" min="0" value={form.consultation_fee || ''} onChange={set('consultation_fee')} /></div>
              <div className="full"><label>Bio</label><textarea rows={2} value={form.bio || ''} onChange={set('bio')} /></div>
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
