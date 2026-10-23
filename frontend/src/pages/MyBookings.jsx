import { Link } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { formatOrderDate } from '../utils/order.js'
import Loading from '../components/Loading.jsx'
import Empty from '../components/Empty.jsx'
import styles from './Orders.module.css'

const STATUS_LABELS = {
  new: 'Waiting for a coach',
  confirmed: 'Confirmed',
  declined: 'Not this time',
  cancelled: 'Cancelled'
}

export default function MyBookings() {
  const { data: bookings, loading, error } = useApi('/bookings/my')

  if (loading) return <Loading />

  if (error) {
    return (
      <div className={styles.page}>
        <Empty title="Could not load bookings" message={error} />
      </div>
    )
  }

  if (!bookings?.length) {
    return (
      <div className={styles.page}>
        <Empty title="No program requests yet" message="Ask to join a program and your requests will show up here.">
          <Link to="/dashboard/programs" className="btn">
            Browse programs
          </Link>
        </Empty>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>My bookings</h1>
      <p className={styles.subtitle}>Requests you have sent to join a program.</p>

      {bookings.map((booking) => (
        <div className={styles.card} key={booking.id}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.number}>{booking.programName}</div>
              <div className={styles.date}>
                Sent {formatOrderDate(booking.createdAt)}
                {booking.preferredDate && ` · preferred start ${booking.preferredDate}`}
              </div>
            </div>
            <span className={styles.badgeGroup}>
              <span className={styles.methodBadge}>
                <CalendarDays size={13} />
                Program
              </span>
              <span className={styles.badge}>{STATUS_LABELS[booking.status] ?? booking.status}</span>
            </span>
          </div>
          {booking.message && <p className={styles.payment}>{booking.message}</p>}
        </div>
      ))}
    </div>
  )
}
