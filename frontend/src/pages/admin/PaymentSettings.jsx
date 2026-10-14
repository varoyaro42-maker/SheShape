import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { adminSettings } from '../../api/adminSettings.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import Loading from '../../components/Loading.jsx'
import styles from './ProductForm.module.css'

const BLANK = {
  stripeSecretKey: '',
  stripePublishableKey: '',
  stripeWebhookSecret: '',
  payoutNote: ''
}

export default function AdminPaymentSettingsPage() {
  const { showToast } = useToast()
  const [fields, setFields] = useState(BLANK)
  const [hasSecretKey, setHasSecretKey] = useState(false)
  const [hasWebhookSecret, setHasWebhookSecret] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    adminSettings
      .get()
      .then((data) => {
        if (!active) return
        setFields({
          stripeSecretKey: '',
          stripePublishableKey: data.stripePublishableKey ?? '',
          stripeWebhookSecret: '',
          payoutNote: data.payoutNote ?? ''
        })
        setHasSecretKey(data.hasSecretKey)
        setHasWebhookSecret(data.hasWebhookSecret)
      })
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
      setHasSecretKey(data.hasSecretKey)
      setHasWebhookSecret(data.hasWebhookSecret)
      setFields((current) => ({ ...current, stripeSecretKey: '', stripeWebhookSecret: '' }))
      showToast('Payment settings saved.')
    } catch (err) {
      setError(readError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Payment settings</h1>
          <p className={styles.slug}>Connect the Stripe account that should receive payments.</p>
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={submit} className={styles.form} noValidate>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Stripe API keys</h2>

          <label className={styles.field}>
            <span className={styles.label}>Publishable key</span>
            <input
              type="text"
              value={fields.stripePublishableKey}
              onChange={(event) => set('stripePublishableKey', event.target.value)}
              placeholder="pk_live_..."
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Secret key</span>
            <input
              type="password"
              value={fields.stripeSecretKey}
              onChange={(event) => set('stripeSecretKey', event.target.value)}
              placeholder={hasSecretKey ? 'A secret key is already saved — leave blank to keep it' : 'sk_live_...'}
              className={styles.input}
              autoComplete="off"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Webhook signing secret</span>
            <input
              type="password"
              value={fields.stripeWebhookSecret}
              onChange={(event) => set('stripeWebhookSecret', event.target.value)}
              placeholder={
                hasWebhookSecret ? 'A webhook secret is already saved — leave blank to keep it' : 'whsec_...'
              }
              className={styles.input}
              autoComplete="off"
            />
            <span className={styles.hint}>
              From your Stripe dashboard's webhook endpoint for payment_intent.succeeded events.
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
              placeholder="e.g. Payouts land in Bank of Kigali account ending 1234"
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
