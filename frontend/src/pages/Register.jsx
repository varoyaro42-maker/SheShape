import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { readError } from '../api/client.js';
import AuthShell from '../components/AuthShell.jsx';
import styles from './Form.module.css';
import { resolveAfterLogin, takeAfterLogin } from '../utils/afterLogin.js';

const EMPTY_FORM = { name: '', email: '', phone: '', password: '' };

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={resolveAfterLogin(null, user.role)} replace />;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await register(values);
      if (result.pendingVerification) {
        navigate('/verify-email', { replace: true, state: { email: result.email } });
      } else {
        navigate(takeAfterLogin(null, 'customer'), { replace: true });
      }
    } catch (requestError) {
      setError(readError(requestError));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>So you can track what you order.</p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="name">
              Full name
            </label>
            <input
              className={styles.input}
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={values.name}
              onChange={handleChange}
              required
            />
          </div>

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
            <label className={styles.label} htmlFor="phone">
              Phone
            </label>
            <input
              className={styles.input}
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0788 123 456"
              value={values.phone}
              onChange={handleChange}
              required
            />
            <span className={styles.hint}>We use this to confirm your order.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              className={styles.input}
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={handleChange}
              required
            />
            <span className={styles.hint}>At least 8 characters.</span>
          </div>

          <button className={`btn ${styles.submit}`} type="submit" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
    </AuthShell>
  );
}
