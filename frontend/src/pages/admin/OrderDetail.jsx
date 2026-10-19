import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminOrders } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import { formatPrice, variantLabel } from '../../utils/format.js'
import { ORDER_STATUS_LABELS as STATUS_LABELS, formatOrderDate } from '../../utils/order.js'
import Loading from '../../components/Loading.jsx'
import styles from './OrderDetail.module.css'

const FORWARD = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
}

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const { showToast } = useToast()

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    adminOrders
      .detail(id)
      .then((data) => active && setOrder(data))
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [id])

  async function moveTo(status) {
    setSaving(true)
    setError('')

    try {
      const updated = await adminOrders.updateStatus(id, status)
      setOrder(updated)
      showToast(`Marked ${STATUS_LABELS[status] ?? status}.`)
    } catch (err) {
      setError(readError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  if (!order) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error || 'Order not found.'}</p>
        <Link to="/admin/orders" className={styles.back}>
          Back to orders
        </Link>
      </div>
    )
  }

  const next = FORWARD[order.status] ?? []

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{order.orderNumber}</h1>
          <p className={styles.placed}>Placed {formatOrderDate(order.createdAt)}</p>
        </div>

        <Link to="/admin/orders" className={styles.back}>
          Back to orders
        </Link>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.card}>
        <div className={styles.statusRow}>
          <span className={`${styles.badge} ${styles[order.status]}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>

          {next.length > 0 ? (
            <div className={styles.moves}>
              {next.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={saving}
                  onClick={() => moveTo(status)}
                  className={status === 'cancelled' ? styles.danger : styles.primary}
                >
                  Mark {STATUS_LABELS[status] ?? status}
                </button>
              ))}
            </div>
          ) : (
            <span className={styles.final}>This order is closed.</span>
          )}
        </div>
      </section>

      <div className={styles.columns}>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Customer</h2>

          <dl className={styles.details}>
            <dt>Name</dt>
            <dd>{order.customerName}</dd>

            <dt>Phone</dt>
            <dd>
              <a href={`tel:${order.customerPhone}`} className={styles.link}>
                {order.customerPhone}
              </a>
            </dd>

            <dt>Address</dt>
            <dd className={styles.address}>{order.address}</dd>

            <dt>Account</dt>
            <dd>{order.user ? order.user.email : 'Guest checkout'}</dd>
          </dl>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Items</h2>

          <ul className={styles.items}>
            {order.items.map((item) => (
              <li key={item.id} className={styles.item}>
                <div>
                  <span className={styles.itemName}>{item.name}</span>
                  {variantLabel(item) && <span className={styles.itemMeta}>{variantLabel(item)}</span>}
                  <span className={styles.itemMeta}>
                    {item.quantity} × {formatPrice(item.price)}
                  </span>
                </div>

                <span className={styles.itemTotal}>
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className={styles.total}>
            <span>Total</span>
            <strong>{formatPrice(order.total)}</strong>
          </div>
        </section>
      </div>
    </div>
  )
}
