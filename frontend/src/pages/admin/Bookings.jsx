import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListFilter } from 'lucide-react'
import { adminBookings } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import { formatOrderDate } from '../../utils/order.js'
import { BOOKING_STATUS_LABELS } from '../../utils/booking.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import FilterSelect from '../../components/FilterSelect.jsx'
import styles from './Orders.module.css'

const STATUSES = ['new', 'confirmed', 'declined', 'cancelled']
const LIMIT = 20

const BADGE_CLASS = { new: 'pending', confirmed: 'delivered', declined: 'cancelled', cancelled: 'cancelled' }

export default function AdminBookingsPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 350)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = { page, limit: LIMIT }
      if (status) params.status = status
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()

      const [result, totals] = await Promise.all([adminBookings.list(params), adminBookings.counts()])
      setRows(result.data)
      setMeta(result.meta)
      setCounts(totals)
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }, [page, status, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [status, debouncedSearch])

  const total = counts ? STATUSES.reduce((sum, name) => sum + (counts[name] ?? 0), 0) : null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Bookings</h1>
        <p className={styles.subtitle}>
          Requests to join a program. Confirm or decline and the customer is emailed.
        </p>
      </header>

      <div className={styles.filters}>
        {counts && (
          <FilterSelect
            icon={ListFilter}
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: `All (${total})` },
              ...STATUSES.map((name) => ({
                value: name,
                label: `${BOOKING_STATUS_LABELS[name]} (${counts[name] ?? 0})`
              }))
            ]}
          />
        )}

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, phone or program"
          className={styles.search}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <Loading />}
      {!loading && rows.length === 0 && <Empty message="No booking requests match these filters." />}

      {!loading && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Who</th>
                <th>Program</th>
                <th>Preferred start</th>
                <th>Received</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <Link
                      to={`/admin/bookings/${booking.id}`}
                      className={styles.name}
                      style={booking.status === 'new' ? { fontWeight: 700 } : undefined}
                    >
                      {booking.name}
                    </Link>
                    <span className={styles.phone}>{booking.phone}</span>
                  </td>
                  <td>{booking.programName}</td>
                  <td className={styles.date}>{booking.preferredDate || '—'}</td>
                  <td className={styles.date}>{formatOrderDate(booking.createdAt)}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[BADGE_CLASS[booking.status]]}`}>
                      {BOOKING_STATUS_LABELS[booking.status] ?? booking.status}
                    </span>
                  </td>
                  <td className={styles.numCol}>
                    <Link to={`/admin/bookings/${booking.id}`} className={styles.ghost}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.pages > 1 && (
        <div className={styles.pager}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className={styles.ghost}>
            Previous
          </button>
          <span className={styles.pagerLabel}>
            Page {meta.page} of {meta.pages}
          </span>
          <button type="button" disabled={page >= meta.pages} onClick={() => setPage((current) => current + 1)} className={styles.ghost}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
