import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { readError } from '../api/client.js';
import AuthShell from '../components/AuthShell.jsx';
import styles from './Form.module.css';

export default function VerifyEmail() {
  const { user, verifyEmail, resendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);

    try {
      await verifyEmail(code);
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(readError(requestError));
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setNotice('');
    setResending(true);

    try {
      await resendOtp();
      setNotice('A new code is on its way.');
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell>
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.subtitle}>
          {email ? `We sent a 6-digit code to ${email}.` : 'Enter the 6-digit code we emailed you.'}
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.error}>{error}</p>}
          {notice && <p className={styles.hint}>{notice}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="code">
              Verification code
            </label>
            <input
              className={styles.input}
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
              required
            />
          </div>

          <button className={`btn ${styles.submit}`} type="submit" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <p className={styles.footer}>
          Didn't get it?{' '}
          <button type="button" onClick={handleResend} disabled={resending} className={styles.linkButton}>
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </p>

        <p className={styles.footer}>
          <Link to="/login">Back to sign in</Link>
        </p>
    </AuthShell>
  );
}
