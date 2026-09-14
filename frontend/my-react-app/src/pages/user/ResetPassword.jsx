import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import PasswordInput from '../../components/PasswordInput';
import FormError from '../../components/FormError';
import FieldError from '../../components/FieldError';
import { validateOtp, validatePassword } from '../../utils/validation';

const API_URL = 'http://localhost:5000/api/users';
const OTP_TIMER_SECONDS = 60;

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = location.state?.email || '';

  const [email, setEmail] = useState(emailFromState);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_TIMER_SECONDS);
  const [resending, setResending] = useState(false);

  // Per-field errors
  const [fieldErrors, setFieldErrors] = useState({ otp: '', password: '', confirmPassword: '' });

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const t = setInterval(() => setTimeLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const setField = useCallback((name, value) => {
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (name === 'otp') setOtp(value);
    else setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  async function handleResend() {
    if (timeLeft > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to resend OTP.');
      setOtp('');
      setTimeLeft(OTP_TIMER_SECONDS);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  // Step 1: verify the OTP with the backend before revealing password fields
  async function verifyOtp(event) {
    event.preventDefault();
    setError('');
    const otpErr = validateOtp(otp);
    setFieldErrors((p) => ({ ...p, otp: otpErr }));
    if (otpErr) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/verify-password-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Invalid OTP.');
      setOtpVerified(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: submit all together
  async function submitReset(event) {
    event.preventDefault();
    setError('');
    const passErr = validatePassword(form.password);
    const confirmErr = form.password !== form.confirmPassword ? 'Passwords do not match.' : '';
    setFieldErrors((p) => ({ ...p, password: passErr, confirmPassword: confirmErr }));
    if (passErr || confirmErr) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password: form.password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to reset password.');
      navigate('/login', { state: { message: 'Password reset successfully. You can now log in.' } });
    } catch (requestError) {
      if (requestError.message.toLowerCase().includes('otp')) {
        setOtpVerified(false);
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <Link className="authBrand" to="/">BookMy<span>Turf</span></Link>
        <p className="authEyebrow">SECURITY</p>
        <h1>Reset your password</h1>

        {!otpVerified ? (
          <>
            <p className="authIntro">
              Enter the 6-digit OTP sent to <strong>{email || 'your email'}</strong>.
            </p>
            <FormError message={error} />
            <form className="authForm" onSubmit={verifyOtp}>
              {!emailFromState && (
                <label>
                  Email address
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </label>
              )}
              <label>
                OTP code
                <input
                  value={otp}
                  onChange={(e) => setField('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onBlur={() => setFieldErrors((p) => ({ ...p, otp: validateOtp(otp) }))}
                  inputMode="numeric"
                  maxLength="6"
                  required
                  placeholder="Enter 6-digit OTP"
                  autoComplete="one-time-code"
                  autoFocus
                  style={fieldErrors.otp ? { borderColor: '#ef4444' } : {}}
                />
                <FieldError message={fieldErrors.otp} />
              </label>

              {/* Resend OTP timer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-4px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.82rem', color: '#647187' }}>
                  {timeLeft > 0 ? <>Resend in <strong style={{ color: '#22c55e' }}>{formatTime(timeLeft)}</strong></> : "Didn't receive the code?"}
                </span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={timeLeft > 0 || resending}
                  style={{ background: 'none', border: 'none', cursor: timeLeft > 0 ? 'not-allowed' : 'pointer', color: timeLeft > 0 ? '#94a3b8' : '#22c55e', fontSize: '0.82rem', fontWeight: '600', textDecoration: timeLeft > 0 ? 'none' : 'underline', padding: 0 }}
                >
                  {resending ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>

              <button className="authSubmit" type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
            <p className="authSwitch">
              <Link to="/forgot-password">← Back</Link>
            </p>
          </>
        ) : (
          <>
            <p className="authIntro">OTP verified! Now choose a new password.</p>
            <FormError message={error} />
            <form className="authForm" onSubmit={submitReset}>
              <label>
                New password
                <PasswordInput
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  onBlur={() => setFieldErrors((p) => ({ ...p, password: validatePassword(form.password) }))}
                  minLength="6"
                  required
                  autoComplete="new-password"
                  autoFocus
                  style={fieldErrors.password ? { borderColor: '#ef4444' } : {}}
                />
                <FieldError message={fieldErrors.password} />
              </label>
              <label>
                Confirm new password
                <PasswordInput
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                  onBlur={() => setFieldErrors((p) => ({ ...p, confirmPassword: form.password !== form.confirmPassword ? 'Passwords do not match.' : '' }))}
                  minLength="6"
                  required
                  autoComplete="new-password"
                  style={fieldErrors.confirmPassword ? { borderColor: '#ef4444' } : {}}
                />
                <FieldError message={fieldErrors.confirmPassword} />
              </label>
              <button className="authSubmit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
            <p className="authSwitch">
              <button
                type="button"
                onClick={() => { setOtpVerified(false); setError(''); setFieldErrors({ otp: '', password: '', confirmPassword: '' }); }}
                style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}
              >
                ← Change OTP
              </button>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
