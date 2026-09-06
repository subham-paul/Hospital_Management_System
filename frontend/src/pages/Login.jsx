import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your account"
      subtitle="Enter your credentials to access the hospital workspace."
      footer={<p className="switch">New patient? <Link to="/register">Create an account</Link></p>}
    >
        <form className="auth-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="login-email">Email address</label>
            <div className="input-shell">
              <Mail size={18} />
              <input id="login-email" type="email" value={form.email} required autoComplete="email" placeholder="you@example.com"
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input id="login-password" type="password" value={form.password} required autoComplete="current-password" placeholder="Enter your password"
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn auth-submit" disabled={busy}>
            <span>{busy ? 'Signing in…' : 'Sign in'}</span>
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>
    </AuthShell>
  );
}
