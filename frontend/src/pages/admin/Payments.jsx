import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDownLeft, ArrowUpRight, Percent, RefreshCw, Send, Wallet } from 'lucide-react'
import { adminPayouts } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import { formatPrice } from '../../utils/format.js'
import { formatOrderDate } from '../../utils/order.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import styles from './Orders.module.css'
import formStyles from './ProductForm.module.css'
import statStyles from './Dashboard.module.css'

const BLANK = { providerId: '63510', account: '', name: '', amount: '', note: '' }
const STATUS_LABELS = { pending: 'Waiting', successful: 'Sent', failed: 'Failed', reversed: 'Reversed' }
const BADGE_CLASS = { pending: 'pending', successful: 'delivered', failed: 'cancelled', reversed: 'cancelled' }
const METHOD_LABELS = { momo: 'Mobile money', card: 'Card' }
const AMOUNT_STYLE = { fontSize: '1.35rem', whiteSpace: 'nowrap' }

export default function AdminPaymentsPage() {
  const { showToast } = useToast()
  const [summary, setSummary] = useState(null)
  const [payouts, setPayouts] = useState([])
  const [received, setReceived] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fields, setFields] = useState(BLANK)
  const [confirming, setConfirming] = useState(false)
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [checking, setChecking] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [totals, sent, incoming] = await Promise.all([adminPayouts.summary(), adminPayouts.list(), adminPayouts.received()])
      setSummary(totals)
      setPayouts(sent)
      setReceived(incoming)
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const providers = summary?.providers ?? []
  const provider = providers.find((p) => p.id === fields.providerId)
  const isBank = provider?.type === 'bank'
  const amount = Number(fields.amount)
  const overBalance = summary && amount > 0 && amount > summary.estimatedBalance

  const groups = useMemo(
    () => [
      { label: 'Mobile money', items: providers.filter((p) => p.type === 'momo') },
      { label: 'Banks', items: providers.filter((p) => p.type === 'bank') }
    ],
    [providers]
  )

  function set(field, value) {
    setFields((current) => ({ ...current, [field]: value }))
    setConfirming(false)
  }

  function review(event) {
    event.preventDefault()
    setFormError('')
    if (!fields.name.trim() || !fields.account.trim()) return setFormError('Fill in who receives the money and their number.')
    if (!Number.isInteger(amount) || amount < 100) return setFormError('Enter a whole amount of at least 100 RWF.')
    setConfirming(true)
  }

  async function send() {
    setSending(true)
    setFormError('')
    try {
      await adminPayouts.create({ ...fields, amount })
      showToast('Payout sent to XentriPay. Confirm it with the code XentriPay sends you.')
      setFields(BLANK)
      setConfirming(false)
      await load()
    } catch (err) {
      setFormError(readError(err))
      setConfirming(false)
      load()
    } finally {
      setSending(false)
    }
  }

  async function check(payout) {
    setChecking(payout.id)
    try {
      const fresh = await adminPayouts.refresh(payout.id)
      showToast(fresh.status === 'pending' ? 'Still waiting. Has the OTP been confirmed in XentriPay?' : `Payout ${STATUS_LABELS[fresh.status].toLowerCase()}.`)
      await load()
    } catch (err) {
      setError(readError(err))
    } finally {
      setChecking(null)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.page}>
      <header className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className={styles.title}>Payments</h1>
          <p className={styles.subtitle}>
            Money received online through XentriPay, and money sent out of it.
            {summary?.environment === 'sandbox' && ' XentriPay is set to sandbox (test) mode.'}
          </p>
        </div>
        <button type="button" onClick={load} className={formStyles.smallButton}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {summary && (
        <>
          <div className={statStyles.stats}>
            <div className={statStyles.statCard}>
              <div>
                <span className={statStyles.statValue} style={AMOUNT_STYLE}>{formatPrice(summary.received)}</span>
                <span className={statStyles.statLabel}>
                  {summary.count} successful payment{summary.count === 1 ? '' : 's'}
                </span>
              </div>
              <span className={`${statStyles.statIcon} ${statStyles.statIconGreen}`}>
                <ArrowDownLeft size={20} />
              </span>
            </div>
            <div className={statStyles.statCard}>
              <div>
                <span className={statStyles.statValue} style={AMOUNT_STYLE}>{formatPrice(summary.fees)}</span>
                <span className={statStyles.statLabel}>Deducted by XentriPay ({summary.feePercent}% fee)</span>
              </div>
              <span className={`${statStyles.statIcon} ${statStyles.statIconAmber}`}>
                <Percent size={20} />
              </span>
            </div>
            <div className={statStyles.statCard}>
              <div>
                <span className={statStyles.statValue} style={AMOUNT_STYLE}>{formatPrice(summary.paidOut + summary.waiting)}</span>
                <span className={statStyles.statLabel}>
                  Sent out{summary.waiting > 0 ? ` (${formatPrice(summary.waiting)} waiting for OTP)` : ''}
                </span>
              </div>
              <span className={`${statStyles.statIcon} ${statStyles.statIconBlue}`}>
                <ArrowUpRight size={20} />
              </span>
            </div>
            <div className={statStyles.statCard}>
              <div>
                <span className={statStyles.statValue} style={AMOUNT_STYLE}>{formatPrice(summary.estimatedBalance)}</span>
                <span className={statStyles.statLabel}>In the wallet</span>
              </div>
              <span className={`${statStyles.statIcon} ${statStyles.statIconPurple}`}>
                <Wallet size={20} />
              </span>
            </div>
          </div>
          <p className={formStyles.hint} style={{ marginTop: '0.75rem' }}>
            Successful payments only, after XentriPay's fee. Worked out from this website's records; the XentriPay
            dashboard has the official balance.
          </p>

          <h2 className={formStyles.sectionTitle} style={{ marginTop: '1.5rem' }}>Where the money came from</h2>
          {summary.bySource.length === 0 ? (
            <Empty message="No successful payments yet." />
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>From</th>
                    <th className={styles.numCol}>Payments</th>
                    <th className={styles.numCol}>Paid</th>
                    <th className={styles.numCol}>XentriPay fee</th>
                    <th className={styles.numCol}>You received</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.bySource.map((source) => (
                    <tr key={source.source}>
                      <td>
                        {source.eventId ? <Link to={`/admin/events/${source.eventId}/registrations`}>{source.label}</Link> : source.label}
                      </td>
                      <td className={styles.numCol}>{source.count}</td>
                      <td className={styles.numCol}>{formatPrice(source.amount)}</td>
                      <td className={styles.numCol}>{source.fee ? `− ${formatPrice(source.fee)}` : '—'}</td>
                      <td className={styles.numCol}>
                        <strong>{formatPrice(source.net)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <section className={formStyles.card} style={{ marginTop: '1.5rem' }}>
        <h2 className={formStyles.sectionTitle}>Send money</h2>
        {!summary?.ready ? (
          <p className={formStyles.hint}>
            XentriPay is not set up yet. Add the API key and switch it on in <Link to="/admin/settings">Payment settings</Link>.
          </p>
        ) : (
          <form onSubmit={review} className={formStyles.form} noValidate>
            <p className={formStyles.hint}>
              After you send, XentriPay emails or texts a one-time code (OTP) to the business account. The money only
              leaves once that code is confirmed in XentriPay.
            </p>

            <div className={formStyles.row}>
              <label className={formStyles.field}>
                <span className={formStyles.label}>Send to</span>
                <select value={fields.providerId} onChange={(event) => set('providerId', event.target.value)} className={formStyles.input}>
                  {groups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className={formStyles.field}>
                <span className={formStyles.label}>{isBank ? 'Account number' : 'Phone number'}</span>
                <input
                  type={isBank ? 'text' : 'tel'}
                  inputMode="numeric"
                  value={fields.account}
                  onChange={(event) => set('account', event.target.value)}
                  placeholder={isBank ? 'Digits only' : '078 000 0000'}
                  className={formStyles.input}
                />
              </label>
            </div>

            <div className={formStyles.row}>
              <label className={formStyles.field}>
                <span className={formStyles.label}>{isBank ? 'Account holder name' : 'Name on the number'}</span>
                <input type="text" value={fields.name} onChange={(event) => set('name', event.target.value)} maxLength={120} className={formStyles.input} />
              </label>

              <label className={formStyles.field}>
                <span className={formStyles.label}>Amount (RWF)</span>
                <input
                  type="number"
                  min="100"
                  step="1"
                  value={fields.amount}
                  onChange={(event) => set('amount', event.target.value)}
                  className={formStyles.input}
                />
              </label>
            </div>

            <label className={formStyles.field}>
              <span className={formStyles.label}>What is it for? (admins only)</span>
              <input
                type="text"
                value={fields.note}
                onChange={(event) => set('note', event.target.value)}
                maxLength={300}
                placeholder="e.g. Coach fees, October"
                className={formStyles.input}
              />
            </label>

            {overBalance && (
              <p className={formStyles.hint}>This is more than the estimated balance. XentriPay will refuse it if the wallet does not have enough.</p>
            )}
            {formError && <p className={formStyles.error}>{formError}</p>}

            {confirming ? (
              <div className={formStyles.card} style={{ background: 'var(--admin-bg, #f6f7f5)' }}>
                <p style={{ margin: 0 }}>
                  Send <strong>{formatPrice(amount)}</strong> to <strong>{fields.name.trim()}</strong>, {provider?.name}{' '}
                  {fields.account.trim()}? XentriPay adds its fee on top.
                </p>
                <div className={formStyles.actions}>
                  <button type="button" onClick={() => setConfirming(false)} className={formStyles.smallButton} disabled={sending}>
                    Back
                  </button>
                  <button type="button" onClick={send} className={formStyles.primary} disabled={sending}>
                    <Send size={15} />
                    {sending ? 'Sending' : 'Yes, send it'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={formStyles.actions}>
                <button type="submit" className={formStyles.primary}>
                  <Send size={15} />
                  Review payout
                </button>
              </div>
            )}
          </form>
        )}
      </section>

      <h2 className={formStyles.sectionTitle} style={{ marginTop: '2rem' }}>Money sent out</h2>
      {payouts.length === 0 ? (
        <Empty message="No payouts yet." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>To</th>
                <th>For</th>
                <th>Status</th>
                <th className={styles.numCol}>Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.id}>
                  <td className={styles.date}>{formatOrderDate(payout.createdAt)}</td>
                  <td>
                    <span className={styles.name}>{payout.validatedName || payout.name}</span>
                    <br />
                    <span className={styles.phone}>
                      {payout.providerName} · {payout.account}
                    </span>
                  </td>
                  <td>
                    {payout.note || '—'}
                    {payout.createdBy?.name && <span className={styles.phone}> · by {payout.createdBy.name}</span>}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles[BADGE_CLASS[payout.status]]}`}>{STATUS_LABELS[payout.status] ?? payout.status}</span>
                    {payout.status !== 'successful' && payout.statusMessage && <div className={styles.phone}>{payout.statusMessage}</div>}
                  </td>
                  <td className={styles.numCol}>
                    {formatPrice(payout.amount)}
                    {payout.charge ? <div className={styles.phone}>+ {formatPrice(payout.charge)} fee</div> : null}
                  </td>
                  <td className={styles.numCol}>
                    {payout.status === 'pending' && (
                      <button type="button" onClick={() => check(payout)} disabled={checking === payout.id} className={styles.ghost}>
                        {checking === payout.id ? 'Checking' : 'Check status'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className={formStyles.sectionTitle} style={{ marginTop: '2rem' }}>Every successful payment</h2>
      {received.length === 0 ? (
        <Empty message="No online payments yet." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Paid by</th>
                <th>For</th>
                <th>Paid with</th>
                <th className={styles.numCol}>Paid</th>
                <th className={styles.numCol}>Fee</th>
                <th className={styles.numCol}>You received</th>
              </tr>
            </thead>
            <tbody>
              {received.map((row) => (
                <tr key={`${row.kind}-${row.id}`}>
                  <td className={styles.date}>{formatOrderDate(row.paidAt)}</td>
                  <td>
                    <span className={styles.name}>{row.name}</span>
                    {row.phone && <div className={styles.phone}>{row.phone}</div>}
                  </td>
                  <td>
                    <Link to={row.kind === 'order' ? `/admin/orders/${row.id}` : `/admin/events/${row.eventId}/registrations`}>{row.sourceLabel}</Link>
                    <div className={styles.phone}>{row.label}</div>
                  </td>
                  <td>{METHOD_LABELS[row.method] ?? row.method}</td>
                  <td className={styles.numCol}>{formatPrice(row.amount)}</td>
                  <td className={styles.numCol}>{row.fee ? `− ${formatPrice(row.fee)}` : '—'}</td>
                  <td className={styles.numCol}>{formatPrice(row.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
