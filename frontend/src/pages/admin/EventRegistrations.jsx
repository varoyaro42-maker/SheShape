import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Download, Printer, UserPlus, X } from 'lucide-react'
import { adminEvents, formatEventDate, formatMoney } from '../../api/events.js'
import { readError } from '../../api/client.js'
import { useAuth } from '../../context/auth-context.js'
import { useToast } from '../../context/toast-context.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import Loading from '../../components/Loading.jsx'
import styles from './Orders.module.css'
import form from './ProductForm.module.css'
import ev from './AdminEvents.module.css'

const STATUS = {
  confirmed: ['Confirmed', 'delivered'],
  holding: ['Paying now', 'pending'],
  attention: ['Needs attention', 'shipped'],
  cancelled: ['Cancelled', 'cancelled'],
  expired: ['Expired', 'cancelled']
}

export default function AdminEventRegistrationsPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [event, setEvent] = useState(null)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 300)
  const [open, setOpen] = useState(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      const [e, r] = await Promise.all([adminEvents.get(id), adminEvents.registrations(id, { status: status || undefined, search: debounced || undefined })])
      setEvent(e)
      setRows(r)
    } catch (err) {
      setError(readError(err))
    }
  }, [id, status, debounced])

  useEffect(() => {
    load()
  }, [load])

  if (!event) return error ? <p className={styles.error}>{error}</p> : <Loading />
  const s = event.stats

  return (
    <div className={styles.page}>
      <header className={form.header}>
        <div>
          <Link to="/admin/events" className={form.back}>← Events</Link>
          <h1 className={styles.title}>{event.title}</h1>
          <p className={styles.subtitle}>{formatEventDate(event.date)} · <Link to={`/admin/events/${id}`}>Edit event</Link> · <a href={`/events/${event.slug}`} target="_blank" rel="noreferrer">View page</a></p>
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <div className={ev.stats}>
        <div className={ev.stat}><strong>{s.confirmed} / {event.totalPlaces}</strong><span>places confirmed</span></div>
        <div className={ev.stat}><strong>{s.placesLeft}</strong><span>places left</span></div>
        <div className={ev.stat}><strong>{s.holding}</strong><span>paying right now</span></div>
        {s.byStatus.attention > 0 && <div className={ev.stat} style={{ borderColor: '#f3d38b' }}><strong>{s.byStatus.attention}</strong><span>paid, need attention</span></div>}
      </div>

      {event.activities.length > 0 && (
        <div className={ev.bars}>
          {event.activities.filter((a) => a.visible).map((a) => (
            <div key={a.id} className={ev.barRow}>
              <span>{a.name}</span>
              <div className={ev.track}><div className={ev.fill} style={{ width: `${a.places ? Math.min(100, (a.confirmed / a.places) * 100) : 100}%` }} /></div>
              <span>{Math.max(0, a.places - a.confirmed)} left of {a.places}{a.held ? ` · ${a.held} paying` : ''}</span>
            </div>
          ))}
          {s.shortfall && (
            <p className={ev.warn}>
              {s.shortfall.womenLeft} places still to sell need {s.shortfall.needed} activity places for {event.picks} each, but only {s.shortfall.available} are left. Add places to the activities, or the last people will get fewer activities.
            </p>
          )}
        </div>
      )}

      <div className={ev.toolbar}>
        <input className={styles.search} placeholder="Search name, phone, email or ticket" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={form.input} style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All active</option>
          {Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <span className={ev.spacer} />
        <button type="button" className={form.smallButton} onClick={() => setAdding(true)}><UserPlus size={14} /> Add a guest</button>
        <Link to={`/admin/events/${id}/roster`} className={form.smallButton}><Printer size={14} /> Rosters</Link>
        <a href={adminEvents.exportUrl(id)} className={form.smallButton}><Download size={14} /> Export CSV</a>
      </div>

      {!rows ? <Loading /> : rows.length === 0 ? (
        <p className={styles.subtitle}>No registrations{search || status ? ' match' : ' yet'}.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Activities</th>
                <th>Status</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const [label, cls] = STATUS[r.status]
                return (
                  <tr key={r.id} onClick={() => setOpen(r.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div className={styles.name}>{r.name}{r.hasHealthNote && <span title="Has a health note" style={{ marginLeft: 6 }}>●</span>}</div>
                      <div className={styles.date}>{r.ticketNumber ? `${r.ticketNumber} · ` : ''}{r.phone}</div>
                    </td>
                    <td className={styles.date}>{r.activities.map((a) => a.name).join(', ') || '—'}</td>
                    <td><span className={`${styles.badge} ${styles[cls]}`}>{label}</span>{r.checkedInAt && <div className={styles.date}>Checked in</div>}</td>
                    <td className={styles.date}>{r.source === 'admin' ? 'Guest' : r.paymentReference || '—'}{r.paidAt && <div>{new Date(r.paidAt).toLocaleString('en-GB', { timeZone: 'Africa/Kigali' })}</div>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className={styles.subtitle} style={{ marginTop: 10 }}>● has a health note{user?.isClinical ? '' : ' (only admins with medical access can read it)'}.</p>

      {open && <RegistrationDrawer eventId={id} event={event} regId={open} onClose={() => setOpen(null)} onChanged={() => { load(); }} showToast={showToast} />}
      {adding && <AddGuest event={event} onClose={() => setAdding(false)} onAdded={() => { setAdding(false); showToast('Guest added. Her ticket was emailed.'); load() }} />}
    </div>
  )
}

function RegistrationDrawer({ eventId, event, regId, onClose, onChanged, showToast }) {
  const [reg, setReg] = useState(null)
  const [error, setError] = useState('')
  const [picks, setPicks] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    adminEvents.registration(eventId, regId).then((r) => { setReg(r); setPicks(r.activities.map((a) => a.id)) }).catch((err) => setError(readError(err)))
  }, [eventId, regId])

  const act = async (fn, message, close = false) => {
    setBusy(true)
    setError('')
    try {
      const out = await fn()
      showToast(message)
      onChanged()
      if (close) onClose()
      else if (out && out.id) setReg((current) => ({ ...current, ...out }))
      else setReg(await adminEvents.registration(eventId, regId))
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={ev.backdrop} onClick={onClose} />
      <aside className={ev.drawer} role="dialog" aria-label="Registration">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={form.sectionTitle} style={{ margin: 0 }}>{reg?.name ?? 'Registration'}</h2>
          <button type="button" className={ev.icon} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {!reg ? <Loading /> : (
          <>
            <dl className={ev.kv} style={{ marginTop: 12 }}>
              <div><dt>Status</dt><dd>{STATUS[reg.status][0]}</dd></div>
              {reg.ticketNumber && <div><dt>Ticket</dt><dd>{reg.ticketNumber}</dd></div>}
              <div><dt>Phone</dt><dd>{reg.phone}</dd></div>
              <div><dt>Email</dt><dd>{reg.email}</dd></div>
              <div><dt>Paid</dt><dd>{reg.source === 'admin' ? 'Guest (no payment)' : reg.paidAt ? `${formatMoney(reg.amount)} · ${reg.paymentReference ?? ''}` : 'Not paid'}</dd></div>
              {reg.checkedInAt && <div><dt>Checked in</dt><dd>{new Date(reg.checkedInAt).toLocaleString('en-GB', { timeZone: 'Africa/Kigali' })}</dd></div>}
              {reg.adminNote && <div><dt>Note</dt><dd>{reg.adminNote}</dd></div>}
              {reg.answers.map((a) => <div key={a.questionId}><dt>{a.label}</dt><dd>{a.value}</dd></div>)}
            </dl>

            {reg.hasHealthNote && (
              reg.health ? (
                <div className={ev.health}>
                  <strong>Health information</strong>
                  {reg.health.length === 0 ? <p>Deleted after the event.</p> : reg.health.map((h) => <p key={h.questionId}><b>{h.label}</b><br />{h.value}</p>)}
                </div>
              ) : (
                <p className={ev.health}>{reg.healthPurged ? 'Her health answers were deleted after the event.' : 'She left a health note. Only admins with medical access can read it.'}</p>
              )
            )}

            {['confirmed', 'holding'].includes(reg.status) && event.activities.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <span className={form.label}>Activities (choose up to {event.picks})</span>
                <div className={ev.chips} style={{ margin: '8px 0' }}>
                  {event.activities.filter((a) => a.visible || picks?.includes(a.id)).map((a) => {
                    const on = picks?.includes(a.id)
                    return (
                      <button key={a.id} type="button" className={`${ev.chip} ${on ? ev.chipOn : ''}`} onClick={() => setPicks((p) => (on ? p.filter((x) => x !== a.id) : p.length < event.picks ? [...p, a.id] : p))}>
                        {a.name} ({Math.max(0, a.places - a.confirmed)} left)
                      </button>
                    )
                  })}
                </div>
                <button type="button" className={form.smallButton} disabled={busy} onClick={() => act(() => adminEvents.changeActivities(eventId, regId, picks), 'Activities changed.')}>Save activities</button>
              </div>
            )}

            <div style={{ display: 'grid', gap: 8, marginTop: 20 }}>
              {reg.status === 'attention' && <button type="button" className={form.primary} disabled={busy} onClick={() => act(() => adminEvents.confirm(eventId, regId), 'Confirmed. Her ticket was emailed.')}>Give her the place and send the ticket</button>}
              {reg.status === 'confirmed' && <button type="button" className={form.smallButton} disabled={busy} onClick={() => act(() => adminEvents.resendTicket(eventId, regId), 'Ticket emailed again.')}>Email the ticket again</button>}
              {['confirmed', 'holding', 'attention'].includes(reg.status) && (
                <button type="button" className={`${form.smallButton} ${ev.danger}`} disabled={busy} onClick={() => window.confirm(`Cancel ${reg.name}'s registration? Her places go back to the pool. Refund her from your side.`) && act(() => adminEvents.cancel(eventId, regId), 'Registration cancelled.')}>Cancel registration</button>
              )}
              <button type="button" className={`${form.ghost} ${ev.danger}`} disabled={busy} onClick={() => window.confirm(`Delete everything about ${reg.name}? Use this only when she asks for her data to be erased. This cannot be undone.`) && act(() => adminEvents.erase(eventId, regId), 'Her data was deleted.', true)}>Delete all her data</button>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

function AddGuest({ event, onClose, onAdded }) {
  const [fields, setFields] = useState({ name: '', phone: '', email: '', activityIds: [], adminNote: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setFields((c) => ({ ...c, [k]: v }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await adminEvents.addRegistration(event.id, fields)
      onAdded()
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={ev.backdrop} onClick={onClose} />
      <aside className={ev.drawer} role="dialog" aria-label="Add a guest">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className={form.sectionTitle} style={{ margin: 0 }}>Add a guest</h2>
          <button type="button" className={ev.icon} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <p className={form.hint}>For a guest or a partner's place. It takes a place like any other, with no payment, and her ticket is emailed.</p>
        {error && <p className={styles.error}>{error}</p>}
        <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 10 }}>
          <label className={form.field}><span className={form.label}>Full name</span><input className={form.input} value={fields.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label className={form.field}><span className={form.label}>Phone</span><input className={form.input} value={fields.phone} onChange={(e) => set('phone', e.target.value)} /></label>
          <label className={form.field}><span className={form.label}>Email</span><input className={form.input} type="email" value={fields.email} onChange={(e) => set('email', e.target.value)} /></label>
          {event.activities.length > 0 && (
            <div>
              <span className={form.label}>Activities (up to {event.picks})</span>
              <div className={ev.chips} style={{ marginTop: 8 }}>
                {event.activities.filter((a) => a.visible).map((a) => {
                  const on = fields.activityIds.includes(a.id)
                  const left = Math.max(0, a.places - a.confirmed - a.held)
                  return (
                    <button key={a.id} type="button" disabled={!on && left === 0} className={`${ev.chip} ${on ? ev.chipOn : ''}`} onClick={() => set('activityIds', on ? fields.activityIds.filter((x) => x !== a.id) : fields.activityIds.length < event.picks ? [...fields.activityIds, a.id] : fields.activityIds)}>
                      {a.name} ({left} left)
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <label className={form.field}><span className={form.label}>Note (optional)</span><input className={form.input} value={fields.adminNote} onChange={(e) => set('adminNote', e.target.value)} placeholder="e.g. Tugende partner place" /></label>
          <button type="submit" className={form.primary} disabled={busy}>{busy ? 'Adding…' : 'Add and send ticket'}</button>
        </form>
      </aside>
    </>
  )
}
