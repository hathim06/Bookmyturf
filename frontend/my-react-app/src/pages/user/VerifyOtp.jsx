import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { updateAuthUser } from '../../utils/auth';
import { validateOtp } from '../../utils/validation';
import FormError from '../../components/FormError';
import { userService } from '../../services/userService';

const OTP_TIMER_SECONDS = 60;


export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_TIMER_SECONDS);

  const signup = location.state?.purpose === 'signup';
  const email = location.state?.email;

  // Countdown timer effect: counts down to 0 without resetting on wrong OTP attempts
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (signup && !email) {
    return (
      <main className="authPage">
        <section className="authCard">
          <p className="authError">Start by creating an account.</p>
          <Link to="/signup">Go to sign up</Link>
        </section>
      </main>
    );
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const otpErr = validateOtp(otp);
    if (otpErr) return setError(otpErr);

    setLoading(true);

    try {
      const data = signup
        ? await userService.verifySignupOtp(email, otp)
        : await userService.verifyOtp({ otp });

      if (data.user) {
        updateAuthUser(data.user);
      }

      navigate(signup ? '/login' : '/profile', {
        replace: true,
        state: signup ? { message: data.message } : undefined
      });
    } catch (err) {
      // NOTE: We do NOT reset timeLeft here so the timer continues counting down until it reaches zero!
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (timeLeft > 0 || resending) return;

    setResending(true);
    setError('');
    setSuccess('');

    try {
      const data = signup
        ? await userService.resendSignupOtp(email)
        : await userService.resendOtp();

      setSuccess(data.message || 'A new verification code has been sent.');
      setOtp('');
      setTimeLeft(OTP_TIMER_SECONDS); // Timer resets ONLY upon successfully sending a new OTP
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <Link className="authBrand" to="/">
          BookMy<span>Turf</span>
        </Link>
        <p className="authEyebrow">VERIFY ACCOUNT</p>
        <h1>Enter verification code</h1>
        <p className="authIntro">
          We sent a six-digit OTP to {signup ? <strong>{email}</strong> : 'your current email address'}.
        </p>

        <FormError message={error} />
        {success && <p className="authSuccess" role="status">{success}</p>}

        <form className="authForm" onSubmit={submit}>
          <label>
            OTP
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength="6"
             
              autoFocus
              placeholder="Enter 6-digit OTP"
              autoComplete="one-time-code"
            />
          </label>

          <button className="authSubmit" disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="otpResendBox">
          <div className="otpTimerText">
            {timeLeft > 0 ? (
              <>
                <span>Resend in</span>
                <span className="otpTimerBadge">{formatTime(timeLeft)}</span>
              </>
            ) : (
              <span>Didn't receive the code?</span>
            )}
          </div>

          <button
            type="button"
            className="otpResendBtn"
            onClick={handleResend}
            disabled={timeLeft > 0 || resending}
          >
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>

        <p className="authSwitch">
          <Link to={signup ? '/signup' : '/profile'}>
            ← Back to {signup ? 'Sign up' : 'Profile'}
          </Link>
        </p>
      </section>
    </main>
  );
}

