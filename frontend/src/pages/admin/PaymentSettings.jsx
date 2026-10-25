import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { adminSettings } from '../../api/adminSettings.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import Loading from '../../components/Loading.jsx'
import styles from './ProductForm.module.css'

const BLANK = {
  momoNumber: '',
  momoName: '',
  xentripayEnabled: false,
  xentripayEnvironment: 'sandbox',
  xentripayChargesIncluded: true,
  xentripayApiKey: '',
  xentripayWebhookSecret: '',
  payoutNote: ''
}

export default function AdminPaymentSettingsPage() {
  const { showToast } = useToast()
  const [fields, setFields] = useState(BLANK)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function applyServer(data) {
    setFields((current) => ({
      ...current,
      momoNumber: data.momoNumber ?? '',
      momoName: data.momoName ?? '',
      xentripayEnabled: Boolean(data.xentripayEnabled),
      xentripayEnvironment: data.xentripayEnvironment ?? 'sandbox',
      xentripayChargesIncluded: data.xentripayChargesIncluded !== false,
      xentripayApiKey: '',
      xentripayWebhookSecret: '',
      payoutNote: data.payoutNote ?? ''
    }))
    setHasApiKey(Boolean(data.hasXentripayApiKey))
    setHasWebhookSecret(Boolean(data.hasXentripayWebhookSecret))
  }

  useEffect(() => {
    let active = true

    adminSettings
      .get()
      .then((data) => active && applyServer(data))
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  function set(field, value) {
    setFields((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const data = await adminSettings.update(fields)
      applyServer(data)
      showToast('Payment settings saved.')
    } catch (err) {
      setError(readError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  const webhookUrl = `${window.location.origin}/api/payments/xentripay/webhook`

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Payment settings</h1>
          <p className={styles.slug}>How customers pay for shop orders. Cash on delivery is always available.</p>
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={submit} className={styles.form} noValidate>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Mobile money (manual)</h2>
          <p className={styles.hint}>
            Used only while XentriPay is off. Customers send the total to this number and you mark the order paid
            by hand. Leave the number blank to hide this option at checkout.
          </p>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>MoMo number</span>
              <input
                type="tel"
                value={fields.momoNumber}
                onChange={(event) => set('momoNumber', event.target.value)}
                placeholder="078 000 0000"
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Registered name</span>
              <input
                type="text"
                value={fields.momoName}
                onChange={(event) => set('momoName', event.target.value)}
                placeholder="Name shown to customers"
                className={styles.input}
                maxLength={80}
              />
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>XentriPay (online payments)</h2>
          <p className={styles.hint}>
            When this is on, mobile money payments are collected as a prompt on the customer's phone and card
            payments open XentriPay's secure page. Create the API key in the XentriPay merchant dashboard
            (merchant.test.xentripay.com for sandbox, xentripay.com for live). Test in sandbox first.
          </p>

          <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
            <input
              type="checkbox"
              checked={fields.xentripayEnabled}
              onChange={(event) => set('xentripayEnabled', event.target.checked)}
              disabled={!hasApiKey && !fields.xentripayApiKey}
            />
            <span className={styles.label} style={{ margin: 0 }}>
              Offer online payment at checkout
            </span>
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Environment</span>
              <select
                value={fields.xentripayEnvironment}
                onChange={(event) => set('xentripayEnvironment', event.target.value)}
                className={styles.input}
              >
                <option value="sandbox">Sandbox (testing)</option>
                <option value="live">Live (real money)</option>
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>API key</span>
              <input
                type="password"
                value={fields.xentripayApiKey}
                onChange={(event) => set('xentripayApiKey', event.target.value)}
                placeholder={hasApiKey ? 'A key is saved. Leave blank to keep it.' : 'Paste the API key'}
                className={styles.input}
                autoComplete="off"
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Who pays the XentriPay fee</span>
            <select
              value={fields.xentripayChargesIncluded ? 'shop' : 'customer'}
              onChange={(event) => set('xentripayChargesIncluded', event.target.value === 'shop')}
              className={styles.input}
            >
              <option value="shop">We do: the customer pays exactly the order total</option>
              <option value="customer">The customer: XentriPay adds the fee on top</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Webhook signing secret</span>
            <input
              type="password"
              value={fields.xentripayWebhookSecret}
              onChange={(event) => set('xentripayWebhookSecret', event.target.value)}
              placeholder={hasWebhookSecret ? 'A secret is saved. Leave blank to keep it.' : 'The secretHash shown once when you register the webhook'}
              className={styles.input}
              autoComplete="off"
            />
            <span className={styles.hint}>
              Register this URL as a webhook in XentriPay for COLLECTION_SUCCESSFUL and COLLECTION_FAILED (payments
              in) and PAYOUT_SUCCESS, PAYOUT_FAILED, PAYOUT_REVERSED and SINGLEPAYOUTCREATEDPENDINGOTP (payouts), then
              paste the secret it returns here. Orders, tickets and payouts then update within seconds; without it
              the site still checks XentriPay directly.{' '}
              <code style={{ userSelect: 'all' }}>{webhookUrl}</code>
            </span>
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Payout notes</h2>

          <label className={styles.field}>
            <span className={styles.label}>Notes (visible to admins only)</span>
            <textarea
              value={fields.payoutNote}
              onChange={(event) => set('payoutNote', event.target.value)}
              rows={4}
              placeholder="e.g. XentriPay settles to Bank of Kigali account ending 1234 every Friday."
              className={styles.textarea}
            />
          </label>
        </section>

        <div className={styles.actions}>
          <button type="submit" disabled={saving} className={styles.primary}>
            <Check size={16} />
            {saving ? 'Saving' : 'Save settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
