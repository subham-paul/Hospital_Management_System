import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BedDouble,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileHeart,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const navItem = (to, label, icon) => ({ to, label, icon });

const NAV = {
  admin: [
    navItem('/', 'Overview', LayoutDashboard),
    navItem('/patients', 'Patients', Users),
    navItem('/doctors', 'Doctors', Stethoscope),
    navItem('/appointments', 'Appointments', CalendarDays),
    navItem('/admissions', 'Admissions', BedDouble),
    navItem('/medical-records', 'Medical Records', FileHeart),
    navItem('/prescriptions', 'Prescriptions', Pill),
    navItem('/billing', 'Billing', CreditCard),
    navItem('/users', 'User Management', UserCog),
  ],
  doctor: [
    navItem('/', 'Overview', LayoutDashboard),
    navItem('/appointments', 'My Appointments', CalendarDays),
    navItem('/patients', 'Patients', Users),
    navItem('/medical-records', 'Medical Records', FileHeart),
    navItem('/prescriptions', 'Prescriptions', Pill),
    navItem('/availability', 'My Availability', ClipboardList),
  ],
  receptionist: [
    navItem('/', 'Overview', LayoutDashboard),
    navItem('/patients', 'Patients', Users),
    navItem('/appointments', 'Appointments', CalendarDays),
    navItem('/admissions', 'Admissions', BedDouble),
    navItem('/billing', 'Billing', CreditCard),
    navItem('/doctors', 'Doctors', Stethoscope),
  ],
  patient: [
    navItem('/', 'Overview', LayoutDashboard),
    navItem('/appointments', 'My Appointments', CalendarDays),
    navItem('/doctors', 'Find a Doctor', Stethoscope),
    navItem('/medical-records', 'My Records', FileHeart),
    navItem('/prescriptions', 'My Prescriptions', Pill),
    navItem('/billing', 'My Bills', CreditCard),
  ],
};

const initials = (name = '') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join('')
  .toUpperCase();

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = NAV[user.role] || [];

  const activeItem = useMemo(() => (
    items.find((item) => item.to === location.pathname) || items[0]
  ), [items, location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark"><HeartPulse size={23} strokeWidth={2.25} /></span>
          <span className="brand-copy">
            <strong>HMS</strong>
            <small>Care Operations</small>
          </span>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav>
          <span className="nav-label">Workspace</span>
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon className="nav-icon" size={19} strokeWidth={1.9} />
              <span>{label}</span>
              <ChevronRight className="nav-arrow" size={15} />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="secure-icon"><ShieldCheck size={18} /></span>
          <span><strong>Secure workspace</strong><small>Protected hospital access</small></span>
        </div>
      </aside>

      {sidebarOpen && (
        <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />
      )}

      <div className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
              <Menu size={22} />
            </button>
            <div className="route-context">
              <span>Hospital workspace</span>
              <strong>{activeItem?.label || 'Overview'}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <ThemeToggle />
            <div className="system-status" title="Workspace status">
              <span className="status-dot" />
              <span>System ready</span>
            </div>
            <div className="user-chip">
              <span className="avatar">{initials(user.name)}</span>
              <span className="user-copy">
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </div>
            <button className="logout-button" onClick={handleLogout} aria-label="Sign out">
              <LogOut size={18} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
