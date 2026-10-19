import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Banknote, Smartphone, CreditCard, Check, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/cart-context.js';
import { useAuth } from '../context/auth-context.js';
import api, { readError } from '../api/client.js';
import { paymentsApi } from '../api/payments.js';
import { formatPrice, variantLabel } from '../utils/format.js';
import field from './Form.module.css';
import styles from './Checkout.module.css';

function methodCopy(value, methods) {
  if (value === 'cod') {
    return { icon: Banknote, title: 'Cash on delivery', description: 'Pay the courier when your order arrives.' };
  }
  if (value === 'momo') {
    return methods.momo?.provider === 'xentripay'
      ? { icon: Smartphone, title: 'MTN MoMo / Airtel Money', description: 'We send a payment prompt to your phone. Approve it and you are done.' }
      : { icon: Smartphone, title: 'MTN MoMo / Airtel Money', description: 'Send the total to our MoMo number. We confirm by hand.' };
  }
  return { icon: CreditCard, title: 'Visa or Mastercard', description: 'Secure card payment through XentriPay.' };
}

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [placed, setPlaced] = useState(false);
  const [values, setValues] = useState({
    customerName: user?.name ?? '',
    customerPhone: user?.phone ?? '',
    address: ''
  });
  const [methods, setMethods] = useState({ cod: true, momo: null, card: null });
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    paymentsApi
      .methods()
      .then((data) => active && setMethods(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (items.length === 0 && !placed) {
    return <Navigate to="/dashboard/cart" replace />;
  }

  const available = ['cod', ...(methods.momo ? ['momo'] : []), ...(methods.card ? ['card'] : [])];
  const momoPrompt = paymentMethod === 'momo' && methods.momo?.provider === 'xentripay';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const response = await api.post('/orders', {
        ...values,
        paymentMethod,
        items: items.map((item) => ({ productId: item.id, color: item.color, size: item.size, quantity: item.quantity }))
      });

      const { data: order, payment } = response.data;
      setPlaced(true);
      clearCart();

      if (payment?.method === 'card' && payment.checkoutUrl) {
        window.location.assign(payment.checkoutUrl);
        return;
      }

      navigate(`/dashboard/order/${order.orderNumber}`, { replace: true, state: { order, payment } });
    } catch (requestError) {
      setError(readError(requestError));
      setSubmitting(false);
    }
  };

  const submitLabel = submitting
    ? 'Placing your order…'
    : paymentMethod === 'card'
      ? 'Continue to card payment'
      : momoPrompt
        ? 'Send the payment prompt'
        : 'Place order';

  const feeNote = methods.customerPaysFee ? ' A small XentriPay service fee is added to the total when you pay.' : ''
  const note =
    paymentMethod === 'card'
      ? `You'll be taken to XentriPay's secure page to enter your card details.${feeNote}`
      : momoPrompt
        ? `A prompt for the total goes to the phone number above. Enter your MoMo PIN to approve it.${feeNote}`
        : paymentMethod === 'momo' && methods.momo
          ? `After you place the order we show you the MoMo number (${methods.momo.number}) and your order number to use as the reference.`
          : 'No payment is taken here. We confirm your order by phone and arrange payment with you.';

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
              <span className={field.hint}>
                {momoPrompt ? 'The payment prompt is sent to this number.' : 'We call this number to confirm your order.'}
              </span>
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
                {available.map((value) => {
                  const method = methodCopy(value, methods);
                  const active = paymentMethod === value;

                  return (
                    <label
                      key={value}
                      className={active ? `${styles.methodCard} ${styles.methodCardActive}` : styles.methodCard}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={value}
                        checked={active}
                        onChange={() => setPaymentMethod(value)}
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
                })}
              </div>
            </div>

            <button className={`btn ${styles.submit}`} type="submit" disabled={submitting}>
              {submitLabel}
            </button>
          </form>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Your order</h2>

          {items.map((item) => (
            <div className={styles.summaryRow} key={item.key}>
              <span className={styles.summaryName}>
                {item.name}{variantLabel(item) ? ` (${variantLabel(item)})` : ''} × {item.quantity}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}

          <div className={styles.totalRow}>
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>

          <p className={styles.note}>{note}</p>

          <div className={styles.trustRow}>
            <ShieldCheck size={16} />
            We never see or store your card number or MoMo PIN.
          </div>
        </div>
      </div>
    </div>
  );
}
