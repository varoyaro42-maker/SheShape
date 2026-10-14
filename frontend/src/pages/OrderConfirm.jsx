import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Banknote, Smartphone, CreditCard, Copy, Check, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
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
  card: ['Card', CreditCard]
};

const POLL_MS = 4000;
const POLL_LIMIT = 90; // six minutes

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
  const [paymentStatus, setPaymentStatus] = useState(location.state?.payment?.failedAt ? 'failed' : 'pending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!location.state?.order);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');
  const pollCount = useRef(0);

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
        if (response.data.payment?.failedAt) setPaymentStatus('failed');
      })
      .catch((requestError) => active && setError(readError(requestError)))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [orderNumber, order, payment]);

  // Online payments: keep asking until XentriPay says paid or failed.
  const online = order?.paymentProvider === 'xentripay';
  const waiting = online && order?.status === 'pending' && paymentStatus === 'pending';

  useEffect(() => {
    if (!waiting) return undefined;

    const timer = setInterval(async () => {
      pollCount.current += 1;
      try {
        const status = await paymentsApi.status(orderNumber);
        if (status.paymentStatus === 'paid') {
          setOrder((current) => (current ? { ...current, status: status.status, paidAt: status.paidAt } : current));
          clearInterval(timer);
        } else if (status.paymentStatus === 'failed') {
          setPaymentStatus('failed');
          clearInterval(timer);
        } else if (status.checkoutUrl) {
          setPayment((current) => ({ ...current, checkoutUrl: status.checkoutUrl }));
        }
      } catch {
        // A transient error should not stop the check.
      }
      if (pollCount.current >= POLL_LIMIT) clearInterval(timer);
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [waiting, orderNumber]);

  async function retry() {
    setRetrying(true);
    setRetryError('');
    try {
      const status = await paymentsApi.retry(orderNumber);
      pollCount.current = 0;
      if (status.paymentStatus === 'paid') {
        setOrder((current) => ({ ...current, status: status.status, paidAt: status.paidAt }));
      } else {
        setPayment((current) => ({ ...current, checkoutUrl: status.checkoutUrl, prompt: order.paymentMethod === 'momo' }));
        setPaymentStatus('pending');
        if (order.paymentMethod === 'card' && status.checkoutUrl) window.open(status.checkoutUrl, '_blank', 'noopener');
      }
    } catch (requestError) {
      setRetryError(readError(requestError));
    } finally {
      setRetrying(false);
    }
  }

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
  const pending = order.status === 'pending';
  const momoPrompt = online && order.paymentMethod === 'momo' && pending;
  const cardPending = online && order.paymentMethod === 'card' && pending;
  const failed = paymentStatus === 'failed';

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{momoPrompt && !failed ? 'Almost there' : heading}</h1>
      <p className={styles.subtitle}>{momoPrompt && !failed ? 'Approve the payment on your phone to finish.' : blurb}</p>

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

        {momoPrompt && !failed && (
          <div className={styles.instructions}>
            <h2 className={styles.instructionsTitle}>
              <Loader2 size={18} className={styles.spin} /> Waiting for your approval
            </h2>
            <ol className={styles.steps}>
              <li>
                A prompt for <strong>{formatPrice(order.total)}</strong> was sent to <strong>{order.customerPhone}</strong>.
              </li>
              <li>Enter your MoMo PIN on your phone to approve it.</li>
              <li>
                Nothing appeared? On MTN dial <strong>*182*7*1#</strong> <CopyButton value="*182*7*1#" /> to see pending approvals.
              </li>
            </ol>
            <p className={styles.payment}>This page updates by itself as soon as the payment clears.</p>
            <div className={styles.actions} style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={retry} disabled={retrying}>
                <RefreshCw size={14} />
                {retrying ? 'Sending…' : 'Send the prompt again'}
              </button>
            </div>
            {retryError && <p className={styles.errorText}>{retryError}</p>}
          </div>
        )}

        {cardPending && !failed && (
          <div className={styles.instructions}>
            <h2 className={styles.instructionsTitle}>Finish your card payment</h2>
            <p className={styles.payment}>
              This page updates by itself once XentriPay confirms your payment. If you closed the payment window, open it again below.
            </p>
            <div className={styles.actions} style={{ marginTop: 14 }}>
              {payment?.checkoutUrl && (
                <a href={payment.checkoutUrl} className="btn" target="_blank" rel="noopener noreferrer">
                  Open payment page
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          </div>
        )}

        {online && pending && failed && (
          <div className={`${styles.instructions} ${styles.instructionsWarn}`}>
            <h2 className={styles.instructionsTitle}>The payment didn't go through</h2>
            <p className={styles.payment}>
              {order.paymentMethod === 'momo'
                ? 'The prompt was declined, timed out, or the balance was too low. Your order is still reserved, so you can try again.'
                : 'The card payment was not completed. Your order is still reserved, so you can try again.'}
            </p>
            <div className={styles.actions} style={{ marginTop: 14 }}>
              <button type="button" className="btn" onClick={retry} disabled={retrying}>
                <RefreshCw size={15} />
                {retrying ? 'Trying…' : order.paymentMethod === 'momo' ? 'Send the prompt again' : 'Try the card payment again'}
              </button>
            </div>
            {retryError && <p className={styles.errorText}>{retryError}</p>}
            <p className={styles.payment} style={{ marginTop: 12 }}>
              Prefer to pay on delivery? Reply to your confirmation email or call us and we will switch the order for you.
            </p>
          </div>
        )}

        {order.paymentMethod === 'momo' && order.paymentProvider === 'manual' && pending && (
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

        {order.paymentMethod === 'cod' && (pending || order.status === 'paid') && (
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
