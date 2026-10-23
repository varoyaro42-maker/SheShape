import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { adminEvents, formatEventDate } from '../../api/events.js'
import { readError } from '../../api/client.js'
import Loading from '../../components/Loading.jsx'
import styles from './Orders.module.css'
import form from './ProductForm.module.css'
import css from './CheckIn.module.css'

const time = (iso) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Africa/Kigali', hour: '2-digit', minute: '2-digit' })

/**
 * Scanning the QR on a ticket with a phone camera opens this page.
 * Green only when this scan is the one that let her in; a ticket that was
 * already used shows a loud warning with the first time and who did it.
 */
export default function AdminCheckInPage() {
  const { token } = useParams()
  const [reg, setReg] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [justCheckedIn, setJustCheckedIn] = useState(false)

  useEffect(() => {
    adminEvents.checkInLookup(token).then(setReg).catch((err) => setError(readError(err)))
  }, [token])

  async function checkIn() {
    setBusy(true)
    setError('')
    try {
      const out = await adminEvents.checkIn(token)
      setReg((r) => ({ ...r, checkedInAt: out.checkedInAt, checkedInBy: out.checkedInBy }))
      setJustCheckedIn(!out.alreadyCheckedIn)
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  if (!reg) return error ? <div className={css.banner + ' ' + css.bad}><XCircle size={40} /><strong>{error}</strong><span>This is not a valid ticket.</span></div> : <Loading />

  const valid = reg.status === 'confirmed'
  const alreadyUsed = valid && reg.checkedInAt && !justCheckedIn

  return (
    <div className={styles.page} style={{ maxWidth: 520 }}>
      <Link to={`/admin/events/${reg.event.id}/registrations`} className={form.back}>← {reg.event.title}</Link>

      {!valid && (
        <div className={`${css.banner} ${css.bad}`} role="alert">
          <XCircle size={44} />
          <strong>Not valid</strong>
          <span>This ticket is {reg.status}. Do not let her in on it; check the registrations list.</span>
        </div>
      )}
      {alreadyUsed && (
        <div className={`${css.banner} ${css.warn}`} role="alert">
          <AlertTriangle size={44} />
          <strong>Already used</strong>
          <span>Checked in at {time(reg.checkedInAt)}{reg.checkedInBy ? ` by ${reg.checkedInBy}` : ''}. Do not let a second person in on this ticket.</span>
        </div>
      )}
      {valid && justCheckedIn && (
        <div className={`${css.banner} ${css.ok}`} role="status">
          <CheckCircle2 size={44} />
          <strong>Checked in</strong>
          <span>{time(reg.checkedInAt)}. Welcome her in.</span>
        </div>
      )}

      <div className={form.card} style={{ marginTop: 12, textAlign: 'center' }}>
        <p className={styles.subtitle}>{formatEventDate(reg.event.date)}</p>
        <h1 className={styles.title}>{reg.name}</h1>
        <p className={css.ticket}>{reg.ticketNumber ?? 'No ticket'}</p>
        <p>{reg.activities.map((a) => a.name).join(' · ') || 'No activities'}</p>
        {error && <p className={styles.error}>{error}</p>}
        {valid && !reg.checkedInAt && (
          <button type="button" className={form.primary} onClick={checkIn} disabled={busy} style={{ justifyContent: 'center', width: '100%', padding: '1rem' }}>
            {busy ? 'Checking in…' : 'Check her in'}
          </button>
        )}
        {reg.hasHealthNote && <p className={styles.subtitle}>She left a health note for the medical team.</p>}
      </div>
    </div>
  )
}
