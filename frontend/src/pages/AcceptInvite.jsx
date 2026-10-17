import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { readError } from '../api/client.js'
import { useAuth } from '../context/auth-context.js'
import AuthShell from '../components/AuthShell.jsx'
import Loading from '../components/Loading.jsx'
import styles from './Form.module.css'

export default function AcceptInvite() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { setCurrentUser } = useAuth()
  const [invite, setInvite] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [values, setValues] = useState({ name: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .get(`/auth/invites/${token}`)
      .then((response) => {
        setInvite(response.data.data)
        setValues((current) => ({ ...current, name: response.data.data.name ?? '' }))
      })
      .catch((err) => setLoadError(readError(err)))
  }, [token])

  const change = (event) => setValues((current) => ({ ...current, [event.target.name]: event.target.value }))

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const response = await api.post(`/auth/invites/${token}/accept`, values)
      setCurrentUser(response.data.data)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(readError(err))
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <AuthShell>
        <h1 className={styles.title}>Invite not available</h1>
        <p className={styles.subtitle}>{loadError}</p>
        <p className={styles.footer}>
          <Link to="/login">Go to sign in</Link>
        </p>
      </AuthShell>
    )
  }

  if (!invite) return <Loading />

  return (
    <AuthShell>
      <h1 className={styles.title}>Join the She Shape Wellness admin</h1>
      <p className={styles.subtitle}>
        {invite.hasAccount
          ? `You already have an account as ${invite.email}. Enter your password to accept.`
          : `Set up your admin account for ${invite.email}.`}
      </p>

      <form className={styles.form} onSubmit={submit} noValidate>
        {error && <p className={styles.error}>{error}</p>}

        {!invite.hasAccount && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="name">Your name</label>
              <input className={styles.input} id="name" name="name" autoComplete="name" value={values.name} onChange={change} required />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="phone">Phone</label>
              <input className={styles.input} id="phone" name="phone" type="tel" autoComplete="tel" placeholder="078..." value={values.phone} onChange={change} required />
            </div>
          </>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">{invite.hasAccount ? 'Your password' : 'Choose a password'}</label>
          <input
            className={styles.input}
            id="password"
            name="password"
            type="password"
            autoComplete={invite.hasAccount ? 'current-password' : 'new-password'}
            value={values.password}
            onChange={change}
            required
          />
          {!invite.hasAccount && <span className={styles.hint}>At least 8 characters.</span>}
        </div>

        <button className={`btn ${styles.submit}`} type="submit" disabled={submitting}>
          {submitting ? 'Joining…' : 'Accept invite'}
        </button>
      </form>
    </AuthShell>
  )
}
