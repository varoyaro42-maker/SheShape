import { useCallback, useEffect, useState } from 'react'
import { Download, ListFilter, Trash2 } from 'lucide-react'
import { adminSubscribers } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import { useToast } from '../../context/toast-context.js'
import { formatOrderDate } from '../../utils/order.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import FilterSelect from '../../components/FilterSelect.jsx'
import styles from './Orders.module.css'
import formStyles from './ProductForm.module.css'

const STATUSES = ['subscribed', 'pending', 'unsubscribed']
const LABELS = { subscribed: 'Subscribed', pending: 'Awaiting confirmation', unsubscribed: 'Unsubscribed' }
const BADGE_CLASS = { subscribed: 'delivered', pending: 'pending', unsubscribed: 'cancelled' }
const LIMIT = 25

export default function AdminSubscribersPage() {
  const { showToast } = useToast()
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

      const [result, totals] = await Promise.all([adminSubscribers.list(params), adminSubscribers.counts()])
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

  async function remove(subscriber) {
    if (!window.confirm(`Remove ${subscriber.email} from the list? This cannot be undone.`)) return

    try {
      await adminSubscribers.remove(subscriber.id)
      showToast(`${subscriber.email} removed.`)
      load()
    } catch (err) {
      setError(readError(err))
    }
  }

  const total = counts ? STATUSES.reduce((sum, name) => sum + (counts[name] ?? 0), 0) : null

  return (
    <div className={styles.page}>
      <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className={styles.title}>Newsletter</h1>
          <p className={styles.subtitle}>
            {counts ? `${counts.subscribed} confirmed subscriber${counts.subscribed === 1 ? '' : 's'}` : 'Loading'}
            {meta?.brevoSync ? ' · synced to your Brevo list' : ' · set BREVO_LIST_ID to sync with Brevo'}
          </p>
        </div>
        <a href={adminSubscribers.exportUrl} className={formStyles.primary} download>
          <Download size={15} />
          Export CSV
        </a>
      </header>

      <div className={styles.filters}>
        {counts && (
          <FilterSelect
            icon={ListFilter}
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: `All (${total})` },
              ...STATUSES.map((name) => ({ value: name, label: `${LABELS[name]} (${counts[name] ?? 0})` }))
            ]}
          />
        )}
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search email or name"
          className={styles.search}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <Loading />}
      {!loading && rows.length === 0 && <Empty message="No subscribers match these filters." />}

      {!loading && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Status</th>
                <th>Joined</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((subscriber) => (
                <tr key={subscriber.id}>
                  <td>{subscriber.email}</td>
                  <td>{subscriber.name || '—'}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[BADGE_CLASS[subscriber.status]]}`}>
                      {LABELS[subscriber.status] ?? subscriber.status}
                    </span>
                  </td>
                  <td className={styles.date}>{formatOrderDate(subscriber.confirmedAt || subscriber.createdAt)}</td>
                  <td className={styles.numCol}>
                    <button type="button" onClick={() => remove(subscriber)} className={styles.ghost} aria-label={`Remove ${subscriber.email}`}>
                      <Trash2 size={15} />
                    </button>
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
