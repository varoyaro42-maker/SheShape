import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, X, Ban } from 'lucide-react'
import { adminBookings } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import { formatOrderDate } from '../../utils/order.js'
import Loading from '../../components/Loading.jsx'
import { BOOKING_STATUS_LABELS } from '../../utils/booking.js'
import styles from './OrderDetail.module.css'
import formStyles from './ProductForm.module.css'

const BADGE_CLASS = { new: 'pending', confirmed: 'delivered', declined: 'cancelled', cancelled: 'cancelled' }

export default function AdminBookingDetailPage() {
  const { id } = useParams()
  const { showToast } = useToast()

  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    let active = true

    adminBookings
      .detail(id)
      .then((data) => {
        if (!active) return
        setBooking(data)
        setNote(data.adminNote ?? '')
      })
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [id])

  async function setStatus(status) {
    setSaving(true)
    setError('')

    try {
      const updated = await adminBookings.updateStatus(id, { status, note })
      setBooking(updated)
      showToast(
        status === 'confirmed'
          ? `Confirmed. ${updated.email} has been emailed.`
          : status === 'declined'
            ? `Declined. ${updated.email} has been emailed.`
            : 'Booking updated.'
      )
    } catch (err) {
      setError(readError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  if (!booking) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error || 'Booking not found.'}</p>
        <Link to="/admin/bookings" className={styles.back}>
          Back to bookings
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title} style={{ fontFamily: 'inherit' }}>
            {booking.name}
          </h1>
          <p className={styles.placed}>
            Wants to join <strong>{booking.programName}</strong> · received {formatOrderDate(booking.createdAt)}
          </p>
        </div>
        <Link to="/admin/bookings" className={styles.back}>
          Back to bookings
        </Link>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.card}>
        <div className={styles.statusRow}>
          <span className={`${styles.badge} ${styles[BADGE_CLASS[booking.status]] ?? ''}`}>
            {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
          </span>
          {booking.respondedBy?.name && (
            <span className={styles.placed}>
              Handled by {booking.respondedBy.name} · {formatOrderDate(booking.respondedAt)}
            </span>
          )}
        </div>

        <dl className={styles.facts} style={{ marginTop: '1.25rem' }}>
          <div>
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${booking.email}`}>{booking.email}</a>
            </dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>
              <a href={`tel:${booking.phone}`}>{booking.phone}</a>
            </dd>
          </div>
          <div>
            <dt>Preferred start</dt>
            <dd>{booking.preferredDate || 'Not given'}</dd>
          </div>
          <div>
            <dt>Program</dt>
            <dd>
              {booking.program ? <Link to={`/admin/programs/${booking.program.id}`}>{booking.program.name}</Link> : booking.programName}
            </dd>
          </div>
        </dl>

        {booking.message && (
          <>
            <h2 className={styles.sectionTitle} style={{ marginTop: '1.25rem' }}>
              Their message
            </h2>
            <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.6 }}>{booking.message}</p>
          </>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Reply and decide</h2>
        <p className={formStyles.hint} style={{ marginBottom: '0.85rem' }}>
          The note is included in the email the customer gets when you confirm or decline. Use it for the start
          date, where to meet, or what to bring.
        </p>

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={5}
          placeholder="e.g. Welcome! Your first session is Monday 06:30 at Fitnesspoint Kimihurura. Bring water and a towel."
          className={formStyles.textarea}
        />

        <div className={formStyles.actions} style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
          <button type="button" disabled={saving || booking.status === 'confirmed'} onClick={() => setStatus('confirmed')} className={formStyles.primary}>
            <Check size={15} />
            Confirm and email
          </button>
          <button type="button" disabled={saving || booking.status === 'declined'} onClick={() => setStatus('declined')} className={formStyles.ghost}>
            <X size={15} />
            Decline and email
          </button>
          <button type="button" disabled={saving || booking.status === 'cancelled'} onClick={() => setStatus('cancelled')} className={formStyles.ghost}>
            <Ban size={15} />
            Cancel quietly
          </button>
        </div>
      </section>
    </div>
  )
}
