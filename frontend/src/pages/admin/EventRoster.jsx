import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { adminEvents, formatEventDate } from '../../api/events.js'
import { readError } from '../../api/client.js'
import Loading from '../../components/Loading.jsx'
import styles from './Orders.module.css'
import form from './ProductForm.module.css'
import ev from './AdminEvents.module.css'

/** One list per activity, to print and hand to each coach on the morning. */
export default function AdminEventRosterPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminEvents.roster(id).then(setData).catch((err) => setError(readError(err)))
  }, [id])

  if (!data) return error ? <p className={styles.error}>{error}</p> : <Loading />

  return (
    <div className={styles.page}>
      <header className={`${form.header} ${ev.noPrint}`}>
        <div>
          <Link to={`/admin/events/${id}/registrations`} className={form.back}>← Registrations</Link>
          <h1 className={styles.title}>Rosters</h1>
        </div>
        <button type="button" className={form.primary} onClick={() => window.print()}><Printer size={16} /> Print</button>
      </header>
      {data.groups.map((g) => (
        <section key={g.id} style={{ breakInside: 'avoid', marginBottom: 28 }}>
          <h2 className={form.sectionTitle}>{g.name}{g.ledBy ? ` · ${g.ledBy}` : ''}</h2>
          <p className={styles.subtitle}>{data.event.title} · {formatEventDate(data.event.date)} · {g.people.length} of {g.places}</p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Ticket</th><th>Here</th></tr></thead>
              <tbody>
                {g.people.map((p, i) => (
                  <tr key={p.ticketNumber ?? i}><td>{i + 1}</td><td>{p.name}{p.hasHealthNote ? ' ●' : ''}</td><td>{p.phone}</td><td>{p.ticketNumber}</td><td>☐</td></tr>
                ))}
                {g.people.length === 0 && <tr><td colSpan={5} className={styles.date}>Nobody yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      <p className={styles.subtitle}>● has a health note: check with the medical team before the session.</p>
    </div>
  )
}
