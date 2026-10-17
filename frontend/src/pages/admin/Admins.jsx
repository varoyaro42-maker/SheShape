import { useCallback, useEffect, useState } from 'react'
import { Mail, RotateCw, ShieldOff, X } from 'lucide-react'
import { adminAdmins } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import { formatOrderDate } from '../../utils/order.js'
import Loading from '../../components/Loading.jsx'
import styles from './Orders.module.css'
import formStyles from './ProductForm.module.css'

export default function AdminAdminsPage() {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [fields, setFields] = useState({ email: '', name: '' })
  const [sending, setSending] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await adminAdmins.list())
    } catch (err) {
      setError(readError(err))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function invite(event) {
    event.preventDefault()
    setSending(true)
    setError('')
    try {
      await adminAdmins.invite(fields)
      showToast(`Invite sent to ${fields.email}.`)
      setFields({ email: '', name: '' })
      await load()
    } catch (err) {
      setError(readError(err))
    } finally {
      setSending(false)
    }
  }

  async function act(id, run, message) {
    setBusyId(id)
    setError('')
    try {
      await run()
      showToast(message)
      await load()
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusyId(null)
    }
  }

  if (!data && !error) return <Loading />

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Admins</h1>
          <p className={styles.subtitle}>People who can manage the website. Invite someone by email; they get a link to set their password.</p>
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={invite} className={formStyles.card} style={{ marginBottom: '1.5rem' }} noValidate>
        <h2 className={formStyles.sectionTitle}>Invite an admin</h2>
        <div className={formStyles.row}>
          <label className={formStyles.field} style={{ flex: '2 1 240px' }}>
            <span className={formStyles.label}>Email</span>
            <input
              type="email"
              required
              className={formStyles.input}
              value={fields.email}
              onChange={(event) => setFields((current) => ({ ...current, email: event.target.value }))}
              placeholder="name@sheshapewellness.com"
            />
          </label>
          <label className={formStyles.field} style={{ flex: '1 1 180px' }}>
            <span className={formStyles.label}>Name (optional)</span>
            <input
              type="text"
              className={formStyles.input}
              value={fields.name}
              maxLength={80}
              onChange={(event) => setFields((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
        </div>
        <div>
          <button type="submit" className="btn" disabled={sending || !fields.email.trim()}>
            <Mail size={16} />
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
        <p className={formStyles.hint}>The link works once and expires after 7 days. Someone who already has a customer account keeps it and signs in with their usual password.</p>
      </form>

      {data?.invites.length > 0 && (
        <>
          <h2 className={formStyles.sectionTitle} style={{ margin: '0 0 0.75rem' }}>Waiting to accept</h2>
          <div className={styles.tableWrap} style={{ marginBottom: '1.5rem' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Invited</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.invites.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.email}
                      {item.name && <div className={styles.date}>{item.name}</div>}
                    </td>
                    <td className={styles.date}>
                      {formatOrderDate(item.createdAt)}
                      {item.invitedBy && ` · by ${item.invitedBy}`}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${item.expired ? styles.cancelled : styles.pending}`}>{item.expired ? 'Expired' : 'Sent'}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      <button type="button" className={styles.ghost} disabled={busyId === item.id} onClick={() => act(item.id, () => adminAdmins.resend(item.id), `New link sent to ${item.email}.`)}>
                        <RotateCw size={14} /> Resend
                      </button>{' '}
                      <button type="button" className={styles.ghost} disabled={busyId === item.id} onClick={() => act(item.id, () => adminAdmins.revoke(item.id), 'Invite cancelled.')}>
                        <X size={14} /> Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className={formStyles.sectionTitle} style={{ margin: '0 0 0.75rem' }}>Current admins</h2>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Since</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.admins.map((person) => (
              <tr key={person.id}>
                <td>
                  {person.name}
                  {person.isYou && <span className={`${styles.badge} ${styles.delivered}`} style={{ marginLeft: 8 }}>You</span>}
                  {person.isOwner && <span className={`${styles.badge} ${styles.pending}`} style={{ marginLeft: 8 }}>Main account</span>}
                </td>
                <td>{person.email}</td>
                <td className={styles.date}>{formatOrderDate(person.createdAt)}</td>
                <td style={{ textAlign: 'right' }}>
                  {!person.isYou && !person.isOwner && (
                    <button
                      type="button"
                      className={styles.ghost}
                      disabled={busyId === person.id}
                      onClick={() => {
                        if (!window.confirm(`Remove admin access for ${person.email}? They keep a normal customer account.`)) return
                        act(person.id, () => adminAdmins.remove(person.id), `${person.email} is no longer an admin.`)
                      }}
                    >
                      <ShieldOff size={14} /> Remove admin
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
