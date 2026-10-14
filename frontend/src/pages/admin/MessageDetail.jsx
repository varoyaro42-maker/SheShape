import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import { adminMessages } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import { formatOrderDate } from '../../utils/order.js'
import Loading from '../../components/Loading.jsx'
import styles from './OrderDetail.module.css'
import formStyles from './ProductForm.module.css'

const STATUS_LABEL = {
  new: 'New',
  read: 'Read',
  replied: 'Replied'
}

export default function AdminMessageDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [reply, setReply] = useState('')

  useEffect(() => {
    let active = true

    adminMessages
      .detail(id)
      .then((data) => active && setMessage(data))
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [id])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSending(true)

    try {
      const updated = await adminMessages.reply(id, reply)
      showToast(`Reply sent to ${updated.email}.`)
      navigate('/admin/messages')
    } catch (err) {
      setError(readError(err))
    } finally {
      setSending(false)
    }
  }

  if (loading) return <Loading />

  if (!message) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error || 'Message not found.'}</p>
        <Link to="/admin/messages" className={styles.back}>
          Back to messages
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title} style={{ fontFamily: 'inherit' }}>
            {message.name}
          </h1>
          <p className={styles.placed}>
            {message.email} · {formatOrderDate(message.createdAt)}
          </p>
        </div>

        <Link to="/admin/messages" className={styles.back}>
          Back to messages
        </Link>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <section className={styles.card}>
        <div className={styles.statusRow}>
          <span className={`${styles.badge} ${styles[message.status] ?? ''}`}>
            {STATUS_LABEL[message.status] ?? message.status}
          </span>
        </div>

        <h2 className={styles.sectionTitle} style={{ marginTop: '1.25rem' }}>
          Their message
        </h2>
        <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.6 }}>{message.message}</p>
      </section>

      {message.status === 'replied' ? (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>
            Your reply
            {message.repliedBy?.name && (
              <span style={{ fontWeight: 400, color: 'var(--admin-muted)' }}> · {message.repliedBy.name}</span>
            )}
          </h2>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.6 }}>{message.replyMessage}</p>
          <p className={styles.placed} style={{ marginTop: '0.75rem' }}>
            Sent {formatOrderDate(message.repliedAt)}
          </p>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Reply by email</h2>
          <p className={formStyles.hint} style={{ marginBottom: '0.85rem' }}>
            This is sent straight to {message.email} — they'll get it as an email from She Shape.
          </p>

          <form onSubmit={submit}>
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={7}
              placeholder="Write your reply…"
              className={formStyles.textarea}
              required
            />

            <div className={formStyles.actions} style={{ marginTop: '1rem' }}>
              <button type="submit" disabled={sending} className={formStyles.primary}>
                <Send size={15} />
                {sending ? 'Sending…' : 'Send reply'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  )
}
