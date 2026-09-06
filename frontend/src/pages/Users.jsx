import { useState } from 'react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';

const EMPTY = { name: '', email: '', password: '', role: 'receptionist', phone: '', is_active: true };
const ROLES = ['admin', 'doctor', 'receptionist', 'patient'];

export default function Users() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const { rows, page, setPage, lastPage, reload } = useList('/users', { search, role });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const open = (u) => {
    setError('');
    setEditing(u ?? 'new');
    setForm(u ? { ...EMPTY, ...u, password: '' } : EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing === 'new') await client.post('/users', form);
      else await client.put(`/users/${editing.id}`, form);
      setEditing(null);
      reload();
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors ? Object.values(errors).flat().join(' ') : 'Save failed.');
    }
  };

  const remove = async (u) => {
    if (!confirm(`Delete user ${u.name}?`)) return;
    try {
      await client.delete(`/users/${u.id}`);
      reload();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <div className="page-head">
        <h2>User Management</h2>
        <button className="btn" onClick={() => open(null)}>+ Add User</button>
      </div>
      <div className="toolbar">
        <input placeholder="Search name / email…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="table-wrapper">
      <table>
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Active</th><th></th></tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td><td>{u.email}</td>
              <td><span className="badge confirmed">{u.role}</span></td>
              <td>{u.is_active ? 'Yes' : 'No'}</td>
              <td>
                <button className="btn secondary small" onClick={() => open(u)}>Edit</button>{' '}
                {u.id !== me.id && (
                  <button className="btn danger small" onClick={() => remove(u)}>Delete</button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="muted">No users.</td></tr>}
        </tbody>
      </table>
      </div>
      <Pagination page={page} lastPage={lastPage} setPage={setPage} />

      {editing && (
        <Modal title={editing === 'new' ? 'Add User' : 'Edit User'} onClose={() => setEditing(null)}>
          <form onSubmit={save}>
            <div className="form-grid">
              <div><label>Name *</label><input value={form.name} required onChange={set('name')} /></div>
              <div><label>Email *</label><input type="email" value={form.email} required onChange={set('email')} /></div>
              <div><label>{editing === 'new' ? 'Password *' : 'New password (optional)'}</label>
                <input type="password" value={form.password} minLength={8}
                  required={editing === 'new'} onChange={set('password')} /></div>
              <div><label>Role *</label>
                <select value={form.role} onChange={set('role')}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select></div>
              <div><label>Phone</label><input value={form.phone || ''} onChange={set('phone')} /></div>
              <div><label>Status</label>
                <select value={form.is_active ? '1' : '0'}
                  onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })}>
                  <option value="1">Active</option>
                  <option value="0">Disabled</option>
                </select></div>
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
