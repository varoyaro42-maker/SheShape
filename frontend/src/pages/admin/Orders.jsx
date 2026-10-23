import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ListFilter } from 'lucide-react'
import { adminOrders } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { formatPrice } from '../../utils/format.js'
import { ORDER_STATUS_LABELS as STATUS_LABELS, formatOrderDate } from '../../utils/order.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import FilterSelect from '../../components/FilterSelect.jsx'
import styles from './Orders.module.css'

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled']
const LIMIT = 20

export default function AdminOrdersPage() {
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

      const [result, totals] = await Promise.all([
        adminOrders.list(params),
        adminOrders.counts()
      ])

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

  const total = counts
    ? STATUSES.reduce((sum, name) => sum + (counts[name] ?? 0), 0)
    : null

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Orders</h1>
        {meta && (
          <p className={styles.subtitle}>
            {meta.total} order{meta.total === 1 ? '' : 's'} shown
          </p>
        )}
      </header>

      <div className={styles.filters}>
        {counts && (
          <FilterSelect
            icon={ListFilter}
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: `All Status (${total})` },
              ...STATUSES.map((name) => ({
                value: name,
                label: `${STATUS_LABELS[name] ?? name} (${counts[name] ?? 0})`
              }))
            ]}
          />
        )}

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order number, name or phone"
          className={styles.search}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading && <Loading />}

      {!loading && rows.length === 0 && <Empty message="No orders match these filters." />}

      {!loading && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Placed</th>
                <th className={styles.numCol}>Items</th>
                <th className={styles.numCol}>Total</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link to={`/admin/orders/${order.id}`} className={styles.number}>
                      {order.orderNumber}
                    </Link>
                  </td>

                  <td>
                    <span className={styles.name}>{order.customerName}</span>
                    <span className={styles.phone}>{order.customerPhone}</span>
                  </td>

                  <td className={styles.date}>{formatOrderDate(order.createdAt)}</td>
                  <td className={styles.numCol}>{order.itemCount}</td>
                  <td className={styles.numCol}>{formatPrice(order.total)}</td>

                  <td>
                    <span className={`${styles.badge} ${styles[order.status]}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
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
