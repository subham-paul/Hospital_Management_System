import { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

const LABELS = {
  patients: 'Total Patients', doctors: 'Doctors', users: 'System Users',
  appointments_today: 'Appointments Today', current_admissions: 'Current Admissions',
  revenue_total: 'Revenue Collected', revenue_outstanding: 'Outstanding Dues',
  appointments_pending: 'Pending Appointments', my_patients: 'My Patients',
  records_written: 'Records Written', prescriptions_written: 'Prescriptions Written',
  pending_appointments: 'Pending Appointments', unpaid_bills: 'Unpaid Bills',
  medical_records: 'Medical Records', prescriptions: 'Prescriptions',
  bills_due: 'Amount Due', is_admitted: 'Currently Admitted',
};

const money = (v) => `₹${Number(v).toLocaleString()}`;

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    client.get('/dashboard/stats').then(({ data }) => setStats(data));
  }, []);

  if (!stats) return <p className="muted">Loading dashboard…</p>;

  const scalarStats = Object.entries(stats).filter(([, v]) => typeof v !== 'object');
  const schedule = stats.todays_schedule || stats.todays_appointments || stats.recent_appointments
    || stats.upcoming_appointments || [];

  return (
    <>
      <div className="page-head"><h2>Welcome, {user.name}</h2></div>
      <div className="stats-grid">
        {scalarStats.map(([key, value]) => (
          <div className="stat-card" key={key}>
            <div className="value">
              {key.startsWith('revenue') || key === 'bills_due' ? money(value)
                : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
            </div>
            <div className="label">{LABELS[key] || key}</div>
          </div>
        ))}
      </div>
      {schedule.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>
            {user.role === 'patient' ? 'Upcoming Appointments' : "Today's / Recent Appointments"}
          </h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr>
            </thead>
            <tbody>
              {schedule.map((a) => (
                <tr key={a.id}>
                  <td>{a.appointment_date?.slice(0, 10)}</td>
                  <td>{a.appointment_time?.slice(0, 5)}</td>
                  <td>{a.patient?.name || '—'}</td>
                  <td>{a.doctor?.user?.name || '—'}</td>
                  <td><span className={`badge ${a.status}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
