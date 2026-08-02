import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    <div className="auth-page">
      <div className="auth-card">
        <h1>Hospital Management System</h1>
        <p className="sub">Sign in to your account</p>
        <form onSubmit={submit}>
          <div>
            <label>Email</label>
            <input type="email" value={form.email} required
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={form.password} required
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="switch">New patient? <Link to="/register">Create an account</Link></p>
      </div>
    </div>
  );
}
