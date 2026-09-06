import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import client from '../api/client';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import useList from '../components/useList';
import { useAuth } from '../context/AuthContext';

import { useEffect, useRef } from 'react';

// Debounce hook for search
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = useRef(null);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeoutRef.current);
  }, [value, delay]);

  return debouncedValue;
};
const EMPTY = {
  name: '', email: '', password: '', phone: '', specialization: '',
  qualification: '', license_no: '', consultation_fee: '', bio: '',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const emptySchedule = () => DAY_NAMES.map((_, day) => ({
  day_of_week: day,
  start_time: '09:00',
  end_time: '17:00',
  is_available: false,
}));

export default function Doctors() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500); // 500ms debounce
  const { rows, page, setPage, lastPage, reload } = useList('/doctors', { search: debouncedSearch });
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [scheduling, setScheduling] = useState(null);
  const [schedule, setSchedule] = useState(emptySchedule);
  const [scheduleError, setScheduleError] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);

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

  const openSchedule = (doctor) => {
    setScheduleError('');
    setScheduling(doctor);
    setSchedule(DAY_NAMES.map((_, day) => {
      const existing = (doctor.availabilities || []).find((slot) => slot.day_of_week === day);
      return existing ? {
        day_of_week: day,
        start_time: existing.start_time.slice(0, 5),
        end_time: existing.end_time.slice(0, 5),
        is_available: Boolean(existing.is_available),
      } : {
        day_of_week: day,
        start_time: '09:00',
        end_time: '17:00',
        is_available: false,
      };
    }));
  };

  const setScheduleSlot = (index, key, value) => {
    setSchedule(schedule.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, [key]: value } : slot
    )));
    setScheduleError('');
  };

  const saveSchedule = async (e) => {
    e.preventDefault();
    setScheduleError('');
    const invalidSlot = schedule.find((slot) => slot.is_available && slot.start_time >= slot.end_time);
    if (invalidSlot) {
      setScheduleError(`${DAY_NAMES[invalidSlot.day_of_week]}'s end time must be later than its start time.`);
      return;
    }

    setSavingSchedule(true);
    try {
      await client.put(`/doctors/${scheduling.id}/availability`, {
        availabilities: schedule.filter((slot) => slot.is_available),
      });
      setScheduling(null);
      reload();
    } catch (err) {
      setScheduleError(err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(' ') || 'Schedule could not be saved.');
    } finally {
      setSavingSchedule(false);
    }
  };

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
      <div className="table-wrapper">
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
                <td className="table-actions">
                  <button className="btn secondary small" onClick={() => openSchedule(d)}>
                    <CalendarClock size={14} /> Schedule
                  </button>{' '}
                  <button className="btn secondary small" onClick={() => open(d)}>Edit</button>{' '}
                  <button className="btn danger small" onClick={() => remove(d)}>Delete</button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="muted">No doctors found.</td></tr>}
        </tbody>
      </table>
      </div>
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
              <div><label>License no. *</label><input value={form.license_no || ''} required
                placeholder="Enter medical license number" onChange={set('license_no')} /></div>
              <div><label>Consultation fee *</label>
                <input type="number" min="1" step="0.01" value={form.consultation_fee || ''} required
                  placeholder="Enter consultation fee" onChange={set('consultation_fee')} /></div>
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

      {scheduling && (
        <Modal title={`Set Availability — ${scheduling.user?.name}`} onClose={() => setScheduling(null)}>
          <form onSubmit={saveSchedule}>
            <div className="availability-intro">
              <span className="availability-icon"><CalendarClock size={20} /></span>
              <div><strong>Weekly appointment schedule</strong><p>Select each working day and define when patients may book.</p></div>
            </div>
            <div className="availability-editor">
              {schedule.map((slot, index) => (
                <div className={`availability-row ${slot.is_available ? 'enabled' : ''}`} key={slot.day_of_week}>
                  <label className="availability-toggle">
                    <input type="checkbox" checked={slot.is_available}
                      onChange={(e) => setScheduleSlot(index, 'is_available', e.target.checked)} />
                    <span className="toggle-track"><span /></span>
                    <span className="availability-day"><strong>{DAY_NAMES[slot.day_of_week]}</strong><small>{slot.is_available ? 'Available' : 'Unavailable'}</small></span>
                  </label>
                  <div className="availability-times">
                    <label><span>From</span><input type="time" value={slot.start_time} disabled={!slot.is_available}
                      onChange={(e) => setScheduleSlot(index, 'start_time', e.target.value)} /></label>
                    <label><span>To</span><input type="time" value={slot.end_time} disabled={!slot.is_available}
                      onChange={(e) => setScheduleSlot(index, 'end_time', e.target.value)} /></label>
                  </div>
                </div>
              ))}
            </div>
            {scheduleError && <p className="error">{scheduleError}</p>}
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setScheduling(null)}>Cancel</button>
              <button className="btn" disabled={savingSchedule}>{savingSchedule ? 'Saving…' : 'Save schedule'}</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
