import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { validateEmail } from '../../utils/validation';
import FormError from '../../components/FormError';
import FieldError from '../../components/FieldError';

const API_URL = 'http://localhost:5000/api/users';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [fieldErr, setFieldErr] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleBlur() {
    setFieldErr(validateEmail(email));
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    const emailErr = validateEmail(email);
    setFieldErr(emailErr);
    if (emailErr) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to send OTP.');
      navigate('/reset-password', { state: { email } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <Link className="authBrand" to="/">BookMy<span>Turf</span></Link>
        <p className="authEyebrow">PASSWORD HELP</p>
        <h1>Forgot your password?</h1>
        <p className="authIntro">Enter your email and we'll send a 6-digit OTP to reset your password.</p>
        <FormError message={error} />
        <form className="authForm" onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (fieldErr) setFieldErr(validateEmail(e.target.value)); }}
              onBlur={handleBlur}
             
              autoComplete="email"
              style={fieldErr ? { borderColor: '#ef4444' } : {}}
            />
            <FieldError message={fieldErr} />
          </label>
          <button className="authSubmit" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
        <p className="authSwitch"><Link to="/login">Back to log in</Link></p>
      </section>
    </main>
  );
}
