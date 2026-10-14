import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminUsers } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import { formatPrice } from '../../utils/format.js'
import { ORDER_STATUS_LABELS as STATUS_LABELS, formatOrderDate } from '../../utils/order.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import styles from './UserDetail.module.css'

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    let active = true

    adminUsers
      .detail(id)
      .then((data) => active && setCustomer(data))
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [id])

  async function destroy() {
    setSaving(true)
    setError('')

    try {
      await adminUsers.remove(id)
      showToast(`${customer.name} was deleted.`)
      navigate('/admin/users', { replace: true })
    } catch (err) {
      setConfirming(false)
      setError(readError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  if (!customer) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error || 'Customer not found.'}</p>
        <Link to="/admin/users" className={styles.back}>
          Back to customers
        </Link>
      </div>
    )
  }

  const initial = customer.name?.trim()?.[0]?.toUpperCase() ?? '?'

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.avatar}>
            {customer.avatarUrl ? <img src={customer.avatarUrl} alt="" /> : <span>{initial}</span>}
          </span>
          <div>
            <h1 className={styles.title}>{customer.name}</h1>
            <p className={styles.joined}>
              Joined {formatOrderDate(customer.createdAt)}
            </p>
          </div>
        </div>

        <Link to="/admin/users" className={styles.back}>
          Back to customers
        </Link>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{customer.orderCount}</span>
          <span className={styles.statLabel}>Orders placed</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{formatPrice(customer.totalSpent)}</span>
          <span className={styles.statLabel}>Total spent</span>
        </div>
      </div>

      <section className={styles.card}>
        <h2 className={styles.sectionTitle}>Customer details</h2>

        <dl className={styles.details}>
          <dt>Email</dt>
          <dd>
            <a href={`mailto:${customer.email}`}>{customer.email}</a>
          </dd>

          <dt>Phone</dt>
          <dd>
            <a href={`tel:${customer.phone}`}>{customer.phone}</a>
          </dd>

          <dt>Status</dt>
          <dd>
            <span
              className={
                customer.isVerified
                  ? `${styles.badge} ${styles.badgeVerified}`
                  : `${styles.badge} ${styles.badgeUnverified}`
              }
            >
              {customer.isVerified ? 'Verified' : 'Unverified'}
            </span>
          </dd>
        </dl>

        <div className={styles.dangerZone}>
          {confirming ? (
            <span className={styles.confirmRow}>
              <button type="button" disabled={saving} onClick={destroy} className={styles.danger}>
                {saving ? 'Removing…' : 'Confirm delete'}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className={styles.ghost}>
                Cancel
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className={styles.danger}>
              Delete customer
            </button>
          )}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Order history</h2>

        {customer.orders.length === 0 ? (
          <Empty message="This customer hasn't placed any orders yet." />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Placed</th>
                  <th className={styles.numCol}>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/admin/orders/${order.id}`} className={styles.orderLink}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{formatOrderDate(order.createdAt)}</td>
                    <td className={styles.numCol}>{formatPrice(order.total)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[order.status]}`}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
