import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi.js';
import { formatPrice, variantLabel } from '../utils/format.js';
import { ORDER_STATUS_LABELS, formatOrderDate } from '../utils/order.js';
import Loading from '../components/Loading.jsx';
import Empty from '../components/Empty.jsx';
import styles from './Orders.module.css';

export default function MyOrders() {
  const { data, loading, error } = useApi('/orders/my');

  if (loading) return <Loading />;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Your orders</h1>
      <p className={styles.subtitle}>Everything you&apos;ve ordered, newest first.</p>

      {error && <p>{error}</p>}

      {!error && data?.length === 0 && (
        <Empty message="You haven't ordered anything yet.">
          <Link className="btn" to="/dashboard/shop">
            Start shopping
          </Link>
        </Empty>
      )}

      {data?.map((order) => (
        <div className={styles.card} key={order.id}>
          <div className={styles.cardHead}>
            <div>
              <Link className={styles.number} to={`/dashboard/order/${order.orderNumber}`}>
                {order.orderNumber}
              </Link>
              <div className={styles.date}>{formatOrderDate(order.createdAt)}</div>
            </div>
            <span className={styles.badge}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
          </div>

          {order.items.map((item) => (
            <div className={styles.line} key={item.id}>
              <span className={styles.lineName}>
                {item.name}{variantLabel(item) ? ` (${variantLabel(item)})` : ''} × {item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className={styles.total}>
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
