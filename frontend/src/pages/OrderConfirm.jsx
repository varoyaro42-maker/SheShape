import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Banknote, Smartphone, Globe, Copy, Check, ExternalLink } from 'lucide-react';
import api, { readError } from '../api/client.js';
import { paymentsApi } from '../api/payments.js';
import { formatPrice } from '../utils/format.js';
import { ORDER_STATUS_LABELS, formatOrderDate } from '../utils/order.js';
import Loading from '../components/Loading.jsx';
import Empty from '../components/Empty.jsx';
import styles from './Orders.module.css';

const HEADINGS = {
  pending: ['Thank you', "Your order is placed. Keep the number below, you'll need it to check on your order."],
  paid: ['Payment received', 'We have your payment. Your order is being prepared.'],
  shipped: ['On its way', 'Your order has left us. We will call you when it arrives.'],
  delivered: ['Delivered', 'Your order has been delivered. Thank you for shopping with She Shape.'],
  cancelled: ['Order cancelled', 'This order was cancelled. Nothing is owed. Call us if this is unexpected.']
};

const METHOD_LABEL = {
  cod: ['Cash on delivery', Banknote],
  momo: ['Mobile money', Smartphone],
  xentripay: ['Paid online', Globe]
};

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be unavailable; the value is still visible to copy by hand.
    }
  }

  return (
    <button type="button" onClick={copy} className={styles.copy} aria-label={`Copy ${value}`}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function OrderConfirm() {
  const { orderNumber } = useParams();
  const location = useLocation();

  const [order, setOrder] = useState(location.state?.order ?? null);
  const [payment, setPayment] = useState(location.state?.payment ?? null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!location.state?.order);

  useEffect(() => {
    if (order && payment) return undefined;

    let active = true;
    setLoading(true);
    setError('');

    api
      .get(`/orders/${orderNumber}`)
      .then((response) => {
        if (!active) return;
        setOrder(response.data.data);
        setPayment(response.data.payment ?? null);
      })
      .catch((requestError) => active && setError(readError(requestError)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [orderNumber, order, payment]);

  // Online payments: poll until the webhook or a status check marks the order paid.
  const awaitingOnline = order?.paymentMethod === 'xentripay' && order?.status === 'pending';

  useEffect(() => {
    if (!awaitingOnline) return undefined;

    let attempts = 0;
    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const status = await paymentsApi.status(orderNumber);
        if (status.status !== 'pending') {
          setOrder((current) => (current ? { ...current, status: status.status, paidAt: status.paidAt } : current));
          clearInterval(timer);
        }
      } catch {
        // Keep polling; a transient error should not stop the check.
      }
      if (attempts >= 36) clearInterval(timer);
    }, 5000);

    return () => clearInterval(timer);
  }, [awaitingOnline, orderNumber]);

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
  const [methodLabel, MethodIcon] = METHOD_LABEL[order.paymentMethod] ?? METHOD_LABEL.cod;
  const momo = payment?.momo;

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
              <MethodIcon size={13} />
              {methodLabel}
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

        {order.paymentMethod === 'momo' && order.status === 'pending' && (
          <div className={styles.instructions}>
            <h2 className={styles.instructionsTitle}>How to pay</h2>
            <ol className={styles.steps}>
              <li>
                Send <strong>{formatPrice(order.total)}</strong> by MTN MoMo or Airtel Money to{' '}
                {momo ? (
                  <>
                    <strong>{momo.number}</strong> ({momo.name}) <CopyButton value={momo.number} />
                  </>
                ) : (
                  <strong>the MoMo number in your confirmation email</strong>
                )}
              </li>
              <li>
                Use <strong>{order.orderNumber}</strong> as the reference <CopyButton value={order.orderNumber} />
              </li>
              <li>We confirm the payment by hand and email you. This can take a little while during the day.</li>
            </ol>
          </div>
        )}

        {awaitingOnline && (
          <div className={styles.instructions}>
            <h2 className={styles.instructionsTitle}>Finish your payment</h2>
            <p className={styles.payment}>
              This page updates by itself once XentriPay confirms your payment. If you closed the payment window,
              open it again below.
            </p>
            {payment?.checkoutUrl && (
              <a href={payment.checkoutUrl} className="btn" target="_blank" rel="noopener noreferrer">
                Open payment page
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        )}

        {order.paymentMethod === 'cod' && (order.status === 'pending' || order.status === 'paid') && (
          <p className={styles.payment}>
            No payment is needed now. We'll call you on the number you gave to confirm, and you pay the courier on
            delivery.
          </p>
        )}
      </div>

      <div className={styles.actions}>
        <Link className="btn" to="/dashboard/shop">
          Continue shopping
        </Link>
        <Link className="btn btn-outline" to="/dashboard/orders">
          My orders
        </Link>
      </div>
    </div>
  );
}
