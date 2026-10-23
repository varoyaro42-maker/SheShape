import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { adminEvents, formatEventDate } from '../../api/events.js'
import { readError } from '../../api/client.js'
import Loading from '../../components/Loading.jsx'
import styles from './Orders.module.css'
import form from './ProductForm.module.css'

const STATE = { draft: ['Draft', 'pending'], open: ['Open', 'delivered'], full: ['Fully booked', 'shipped'], closed: ['Closed', 'cancelled'], not_open: ['Not open yet', 'pending'] }

export default function AdminEventsPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminEvents.list().then(setRows).catch((err) => setError(readError(err)))
  }, [])

  return (
    <div className={styles.page}>
      <header className={form.header}>
        <div>
          <h1 className={styles.title}>Events</h1>
          <p className={styles.subtitle}>Create an event, its activities and its registration form. Each event gets its own page and link.</p>
        </div>
        <Link to="/admin/events/new" className={form.primary}>
          <Plus size={16} /> New event
        </Link>
      </header>
      {error && <p className={styles.error}>{error}</p>}
      {!rows && !error && <Loading />}
      {rows && rows.length === 0 && <p className={styles.subtitle}>No events yet.</p>}
      {rows && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Status</th>
                <th className={styles.numCol}>Registered</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const [label, cls] = STATE[e.state] ?? STATE.draft
                return (
                  <tr key={e.id} onClick={() => navigate(`/admin/events/${e.id}/registrations`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className={styles.name}>{e.title}</div>
                      <div className={styles.date}>/{e.slug}</div>
                    </td>
                    <td className={styles.date}>{formatEventDate(e.date)}</td>
                    <td><span className={`${styles.badge} ${styles[cls]}`}>{label}</span></td>
                    <td className={styles.numCol}>{e.confirmed} / {e.totalPlaces}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }} onClick={(ev) => ev.stopPropagation()}>
                      <Link to={`/admin/events/${e.id}`} className={styles.ghost}>Edit</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
