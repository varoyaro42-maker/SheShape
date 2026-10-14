import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Trash2, ListFilter } from 'lucide-react'
import { adminUsers } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { formatPrice } from '../../utils/format.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import FilterSelect from '../../components/FilterSelect.jsx'
import styles from './Users.module.css'

const LIMIT = 20

export default function AdminUsersPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const [page, setPage] = useState(1)
  const [verified, setVerified] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 350)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = { page, limit: LIMIT }
      if (verified) params.verified = verified
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()

      const result = await adminUsers.list(params)
      setRows(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }, [page, verified, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [verified, debouncedSearch])

  async function destroy(customer) {
    setBusyId(customer.id)
    setError('')
    setNotice('')

    try {
      await adminUsers.remove(customer.id)
      setConfirmId(null)
      setNotice(`${customer.name} was removed.`)
      load()
    } catch (err) {
      setConfirmId(null)
      setError(readError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Customers</h1>
          <p className={styles.subtitle}>
            {meta ? `${meta.total} customer${meta.total === 1 ? '' : 's'}` : 'Loading'}
          </p>
        </div>
      </header>

      <div className={styles.filters}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email or phone"
          className={styles.search}
        />

        <FilterSelect
          icon={ListFilter}
          value={verified}
          onChange={setVerified}
          options={[
            { value: '', label: 'All customers' },
            { value: 'true', label: 'Verified only' },
            { value: 'false', label: 'Unverified only' }
          ]}
        />
      </div>

      {notice && <p className={styles.notice}>{notice}</p>}
      {error && <p className={styles.error}>{error}</p>}

      {loading && <Loading />}

      {!loading && rows.length === 0 && (
        <Empty message="No customers match these filters." />
      )}

      {!loading && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.avatarCol} />
                <th>Name</th>
                <th>Phone</th>
                <th>Joined</th>
                <th className={styles.numCol}>Orders</th>
                <th className={styles.numCol}>Total spent</th>
                <th>Status</th>
                <th className={styles.actionCol} />
              </tr>
            </thead>

            <tbody>
              {rows.map((customer) => {
                const busy = busyId === customer.id
                const initial = customer.name?.trim()?.[0]?.toUpperCase() ?? '?'

                return (
                  <tr key={customer.id} className={busy ? styles.busy : undefined}>
                    <td>
                      <span className={styles.avatar}>
                        {customer.avatarUrl ? (
                          <img src={customer.avatarUrl} alt="" />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </span>
                    </td>

                    <td>
                      <Link to={`/admin/users/${customer.id}`} className={styles.name}>
                        {customer.name}
                      </Link>
                      <span className={styles.email}>{customer.email}</span>
                    </td>

                    <td>{customer.phone}</td>
                    <td>{new Date(customer.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className={styles.numCol}>{customer.orderCount}</td>
                    <td className={styles.numCol}>{formatPrice(customer.totalSpent)}</td>

                    <td>
                      <span
                        className={
                          customer.isVerified
                            ? `${styles.badge} ${styles.badgeVerified}`
                            : `${styles.badge} ${styles.badgeUnverified}`
                        }
                      >
                        {customer.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>

                    <td className={styles.actionCol}>
                      {confirmId === customer.id ? (
                        <span className={styles.confirm}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => destroy(customer)}
                            className={styles.danger}
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            className={styles.ghost}
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <span className={styles.confirm}>
                          <Link
                            to={`/admin/users/${customer.id}`}
                            className={styles.iconGhost}
                            title="View customer"
                            aria-label="View customer"
                          >
                            <Eye size={15} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmId(customer.id)}
                            className={styles.iconGhost}
                            title="Delete customer"
                            aria-label="Delete customer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
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
