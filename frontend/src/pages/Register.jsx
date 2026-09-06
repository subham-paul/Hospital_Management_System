import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', password_confirmation: '',
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => {
    const value = e.target.value;
    const nextForm = { ...form, [k]: value };
    setForm(nextForm);

    const errors = { ...fieldErrors };
    if (k === 'name') errors.name = value && /\d/.test(value)
      ? 'Numbers are not allowed in the full name.' : '';
    if (k === 'email') errors.email = value && !/^\S+@\S+\.\S+$/.test(value)
      ? 'Enter a valid email address.' : '';
    if (k === 'phone') errors.phone = value && !/^(?:\+91[\s-]?|0)?[6-9]\d{9}$/.test(value)
      ? 'Enter a valid Indian phone number.' : '';
    if (k === 'password') errors.password = value && value.length < 8
      ? 'Password must be at least 8 characters.' : '';
    if (k === 'password_confirmation' || k === 'password') {
      errors.password_confirmation = nextForm.password_confirmation
        && nextForm.password !== nextForm.password_confirmation
        ? 'Passwords do not match.' : '';
    }
    setFieldErrors(errors);
  };

  const hasErrors = Object.values(fieldErrors).some(Boolean);
  const isFormValid = form.name && form.email && form.phone && form.password
    && form.password_confirmation && !hasErrors
    && /^\S+@\S+\.\S+$/.test(form.email)
    && /^(?:\+91[\s-]?|0)?[6-9]\d{9}$/.test(form.phone)
    && form.password.length >= 8
    && form.password === form.password_confirmation
    && !/\d/.test(form.name);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isFormValid) {
      return;
    }
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
    <AuthShell
      eyebrow="Patient portal"
      title="Create your account"
      subtitle="Register once to manage your appointments and care information."
      footer={<p className="switch">Already registered? <Link to="/login">Sign in</Link></p>}
    >
        <form className="auth-form register-form" onSubmit={submit}>
          <div className="field">
            <label htmlFor="register-name">Full name</label>
            <div className="input-shell">
              <UserRound size={18} />
              <input id="register-name" value={form.name} required pattern="[^0-9]*" autoComplete="name" placeholder="Your full name"
                title="Numbers are not allowed in the full name."
                aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                onChange={set('name')} />
            </div>
            {fieldErrors.name && <p id="name-error" className="error">{fieldErrors.name}</p>}
          </div>
          <div className="field">
            <label htmlFor="register-email">Email</label>
            <div className="input-shell">
              <Mail size={18} />
              <input id="register-email" type="email" value={form.email} required autoComplete="email" placeholder="you@example.com"
                aria-invalid={Boolean(fieldErrors.email)} onChange={set('email')} />
            </div>
            {fieldErrors.email && <p className="error">{fieldErrors.email}</p>}
          </div>
          <div className="field">
            <label htmlFor="register-phone">Phone</label>
            <div className="input-shell">
              <Phone size={18} />
              <input id="register-phone" value={form.phone} required inputMode="tel" autoComplete="tel" placeholder="10-digit mobile number"
                pattern="(?:\+91[\s-]?|0)?[6-9][0-9]{9}"
                title="Enter a valid Indian phone number."
                aria-invalid={Boolean(fieldErrors.phone)} onChange={set('phone')} />
            </div>
            {fieldErrors.phone && <p className="error">{fieldErrors.phone}</p>}
          </div>
          <div className="field">
            <label htmlFor="register-password">Password</label>
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input id="register-password" type="password" value={form.password} required minLength="8" autoComplete="new-password" placeholder="At least 8 characters"
                aria-invalid={Boolean(fieldErrors.password)} onChange={set('password')} />
            </div>
            {fieldErrors.password && <p className="error">{fieldErrors.password}</p>}
          </div>
          <div className="field">
            <label htmlFor="register-password-confirmation">Confirm password</label>
            <div className="input-shell">
              <LockKeyhole size={18} />
              <input id="register-password-confirmation" type="password" value={form.password_confirmation} required autoComplete="new-password" placeholder="Repeat your password"
                aria-invalid={Boolean(fieldErrors.password_confirmation)} onChange={set('password_confirmation')} />
            </div>
            {fieldErrors.password_confirmation && <p className="error">{fieldErrors.password_confirmation}</p>}
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn auth-submit" disabled={busy || !isFormValid}>
            <span>{busy ? 'Creating…' : 'Create account'}</span>
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>
    </AuthShell>
  );
}
