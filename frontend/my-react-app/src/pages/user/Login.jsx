import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import PasswordInput from '../../components/PasswordInput';
import { setAuthSession } from '../../utils/auth';
import { validateEmail, validatePassword } from '../../utils/validation';
import FormError from '../../components/FormError';
import FieldError from '../../components/FieldError';
import { requestJson } from '../../utils/api';

const API_URL = 'http://localhost:5000/api/users';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: '' });
  };

  const validateField = (name, value) => {
    if (name === 'email') return validateEmail(value);
    if (name === 'password') return validatePassword(value);
    return '';
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setFieldErrors({ ...fieldErrors, [name]: validateField(name, value) });
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const emailErr = validateEmail(form.email);
    const passErr = validatePassword(form.password);
    setFieldErrors({ email: emailErr, password: passErr });
    if (emailErr || passErr) return;

    setLoading(true);
    try {
      const data = await requestJson(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setAuthSession(data.token, data.user);
      const destinations = { admin: '/admin/dashboard', owner: '/owner/dashboard', user: '/' };
      navigate(destinations[data.user.role] || '/', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const data = await requestJson(`${API_URL}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      if (data.token) {
        setAuthSession(data.token, data.user);
        const destinations = { admin: '/admin/dashboard', owner: '/owner/dashboard', user: '/' };
        navigate(destinations[data.user.role] || '/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Google login error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authContent">
          <Link className="authBrand" to="/">BookMy<span>Turf</span></Link>
          <p className="authEyebrow">WELCOME BACK</p>
          <h1>Log in to your account</h1>
          {location.state?.message && <p className="authSuccess">{location.state.message}</p>}
          <FormError message={error} />

          <div className="authSocial">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError('Google login failed.')} />
          </div>
          <div className="authDivider"><span>OR</span></div>

          <form className="authForm" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              onBlur={handleBlur}
             
              autoComplete="email"
              style={fieldErrors.email ? { borderColor: '#ef4444' } : {}}
            />
            <FieldError message={fieldErrors.email} />
          </label>
          <label>
            Password
            <PasswordInput
              name="password"
              value={form.password}
              onChange={updateField}
              onBlur={handleBlur}
             
              autoComplete="current-password"
              style={fieldErrors.password ? { borderColor: '#ef4444' } : {}}
            />
            <FieldError message={fieldErrors.password} />
          </label>
          <Link className="forgotLink" to="/forgot-password">Forgot password?</Link>
          <button className="authSubmit" disabled={loading}>{loading ? 'Logging in...' : 'Log in'}</button>
          </form>
          <p className="authSwitch">New to BookMyTurf? <Link to="/signup">Create an account</Link></p>
        </div>
      </section>
    </main>
  );
}
