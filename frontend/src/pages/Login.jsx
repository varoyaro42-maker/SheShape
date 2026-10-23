import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import { readError } from '../api/client.js';
import AuthShell from '../components/AuthShell.jsx';
import styles from './Form.module.css';
import { resolveAfterLogin, takeAfterLogin } from '../utils/afterLogin.js';

export default function Login() {
  const { user, isAdmin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = resolveAfterLogin(location.state?.from?.pathname, isAdmin ? 'admin' : 'customer');

  if (user) return <Navigate to={redirectTo} replace />;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await login(values);
      if (result.pendingVerification) {
        navigate('/verify-email', { replace: true, state: { email: result.email } });
      } else {
        navigate(takeAfterLogin(location.state?.from?.pathname, result.role), { replace: true });
      }
    } catch (requestError) {
      setError(readError(requestError));
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to see your orders.</p>

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
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              className={styles.input}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={handleChange}
              required
            />
            <span className={styles.hint}>
              <Link to="/forgot-password">Forgot your password?</Link>
            </span>
          </div>

          <button className={`btn ${styles.submit}`} type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className={styles.footer}>
          New here? <Link to="/register" state={location.state}>Create an account</Link>
        </p>
    </AuthShell>
  );
}
