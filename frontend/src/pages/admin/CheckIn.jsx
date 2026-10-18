import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { adminEvents, formatEventDate } from '../../api/events.js'
import { readError } from '../../api/client.js'
import Loading from '../../components/Loading.jsx'
import styles from './Orders.module.css'
import form from './ProductForm.module.css'

/** Scanning the QR on a ticket with a phone camera opens this page. */
export default function AdminCheckInPage() {
  const { token } = useParams()
  const [reg, setReg] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    adminEvents.checkInLookup(token).then(setReg).catch((err) => setError(readError(err)))
  }, [token])

  async function checkIn() {
    setBusy(true)
    try {
      const out = await adminEvents.checkIn(token)
      setReg((r) => ({ ...r, checkedInAt: out.checkedInAt }))
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  if (!reg) return error ? <p className={styles.error}>{error}</p> : <Loading />
  const valid = reg.status === 'confirmed'

  return (
    <div className={styles.page} style={{ maxWidth: 520 }}>
      <Link to={`/admin/events/${reg.event.id}/registrations`} className={form.back}>← {reg.event.title}</Link>
      <div className={form.card} style={{ marginTop: 12, textAlign: 'center' }}>
        <p className={styles.subtitle}>{formatEventDate(reg.event.date)}</p>
        <h1 className={styles.title}>{reg.name}</h1>
        <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>{reg.ticketNumber ?? 'No ticket'}</p>
        <p>{reg.activities.map((a) => a.name).join(' · ') || 'No activities'}</p>
        {error && <p className={styles.error}>{error}</p>}
        {!valid ? (
          <p className={styles.error}>This ticket is {reg.status}. Do not let her in on it; check the registrations list.</p>
        ) : reg.checkedInAt ? (
          <p style={{ color: '#1d7a45', fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <CheckCircle2 size={20} /> Checked in at {new Date(reg.checkedInAt).toLocaleTimeString('en-GB', { timeZone: 'Africa/Kigali', hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : (
          <button type="button" className={form.primary} onClick={checkIn} disabled={busy} style={{ justifyContent: 'center', width: '100%' }}>
            {busy ? 'Checking in…' : 'Check her in'}
          </button>
        )}
        {reg.hasHealthNote && <p className={styles.subtitle}>She left a health note for the medical team.</p>}
      </div>
    </div>
  )
}
