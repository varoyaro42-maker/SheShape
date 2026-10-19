import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download } from 'lucide-react'
import { events, formatEventDate, formatMoney } from '../api/events.js'
import { readError } from '../api/client.js'
import Loading from '../components/Loading.jsx'
import styles from './Ticket.module.css'

export default function Ticket() {
  const { token } = useParams()
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')

  // After a card payment she lands here before the webhook may have arrived: keep checking.
  useEffect(() => {
    let stop = false
    let tries = 0
    const load = async () => {
      try {
        const data = await events.status(token)
        if (stop) return
        setTicket(data)
        tries += 1
        if (data.status === 'holding' && tries < 100) setTimeout(load, 3000)
      } catch (err) {
        if (!stop) setError(readError(err))
      }
    }
    load()
    return () => {
      stop = true
    }
  }, [token])

  if (error) return <div className={styles.page}><div className={styles.card}><p>{error}</p></div></div>
  if (!ticket) return <Loading />

  const e = ticket.event
  const time = e.startTime ? (e.endTime ? `${e.startTime} to ${e.endTime}` : `From ${e.startTime}`) : null

  if (ticket.status === 'holding') {
    return (
      <div className={styles.page}>
        <div className={`${styles.card} ${styles.center}`} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <h1 className={styles.title}>Confirming your payment</h1>
          <p>This usually takes a few seconds. Keep this page open; it updates by itself. Your ticket is also emailed to {ticket.email}.</p>
        </div>
      </div>
    )
  }

  if (ticket.status !== 'confirmed') {
    const paidButNoPlace = ticket.status === 'attention'
    return (
      <div className={styles.page}>
        <div className={`${styles.card} ${styles.center}`}>
          <h1 className={styles.title}>{paidButNoPlace ? 'We received your payment' : 'Your payment did not go through'}</h1>
          <p>
            {paidButNoPlace
              ? 'Your payment arrived after your places were released and they have since been taken. Our team will contact you today to sort it out, with a place or a full refund.'
              : 'No money was taken for this attempt and your places were released. You can register again.'}
          </p>
          {!paidButNoPlace && <Link to={`/events/${e.slug}#register`} className={styles.button}>Try again</Link>}
          {e.contactWhatsapp && <p className={styles.muted}>Questions: WhatsApp {e.contactWhatsapp}</p>}
        </div>
      </div>
    )
  }

  const show = ticket.show ?? {}
  const when = [show.date !== false ? formatEventDate(e.date) : null, show.time !== false ? time : null].filter(Boolean).join(' · ')
  const rows = [
    show.venue !== false && e.venue ? { label: 'Venue', value: e.venue, wide: true } : null,
    show.activities !== false && ticket.activities.length ? { label: ticket.activities.length > 1 ? 'Your activities' : 'Your activity', value: ticket.activities.join(', '), wide: true } : null,
    show.amount !== false && ticket.amount > 0 ? { label: 'Paid', value: formatMoney(ticket.amount) } : null,
    show.paymentReference !== false && ticket.paymentReference ? { label: 'Payment reference', value: ticket.paymentReference } : null,
  ].filter(Boolean)

  return (
    <div className={styles.page}>
      <article className={styles.ticket}>
        <header className={styles.head}>
          <img className={styles.logo} src="/brand/logo-white.svg" alt="She Shape Wellness" />
          <h1 className={styles.title}>{e.title}</h1>
          {when && <p className={styles.when}>{when}</p>}
        </header>
        <div className={styles.tear} aria-hidden="true" />
        <div className={styles.body}>
          <div className={styles.top}>
            <div>
              <p className={styles.label}>Ticket</p>
              <p className={styles.number}>{ticket.ticketNumber}</p>
              {show.name !== false && (
                <>
                  <p className={styles.label}>Name</p>
                  <p className={styles.name}>{ticket.name}</p>
                </>
              )}
            </div>
            <img className={styles.qr} src={ticket.qrUrl} alt={`QR code for ticket ${ticket.ticketNumber}`} width="132" height="132" />
          </div>
          {rows.length > 0 && (
            <dl className={styles.rows}>
              {rows.map((r) => (
                <div key={r.label} className={r.wide ? styles.wide : ''}>
                  <dt className={styles.label}>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {show.dressCode !== false && e.dressCode && (
            <div className={styles.dress}>
              <p className={styles.label}>Dress code</p>
              <p>{e.dressCode}</p>
            </div>
          )}
          {show.note !== false && e.ticketNote && (
            <div className={styles.note}>
              {e.ticketNote.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
          <p className={styles.entry}>
            Show the QR code at the entrance. One ticket admits one person.
            {show.contact !== false && e.contactWhatsapp ? <><br />Questions? WhatsApp {e.contactWhatsapp}</> : null}
          </p>
        </div>
      </article>
      <div className={styles.actions}>
        {ticket.pdfUrl && (
          <a className={styles.button} href={ticket.pdfUrl} download>
            <Download size={18} /> Download ticket (PDF)
          </a>
        )}
        <p className={styles.muted}>A copy was emailed to {ticket.email}.</p>
      </div>
    </div>
  )
}
