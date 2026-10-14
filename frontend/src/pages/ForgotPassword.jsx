import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { readError } from '../api/client.js';
import styles from './Form.module.css';

export default function ForgotPassword() {
  const { forgotPassword } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await forgotPassword(email);
      setSent(true);
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>
          Enter your email and we'll send you a 6-digit code to reset your password.
        </p>

        {sent ? (
          <>
            <p className={styles.hint}>
              If an account exists for {email}, a reset code is on its way.
            </p>
            <button
              type="button"
              className={`btn ${styles.submit}`}
              onClick={() => navigate('/reset-password', { state: { email } })}
            >
              I have my code
            </button>
          </>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                className={styles.input}
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <button className={`btn ${styles.submit}`} type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send reset code'}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
