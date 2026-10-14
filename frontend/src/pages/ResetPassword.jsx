import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { readError } from '../api/client.js';
import AuthShell from '../components/AuthShell.jsx';
import styles from './Form.module.css';

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({
    email: location.state?.email ?? '',
    code: '',
    newPassword: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await resetPassword(values);
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(readError(requestError));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
        <h1 className={styles.title}>Set a new password</h1>
        <p className={styles.subtitle}>Enter the code we emailed you along with a new password.</p>

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
              value={values.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="code">
              Reset code
            </label>
            <input
              className={styles.input}
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={values.code}
              onChange={(event) =>
                setValues((current) => ({ ...current, code: event.target.value.replace(/\D/g, '') }))
              }
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="newPassword">
              New password
            </label>
            <input
              className={styles.input}
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={values.newPassword}
              onChange={handleChange}
              required
            />
            <span className={styles.hint}>At least 8 characters.</span>
          </div>

          <button className={`btn ${styles.submit}`} type="submit" disabled={submitting}>
            {submitting ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className={styles.footer}>
          <Link to="/login">Back to sign in</Link>
        </p>
    </AuthShell>
  );
}
