import { useEffect, useState } from 'react';
import client from '../api/client';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Availability() {
  const [doctorId, setDoctorId] = useState(null);
  const [slots, setSlots] = useState(
    DAYS.map((_, i) => ({ day_of_week: i, start_time: '09:00', end_time: '17:00', is_available: false }))
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/auth/me').then(({ data }) => {
      const doctor = data.doctor;
      if (!doctor) return;
      setDoctorId(doctor.id);
      client.get(`/doctors/${doctor.id}`).then(({ data: d }) => {
        setSlots(DAYS.map((_, i) => {
          const existing = (d.availabilities || []).find((a) => a.day_of_week === i);
          return existing
            ? { day_of_week: i, start_time: existing.start_time.slice(0, 5),
                end_time: existing.end_time.slice(0, 5), is_available: !!existing.is_available }
            : { day_of_week: i, start_time: '09:00', end_time: '17:00', is_available: false };
        }));
      });
    });
  }, []);

  const setSlot = (i, k, v) => setSlots(slots.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)));

  const save = async () => {
    setMessage('');
    setError('');
    try {
      await client.put(`/doctors/${doctorId}/availability`, {
        availabilities: slots.filter((s) => s.is_available),
      });
      setMessage('Availability saved.');
    } catch (err) {
      setError(err.response?.data?.message
        || Object.values(err.response?.data?.errors || {}).flat().join(' ') || 'Save failed.');
    }
  };

  return (
    <>
      <div className="page-head">
        <h2>My Availability</h2>
        <button className="btn" onClick={save} disabled={!doctorId}>Save</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Day</th><th>Available</th><th>From</th><th>To</th></tr></thead>
          <tbody>
            {slots.map((s, i) => (
              <tr key={s.day_of_week}>
                <td>{DAYS[s.day_of_week]}</td>
                <td>
                  <input type="checkbox" style={{ width: 'auto' }} checked={s.is_available}
                    onChange={(e) => setSlot(i, 'is_available', e.target.checked)} />
                </td>
                <td><input type="time" value={s.start_time} disabled={!s.is_available}
                  onChange={(e) => setSlot(i, 'start_time', e.target.value)} /></td>
                <td><input type="time" value={s.end_time} disabled={!s.is_available}
                  onChange={(e) => setSlot(i, 'end_time', e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {message && <p style={{ color: 'var(--success)', marginTop: 10 }}>{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>
    </>
  );
}
