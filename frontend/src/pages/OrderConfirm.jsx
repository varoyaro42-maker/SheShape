import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CreditCard, Banknote } from 'lucide-react';
import api, { readError } from '../api/client.js';
import { formatPrice } from '../utils/format.js';
import { ORDER_STATUS_LABELS, formatOrderDate } from '../utils/order.js';
import Loading from '../components/Loading.jsx';
import Empty from '../components/Empty.jsx';
import styles from './Orders.module.css';

const COD_NOTE =
  'Send your payment by MoMo to 0788 000 000, using your order number as the reference. We will call you to confirm before dispatch.';

const CARD_PENDING_NOTE =
  "We're confirming your card payment. This can take a minute — refresh this page if the status doesn't update.";

const HEADINGS = {
  pending: ['Thank you', "Your order is placed. Keep the number below — you'll need it to check on your order."],
  paid: ['Payment received', 'We have your payment. Your order is being prepared.'],
  shipped: ['On its way', 'Your order has left us. We will call you when it arrives.'],
  delivered: ['Delivered', 'Your order has been delivered. Thank you for shopping with She Shape.'],
  cancelled: ['Order cancelled', 'This order was cancelled. Nothing is owed. Call us if this is unexpected.']
};

export default function OrderConfirm() {
  const { orderNumber } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(location.state?.order ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!location.state?.order);

  useEffect(() => {
    if (order) return;

    let active = true;
    setLoading(true);
    setError('');

    api
      .get(`/orders/${orderNumber}`)
      .then((response) => active && setOrder(response.data.data))
      .catch((requestError) => active && setError(readError(requestError)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [orderNumber, order]);

  if (loading) return <Loading />;

  if (!order) {
    return (
      <div className={styles.page}>
        <Empty title="Order not found" message={error || `We couldn't find order ${orderNumber}.`}>
          <Link to="/dashboard/orders" className="btn">
            Back to my orders
          </Link>
        </Empty>
      </div>
    );
  }

  const [heading, blurb] = HEADINGS[order.status] ?? HEADINGS.pending;
  const isCard = order.paymentMethod === 'card';

  let paymentNote = null;
  if (isCard && order.status === 'pending') paymentNote = CARD_PENDING_NOTE;
  else if (!isCard && (order.status === 'pending' || order.status === 'paid')) paymentNote = COD_NOTE;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{heading}</h1>
      <p className={styles.subtitle}>{blurb}</p>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <div className={styles.number}>{order.orderNumber}</div>
            <div className={styles.date}>{formatOrderDate(order.createdAt)}</div>
          </div>
          <span className={styles.badgeGroup}>
            <span className={styles.methodBadge}>
              {isCard ? <CreditCard size={13} /> : <Banknote size={13} />}
              {isCard ? 'Paid by card' : 'Cash on delivery'}
            </span>
            <span className={styles.badge}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
          </span>
        </div>

        {order.items.map((item) => (
          <div className={styles.line} key={item.id}>
            <span className={styles.lineName}>
              {item.name} × {item.quantity}
            </span>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}

        <div className={styles.total}>
          <span>Total</span>
          <span>{formatPrice(order.total)}</span>
        </div>

        {paymentNote && <p className={styles.payment}>{paymentNote}</p>}
      </div>

      <div className={styles.actions}>
        <Link className="btn" to="/dashboard/shop">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
