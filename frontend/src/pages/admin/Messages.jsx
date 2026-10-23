import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleCheck } from 'lucide-react'
import { adminMessages } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import FilterSelect from '../../components/FilterSelect.jsx'
import styles from './Products.module.css'

const LIMIT = 20

const STATUS_LABEL = {
  new: 'New',
  read: 'Read',
  replied: 'Replied'
}

function formatWhen(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function AdminMessagesPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
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

      const result = await adminMessages.list(params)
      setRows(result.data)
      setMeta(result.meta)
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Messages</h1>
          <p className={styles.subtitle}>
            {meta ? `${meta.total} message${meta.total === 1 ? '' : 's'}` : 'Loading'}
          </p>
        </div>
      </header>

      <div className={styles.filters}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email or message"
          className={styles.search}
        />

        <FilterSelect
          icon={CircleCheck}
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All messages' },
            { value: 'new', label: 'New' },
            { value: 'read', label: 'Read' },
            { value: 'replied', label: 'Replied' }
          ]}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading && <Loading />}

      {!loading && rows.length === 0 && <Empty message="No messages match these filters." />}

      {!loading && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>From</th>
                <th>Message</th>
                <th>Received</th>
                <th>Status</th>
                <th className={styles.actionCol} />
              </tr>
            </thead>

            <tbody>
              {rows.map((message) => (
                <tr key={message.id}>
                  <td>
                    <Link
                      to={`/admin/messages/${message.id}`}
                      className={styles.name}
                      style={message.status === 'new' ? { fontWeight: 700 } : undefined}
                    >
                      {message.name}
                    </Link>
                    <span className={styles.slug}>{message.email}</span>
                  </td>

                  <td style={{ maxWidth: 360 }}>
                    <span
                      style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {message.message}
                    </span>
                  </td>

                  <td className={styles.numCol}>{formatWhen(message.createdAt)}</td>

                  <td>
                    <span
                      className={
                        message.status === 'replied'
                          ? `${styles.badge} ${styles.badgeLive}`
                          : `${styles.badge} ${styles.badgeDraft}`
                      }
                    >
                      {STATUS_LABEL[message.status] ?? message.status}
                    </span>
                  </td>

                  <td className={styles.actionCol}>
                    <Link to={`/admin/messages/${message.id}`} className={styles.ghost}>
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
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className={styles.ghost}
          >
            Previous
          </button>

          <span className={styles.pagerLabel}>
            Page {meta.page} of {meta.pages}
          </span>

          <button
            type="button"
            disabled={page >= meta.pages}
            onClick={() => setPage((current) => current + 1)}
            className={styles.ghost}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
