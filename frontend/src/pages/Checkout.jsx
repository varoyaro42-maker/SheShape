import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Banknote, CreditCard, Check, ShieldCheck, ChevronLeft } from 'lucide-react';
import { useCart } from '../context/cart-context.js';
import { useAuth } from '../context/auth-context.js';
import api, { readError } from '../api/client.js';
import { paymentsApi } from '../api/payments.js';
import { formatPrice } from '../utils/format.js';
import CardPaymentForm from '../components/CardPaymentForm.jsx';
import field from './Form.module.css';
import styles from './Checkout.module.css';

const PAYMENT_METHODS = [
  {
    value: 'cod',
    icon: Banknote,
    title: 'Cash on delivery',
    description: 'Pay in cash when your order arrives.'
  },
  {
    value: 'card',
    icon: CreditCard,
    title: 'Pay by card',
    description: 'Visa, Mastercard and more, secured by Stripe.'
  }
];

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const placed = useRef(false);
  const stripePromiseRef = useRef(null);

  const [values, setValues] = useState({
    customerName: user?.name ?? '',
    customerPhone: user?.phone ?? '',
    address: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [publishableKey, setPublishableKey] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(null);

  useEffect(() => {
    let active = true;
    paymentsApi
      .publishableKey()
      .then((key) => active && setPublishableKey(key))
      .catch(() => active && setPublishableKey(null));
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0 && !placed.current) {
    return <Navigate to="/dashboard/cart" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const goToConfirmation = (order) => {
    placed.current = true;
    clearCart();
    navigate(`/dashboard/order/${order.orderNumber}`, { replace: true, state: { order } });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/orders', {
        ...values,
        paymentMethod,
        items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
      });

      const { data: order, clientSecret } = response.data;

      if (paymentMethod === 'card' && clientSecret) {
        if (!stripePromiseRef.current) {
          stripePromiseRef.current = loadStripe(publishableKey);
        }
        setPendingPayment({ order, clientSecret });
        setSubmitting(false);
      } else {
        goToConfirmation(order);
      }
    } catch (requestError) {
      setError(readError(requestError));
      setSubmitting(false);
    }
  };

  if (pendingPayment) {
    return (
      <div className={styles.page}>
        <button type="button" onClick={() => setPendingPayment(null)} className={styles.backLink}>
          <ChevronLeft size={16} />
          Back to delivery details
        </button>

        <h1 className={styles.title}>Complete your payment</h1>

        <div className={styles.layout}>
          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Pay {formatPrice(pendingPayment.order.total)}</h2>
            <CardPaymentForm
              stripePromise={stripePromiseRef.current}
              clientSecret={pendingPayment.clientSecret}
              onSuccess={() => goToConfirmation(pendingPayment.order)}
              onError={setError}
            />
            {error && <p className={field.error}>{error}</p>}
          </div>

          <div className={styles.panel}>
            <h2 className={styles.panelTitle}>Order {pendingPayment.order.orderNumber}</h2>

            {items.map((item) => (
              <div className={styles.summaryRow} key={item.id}>
                <span className={styles.summaryName}>
                  {item.name} × {item.quantity}
                </span>
                <span>{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}

            <div className={styles.totalRow}>
              <span>Total</span>
              <span>{formatPrice(pendingPayment.order.total)}</span>
            </div>

            <div className={styles.trustRow}>
              <ShieldCheck size={16} />
              256-bit encrypted checkout — your card details never touch our servers.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Checkout</h1>

      <div className={styles.layout}>
        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Delivery details</h2>

          <form className={field.form} onSubmit={handleSubmit} noValidate>
            {error && <p className={field.error}>{error}</p>}

            <div className={field.field}>
              <label className={field.label} htmlFor="customerName">
                Full name
              </label>
              <input
                className={field.input}
                id="customerName"
                name="customerName"
                type="text"
                autoComplete="name"
                value={values.customerName}
                onChange={handleChange}
                required
              />
            </div>

            <div className={field.field}>
              <label className={field.label} htmlFor="customerPhone">
                Phone
              </label>
              <input
                className={field.input}
                id="customerPhone"
                name="customerPhone"
                type="tel"
                autoComplete="tel"
                placeholder="0788 123 456"
                value={values.customerPhone}
                onChange={handleChange}
                required
              />
              <span className={field.hint}>We call this number to confirm your order.</span>
            </div>

            <div className={field.field}>
              <label className={field.label} htmlFor="address">
                Delivery address
              </label>
              <textarea
                className={field.input}
                id="address"
                name="address"
                rows={3}
                value={values.address}
                onChange={handleChange}
                required
              />
              <span className={field.hint}>Street, district, and a landmark if it helps.</span>
            </div>

            <div className={field.field}>
              <span className={field.label}>Payment method</span>
              <div className={styles.methodGrid}>
                {PAYMENT_METHODS.filter((method) => method.value !== 'card' || publishableKey).map(
                  (method) => {
                    const active = paymentMethod === method.value;

                    return (
                      <label
                        key={method.value}
                        className={active ? `${styles.methodCard} ${styles.methodCardActive}` : styles.methodCard}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={active}
                          onChange={() => setPaymentMethod(method.value)}
                          className={styles.methodInput}
                        />
                        <span className={styles.methodIcon}>
                          <method.icon size={20} />
                        </span>
                        <span className={styles.methodBody}>
                          <span className={styles.methodTitle}>{method.title}</span>
                          <span className={styles.methodDesc}>{method.description}</span>
                        </span>
                        {active && (
                          <span className={styles.methodCheck}>
                            <Check size={13} />
                          </span>
                        )}
                      </label>
                    );
                  }
                )}
              </div>
            </div>

            <button className={`btn ${styles.submit}`} type="submit" disabled={submitting}>
              {submitting
                ? 'Placing your order…'
                : paymentMethod === 'card'
                  ? 'Continue to payment'
                  : 'Place order'}
            </button>
          </form>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Your order</h2>

          {items.map((item) => (
            <div className={styles.summaryRow} key={item.id}>
              <span className={styles.summaryName}>
                {item.name} × {item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className={styles.totalRow}>
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          <p className={styles.note}>
            {paymentMethod === 'card'
              ? "You'll enter your card details on the next step."
              : 'No payment is taken here. We confirm your order by phone and arrange payment with you.'}
          </p>
        </div>
      </div>
    </div>
  );
}
