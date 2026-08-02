import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      const errors = err.response?.data?.errors;
      setError(errors ? Object.values(errors).flat().join(' ') : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Patient Registration</h1>
        <p className="sub">Create your patient account</p>
        <form onSubmit={submit}>
          <div><label>Full name</label><input value={form.name} required onChange={set('name')} /></div>
          <div><label>Email</label><input type="email" value={form.email} required onChange={set('email')} /></div>
          <div><label>Phone</label><input value={form.phone} onChange={set('phone')} /></div>
          <div><label>Password</label><input type="password" value={form.password} required onChange={set('password')} /></div>
          <div><label>Confirm password</label>
            <input type="password" value={form.password_confirmation} required onChange={set('password_confirmation')} /></div>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Register'}</button>
        </form>
        <p className="switch">Already registered? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
