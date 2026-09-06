import { Activity, HeartPulse, ShieldCheck, Sparkles } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <section className="auth-brand-panel">
        <div className="auth-brand">
          <span className="brand-mark"><HeartPulse size={25} strokeWidth={2.25} /></span>
          <span className="brand-copy"><strong>HMS</strong><small>Care Operations</small></span>
        </div>

        <div className="auth-brand-content">
          <span className="auth-kicker"><Sparkles size={14} /> Modern hospital operations</span>
          <h1>Better coordination.<br />Better patient care.</h1>
          <p>One secure workspace for appointments, clinical records, admissions, prescriptions, and billing.</p>
        </div>

        <div className="auth-trust-row">
          <span><ShieldCheck size={18} /><span><strong>Secure access</strong><small>Role-based workspace</small></span></span>
          <span><Activity size={18} /><span><strong>Connected care</strong><small>One clear patient view</small></span></span>
        </div>
        <div className="auth-orb auth-orb-one" />
        <div className="auth-orb auth-orb-two" />
      </section>

      <main className="auth-form-panel">
        <div className="auth-theme-control"><ThemeToggle /></div>
        <div className="auth-mobile-brand">
          <span className="brand-mark"><HeartPulse size={21} strokeWidth={2.25} /></span>
          <span className="brand-copy"><strong>HMS</strong><small>Care Operations</small></span>
        </div>
        <div className="auth-card">
          <span className="auth-eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p className="sub">{subtitle}</p>
          {children}
          {footer}
        </div>
        <p className="auth-legal">Secure access to your hospital workspace</p>
      </main>
    </div>
  );
}
