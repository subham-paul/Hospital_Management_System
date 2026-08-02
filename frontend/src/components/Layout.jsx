import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = {
  admin: [
    ['/', 'Dashboard'], ['/patients', 'Patients'], ['/doctors', 'Doctors'],
    ['/appointments', 'Appointments'], ['/admissions', 'Admissions'],
    ['/medical-records', 'Medical Records'], ['/prescriptions', 'Prescriptions'],
    ['/billing', 'Billing'], ['/users', 'User Management'],
  ],
  doctor: [
    ['/', 'Dashboard'], ['/appointments', 'My Appointments'], ['/patients', 'Patients'],
    ['/medical-records', 'Medical Records'], ['/prescriptions', 'Prescriptions'],
    ['/availability', 'My Availability'],
  ],
  receptionist: [
    ['/', 'Dashboard'], ['/patients', 'Patients'], ['/appointments', 'Appointments'],
    ['/admissions', 'Admissions'], ['/billing', 'Billing'], ['/doctors', 'Doctors'],
  ],
  patient: [
    ['/', 'Dashboard'], ['/appointments', 'My Appointments'], ['/doctors', 'Find a Doctor'],
    ['/medical-records', 'My Records'], ['/prescriptions', 'My Prescriptions'], ['/billing', 'My Bills'],
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <h1>HMS</h1>
        <nav>
          {(NAV[user.role] || []).map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => (isActive ? 'active' : '')}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <strong>{user.name}</strong>
            <span className="role-badge">{user.role}</span>
          </div>
          <button className="btn secondary" onClick={handleLogout}>Logout</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
