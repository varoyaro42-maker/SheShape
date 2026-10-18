import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

  return (
    <div className={styles.page}>
      <article className={styles.ticket}>
        <header className={styles.head}>
          <p className={styles.kicker}>Your ticket</p>
          <h1 className={styles.title}>{e.title}</h1>
          <p className={styles.number}>{ticket.ticketNumber}</p>
        </header>
        <div className={styles.body}>
          <img className={styles.qr} src={ticket.qrUrl} alt={`QR code for ticket ${ticket.ticketNumber}`} width="200" height="200" />
          <p className={styles.muted}>Show this code at the entrance.</p>
          <dl className={styles.rows}>
            <div><dt>Name</dt><dd>{ticket.name}</dd></div>
            <div><dt>Date</dt><dd>{formatEventDate(e.date)}</dd></div>
            {time && <div><dt>Time</dt><dd>{time}</dd></div>}
            {e.venue && <div><dt>Venue</dt><dd>{e.venue}</dd></div>}
            {ticket.activities.length > 0 && <div><dt>{ticket.activities.length > 1 ? 'Activities' : 'Activity'}</dt><dd>{ticket.activities.join(', ')}</dd></div>}
            {ticket.amount > 0 && <div><dt>Paid</dt><dd>{formatMoney(ticket.amount)}</dd></div>}
            {ticket.paymentReference && <div><dt>Reference</dt><dd>{ticket.paymentReference}</dd></div>}
          </dl>
          {e.dressCode && (
            <div className={styles.note}>
              <h2>Dress code</h2>
              <p>{e.dressCode}</p>
            </div>
          )}
          {e.ticketNote && (
            <div className={styles.note}>
              {e.ticketNote.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}
          <p className={styles.muted}>A copy was emailed to {ticket.email}.{e.contactWhatsapp ? ` Questions: WhatsApp ${e.contactWhatsapp}.` : ''}</p>
        </div>
      </article>
    </div>
  )
}
