import { useState } from 'react'
import { Check, Send } from 'lucide-react'
import { bookings } from '../api/bookings.js'
import { readError } from '../api/client.js'
import { useAuth } from '../context/auth-context.js'
import styles from './BookingForm.module.css'

/**
 * Ask-to-join form for a program. The request lands in the admin inbox and
 * the customer gets an acknowledgement email straight away.
 */
export default function BookingForm({ program, onDone }) {
  const { user } = useAuth()
  const [fields, setFields] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    preferredDate: '',
    message: ''
  })
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  function set(field, value) {
    setFields((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    setSending(true)
    setError('')
    setFieldErrors({})

    try {
      const booking = await bookings.create({ ...fields, programId: program?.id })
      setDone(true)
      onDone?.(booking)
    } catch (err) {
      setError(readError(err))
      const details = err?.response?.data?.details
      if (Array.isArray(details)) {
        setFieldErrors(Object.fromEntries(details.map((item) => [item.field, item.message])))
      }
    } finally {
      setSending(false)
    }
  }

  if (done) {
    return (
      <div className={styles.done} role="status">
        <span className={styles.doneIcon}>
          <Check size={22} />
        </span>
        <h3 className={styles.doneTitle}>Request sent</h3>
        <p className={styles.doneText}>
          We emailed you a copy. A coach will confirm your place by email or phone, usually within one business day.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Your name</span>
          <input
            type="text"
            value={fields.name}
            onChange={(event) => set('name', event.target.value)}
            className={styles.input}
            autoComplete="name"
            maxLength={80}
          />
          {fieldErrors.name && <span className={styles.hint}>{fieldErrors.name}</span>}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Phone</span>
          <input
            type="tel"
            value={fields.phone}
            onChange={(event) => set('phone', event.target.value)}
            className={styles.input}
            autoComplete="tel"
            placeholder="078 000 0000"
          />
          {fieldErrors.phone && <span className={styles.hint}>{fieldErrors.phone}</span>}
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input
            type="email"
            value={fields.email}
            onChange={(event) => set('email', event.target.value)}
            className={styles.input}
            autoComplete="email"
          />
          {fieldErrors.email && <span className={styles.hint}>{fieldErrors.email}</span>}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>
            When would you like to start? <span className={styles.optional}>optional</span>
          </span>
          <input
            type="date"
            value={fields.preferredDate}
            onChange={(event) => set('preferredDate', event.target.value)}
            className={styles.input}
            min={new Date().toISOString().slice(0, 10)}
          />
          {fieldErrors.preferredDate && <span className={styles.hint}>{fieldErrors.preferredDate}</span>}
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>
          Anything we should know? <span className={styles.optional}>optional</span>
        </span>
        <textarea
          value={fields.message}
          onChange={(event) => set('message', event.target.value)}
          rows={4}
          className={styles.textarea}
          placeholder="Your goals, injuries, the times that suit you…"
          maxLength={2000}
        />
      </label>

      <button type="submit" className={`btn btn-lg ${styles.submit}`} disabled={sending}>
        {sending ? 'Sending…' : program ? `Ask to join ${program.name}` : 'Send request'}
        {!sending && <Send size={16} />}
      </button>

      <p className={styles.fine}>No payment is taken online. We confirm your place first.</p>
    </form>
  )
}
