import { useEffect, useState } from 'react';
import {
  Activity,
  BedDouble,
  CalendarCheck2,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  IndianRupee,
  Clock3,
  CreditCard,
  FileHeart,
  Pill,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatTime } from '../utils/dateTime';

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

const METRIC_ICONS = {
  patients: Users,
  my_patients: Users,
  doctors: Stethoscope,
  users: UserCog,
  appointments_today: CalendarCheck2,
  appointments_pending: Clock3,
  pending_appointments: Clock3,
  current_admissions: BedDouble,
  revenue_total: IndianRupee,
  revenue_outstanding: CreditCard,
  unpaid_bills: CreditCard,
  bills_due: CreditCard,
  records_written: FileHeart,
  medical_records: FileHeart,
  prescriptions_written: Pill,
  prescriptions: Pill,
  is_admitted: BedDouble,
};

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#0ea5a4',
  completed: '#22a06b',
  cancelled: '#e35d6a',
  admitted: '#4f7cff',
  discharged: '#7c69d5',
  unknown: '#94a3b8',
};

const chartColors = ['#0ea5a4', '#4f7cff', '#7c69d5', '#f59e0b', '#22a06b', '#e35d6a'];
const money = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

const metricValue = (key, value) => {
  if (key.startsWith('revenue') || key === 'bills_due') return money(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-IN') : value;
};

function BarChart({ values }) {
  const max = Math.max(...values.map(([, value]) => Number(value)), 1);
  const chartWidth = 640;
  const chartHeight = 220;
  const slotWidth = (chartWidth - 56) / Math.max(values.length, 1);
  const barWidth = Math.min(58, slotWidth * 0.55);

  return (
    <svg className="chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Operational metrics bar chart">
      {[45, 90, 135, 180].map((y) => (
        <line key={y} x1="24" y1={y} x2="624" y2={y} className="chart-grid-line" />
      ))}
      {values.map(([key, value], index) => {
        const height = Math.max((Number(value) / max) * 130, 5);
        const x = 28 + index * slotWidth + (slotWidth - barWidth) / 2;
        return (
          <g key={key}>
            <rect className="chart-bar-track" x={x} y="42" width={barWidth} height="138" rx="7" />
            <rect x={x} y={180 - height} width={barWidth} height={height} rx="7" fill={chartColors[index % chartColors.length]} />
            <text x={x + barWidth / 2} y={171 - height} textAnchor="middle" className="chart-value">
              {Number(value).toLocaleString('en-IN')}
            </text>
            <text x={x + barWidth / 2} y="204" textAnchor="middle" className="chart-label">
              {(LABELS[key] || key).replace('Appointments ', 'Appts ').slice(0, 14)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function StatusChart({ schedule }) {
  const counts = schedule.reduce((result, appointment) => {
    const status = appointment.status || 'unknown';
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});
  const entries = Object.entries(counts);
  const total = schedule.length;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="status-chart">
      <svg className="pie-svg" viewBox="0 0 140 140" role="img" aria-label="Appointment status chart">
        <circle cx="70" cy="70" r={radius} className="pie-track" />
        {entries.map(([status, count]) => {
          const length = total ? (count / total) * circumference : 0;
          const segment = (
            <circle key={status} cx="70" cy="70" r={radius} className="pie-segment"
              stroke={STATUS_COLORS[status] || STATUS_COLORS.unknown}
              strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} />
          );
          offset += length;
          return segment;
        })}
        <text x="70" y="67" textAnchor="middle" className="pie-total">{total}</text>
        <text x="70" y="83" textAnchor="middle" className="pie-caption">appointments</text>
      </svg>
      <div className="chart-legend">
        {entries.map(([status, count]) => (
          <div className="legend-item" key={status}>
            <span className="legend-dot" style={{ background: STATUS_COLORS[status] || STATUS_COLORS.unknown }} />
            <span>{status.replace('_', ' ')}</span><strong>{count}</strong>
          </div>
        ))}
        {entries.length === 0 && <span className="legend-empty">No appointments in this view yet.</span>}
      </div>
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="dashboard-loading" aria-label="Loading dashboard">
      <div className="skeleton skeleton-title" />
      <div className="stats-grid">
        {[1, 2, 3, 4].map((item) => <div className="skeleton skeleton-stat" key={item} />)}
      </div>
      <div className="skeleton skeleton-panel" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setError('Dashboard information could not be loaded. Please refresh to try again.'));
  }, []);

  if (error) {
    return <div className="empty-state"><Activity size={24} /><h2>Unable to load overview</h2><p>{error}</p></div>;
  }
  if (!stats) return <DashboardLoading />;

  const scalarStats = Object.entries(stats).filter(([, value]) => typeof value !== 'object');
  const countStats = scalarStats.filter(([key, value]) => (
    typeof value === 'number' && value >= 0 && !key.startsWith('revenue') && key !== 'bills_due'
  ));
  const chartStats = (countStats.length ? countStats : scalarStats.filter(([, value]) => typeof value === 'number'))
    .slice(0, 6);
  const schedule = stats.todays_schedule || stats.todays_appointments || stats.recent_appointments
    || stats.upcoming_appointments || [];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <div className="page-head dashboard-head">
        <div>
          <span className="page-eyebrow">Clinical overview</span>
          <h2>{greeting}, {user.name?.split(' ')[0]}</h2>
          <p className="page-description">A clear view of today’s hospital activity and priorities.</p>
        </div>
        <div className="date-chip"><CalendarDays size={17} /><span>{today}</span></div>
      </div>

      <div className="stats-grid">
        {scalarStats.map(([key, value], index) => {
          const Icon = METRIC_ICONS[key] || Activity;
          return (
            <article className={`stat-card tone-${index % 4}`} key={key}>
              <div className="stat-card-top">
                <span className="metric-icon"><Icon size={20} strokeWidth={1.9} /></span>
                <span className="metric-context">Current</span>
              </div>
              <div className="value">{metricValue(key, value)}</div>
              <div className="label">{LABELS[key] || key.replaceAll('_', ' ')}</div>
            </article>
          );
        })}
      </div>

      <div className="chart-grid">
        <section className="chart-panel">
          <div className="chart-head">
            <div><span className="panel-icon"><ChartNoAxesColumnIncreasing size={18} /></span><span><h3>Operational activity</h3><p>Key count-based metrics</p></span></div>
            <span className="muted">At a glance</span>
          </div>
          {chartStats.length > 0 ? <BarChart values={chartStats} /> : <p className="panel-empty">No metric data yet.</p>}
        </section>
        <section className="chart-panel">
          <div className="chart-head">
            <div><span className="panel-icon violet"><CalendarCheck2 size={18} /></span><span><h3>Appointment status</h3><p>Current schedule mix</p></span></div>
            <span className="muted">Live view</span>
          </div>
          <StatusChart schedule={schedule} />
        </section>
      </div>

      {schedule.length > 0 && (
        <section className="card schedule-card">
          <div className="section-head">
            <div><h3>{user.role === 'patient' ? 'Upcoming appointments' : 'Today’s schedule'}</h3><p>Review the latest appointment activity.</p></div>
            <span className="record-count">{schedule.length} {schedule.length === 1 ? 'appointment' : 'appointments'}</span>
          </div>
          <div className="table-wrapper embedded-table">
            <table>
              <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
              <tbody>
                {schedule.map((appointment) => (
                  <tr key={appointment.id}>
                    <td>{appointment.appointment_date?.slice(0, 10)}</td>
                    <td><span className="appointment-time">{formatTime(appointment.appointment_time)}</span></td>
                    <td><strong className="table-primary">{appointment.patient?.name || '—'}</strong></td>
                    <td>{appointment.doctor?.user?.name || '—'}</td>
                    <td><span className={`badge ${appointment.status}`}>{appointment.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
