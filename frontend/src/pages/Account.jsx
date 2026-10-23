import { useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../context/auth-context.js';
import { readError } from '../api/client.js';
import AvatarUploader from '../components/AvatarUploader.jsx';
import styles from './Account.module.css';
import field from './Form.module.css';

const EMPTY_PASSWORD_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function Account() {
  const { user, changePassword, setCurrentUser } = useAuth();

  const [values, setValues] = useState(EMPTY_PASSWORD_FORM);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (values.newPassword !== values.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      setValues(EMPTY_PASSWORD_FORM);
      setNotice('Your password has been updated.');
    } catch (requestError) {
      setError(readError(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`page ${styles.page}`}>
      <h1 className={styles.title}>My account</h1>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Profile</h2>
        <div className={styles.avatarRow}>
          <AvatarUploader user={user} onChange={setCurrentUser} />
        </div>
        <p className={styles.detail}>
          <strong>{user?.name}</strong>
        </p>
        <p className={styles.detail}>{user?.email}</p>
        <p className={styles.detail}>{user?.phone}</p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Change password</h2>

        <form className={field.form} onSubmit={handleSubmit} noValidate>
          {error && <p className={field.error}>{error}</p>}
          {notice && <p className={field.hint}>{notice}</p>}

          <div className={field.field}>
            <label className={field.label} htmlFor="currentPassword">
              Current password
            </label>
            <input
              className={field.input}
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className={field.field}>
            <label className={field.label} htmlFor="newPassword">
              New password
            </label>
            <input
              className={field.input}
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              value={values.newPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className={field.field}>
            <label className={field.label} htmlFor="confirmPassword">
              Confirm new password
            </label>
            <input
              className={field.input}
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button className="btn" type="submit" disabled={submitting}>
            <Check size={16} />
            {submitting ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  );
}
