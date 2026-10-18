import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { adminEvents } from '../../api/events.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import HomeImageUploader from '../../components/HomeImageUploader.jsx'
import Loading from '../../components/Loading.jsx'
import styles from './ProductForm.module.css'
import tabs from './HomeSettings.module.css'
import ev from './AdminEvents.module.css'

const TABS = [
  ['details', 'Details'],
  ['activities', 'Activities'],
  ['form', 'Registration form'],
  ['page', 'Page & ticket'],
  ['settings', 'Places & dates']
]

const BLANK = {
  title: '', slug: '', ticketPrefix: '', tagline: '', description: '', poweredBy: 'Powered by She Shape Wellness',
  date: '', startTime: '', endTime: '', venue: '', price: 0, priceNote: '', totalPlaces: 50, picks: 2, picksLabel: '',
  opensAt: null, closesAt: null, status: 'draft', holdMinutes: 15, feePaidBy: 'organiser', healthRetentionDays: 30,
  fullMessage: '', closedMessage: '', heroImage: '', gallery: [], included: [], partners: [], dressCode: '', ticketNote: '',
  contactWhatsapp: '', contactInstagram: '', activities: [], questions: null
}

const TYPES = [
  ['text', 'Short answer'],
  ['longtext', 'Long answer'],
  ['choice', 'Choose one'],
  ['yesno', 'Yes / No'],
  ['consent', 'Tick to confirm']
]

// <input type="datetime-local"> works in the admin's own (Kigali) time.
const toLocal = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocal = (value) => (value ? new Date(value).toISOString() : null)
const move = (list, i, dir) => {
  const next = [...list]
  const j = i + dir
  if (j < 0 || j >= next.length) return next
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

function Field({ label, hint, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  )
}

export default function AdminEventEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tab, setTab] = useState('details')
  const [data, setData] = useState(isNew ? BLANK : null)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isNew) return
    adminEvents
      .get(id)
      .then((event) => {
        setData({ ...BLANK, ...event })
        setStats(event.stats)
      })
      .catch((err) => setError(readError(err)))
  }, [id, isNew])

  if (!data) return error ? <p className={styles.error}>{error}</p> : <Loading />

  const set = (key, value) => setData((current) => ({ ...current, [key]: value }))
  const setItem = (key, index, patch) => setData((current) => ({ ...current, [key]: current[key].map((x, i) => (i === index ? { ...x, ...patch } : x)) }))
  const removeItem = (key, index) => setData((current) => ({ ...current, [key]: current[key].filter((_, i) => i !== index) }))

  async function save(event) {
    event?.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...data }
      if (payload.questions === null) delete payload.questions
      delete payload.stats
      const saved = isNew ? await adminEvents.create(payload) : await adminEvents.update(id, payload)
      showToast(isNew ? 'Event created as a draft.' : 'Event saved.')
      if (isNew) navigate(`/admin/events/${saved.id}`, { replace: true })
      setData({ ...BLANK, ...saved })
      setStats(saved.stats)
    } catch (err) {
      setError(readError(err))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  async function duplicate() {
    try {
      const copy = await adminEvents.duplicate(id)
      showToast('Copy created as a draft.')
      navigate(`/admin/events/${copy.id}`)
    } catch (err) {
      setError(readError(err))
    }
  }

  const text = (key, props = {}) => <input className={styles.input} value={data[key] ?? ''} onChange={(e) => set(key, e.target.value)} {...props} />
  const area = (key, rows = 3, props = {}) => <textarea className={styles.textarea} rows={rows} value={data[key] ?? ''} onChange={(e) => set(key, e.target.value)} {...props} />
  const number = (key, props = {}) => <input className={styles.input} type="number" inputMode="numeric" value={data[key] ?? 0} onChange={(e) => set(key, e.target.value === '' ? '' : Number(e.target.value))} {...props} />

  const activityPlaces = data.activities.filter((a) => a.visible !== false).reduce((s, a) => s + (Number(a.places) || 0), 0)
  const needPlaces = (Number(data.totalPlaces) || 0) * (Number(data.picks) || 0)

  return (
    <div className={`${styles.page} ${tabs.page}`}>
      <header className={styles.header}>
        <div>
          <Link to="/admin/events" className={styles.back}>← Events</Link>
          <h1 className={styles.title}>{isNew ? 'New event' : data.title || 'Event'}</h1>
          {!isNew && (
            <p className={styles.slug}>
              <a href={`/events/${data.slug}`} target="_blank" rel="noreferrer">sheshapewellness.com/events/{data.slug} <ExternalLink size={12} /></a>
            </p>
          )}
        </div>
        {!isNew && (
          <div className={ev.headerActions}>
            <Link to={`/admin/events/${id}/registrations`} className={styles.smallButton}>Registrations{stats ? ` (${stats.confirmed})` : ''}</Link>
            <button type="button" className={styles.smallButton} onClick={duplicate}><Copy size={14} /> Copy for next year</button>
          </div>
        )}
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <div className={tabs.bar} role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? `${tabs.tab} ${tabs.active}` : tabs.tab} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={save} className={`${styles.form} ${ev.tabbed}`} noValidate>
        <section className={styles.card} hidden={tab !== 'details'}>
          <h2 className={styles.sectionTitle}>The event</h2>
          <Field label="Title">{text('title', { maxLength: 160, placeholder: 'Her Wellness Experience 2026' })}</Field>
          <Field label="Line above the title" hint="Optional, e.g. Powered by She Shape Wellness">{text('poweredBy', { maxLength: 120 })}</Field>
          <Field label="Short description" hint="Shown under the title.">{area('tagline', 2, { maxLength: 200 })}</Field>
          <Field label="More about the event" hint="Optional. Leave a blank line between paragraphs.">{area('description', 5)}</Field>
          <div className={styles.row}>
            <Field label="Date">{text('date', { type: 'date' })}</Field>
            <Field label="Arrival / start" hint="e.g. 9:30">{text('startTime', { maxLength: 20 })}</Field>
            <Field label="End" hint="e.g. 14:30">{text('endTime', { maxLength: 20 })}</Field>
          </div>
          <Field label="Venue">{text('venue', { maxLength: 200, placeholder: 'Mamba Sports Club, Kigali' })}</Field>
          <div className={styles.row}>
            <Field label="Ticket price (RWF)" hint="0 makes the event free.">{number('price', { min: 0 })}</Field>
            <Field label="Price note" hint="e.g. per person, brunch included">{text('priceNote', { maxLength: 120 })}</Field>
          </div>
          <div className={styles.row}>
            <Field label="WhatsApp for questions">{text('contactWhatsapp', { maxLength: 40, placeholder: '+250 781 141 576' })}</Field>
            <Field label="Instagram">{text('contactInstagram', { maxLength: 60, placeholder: 'sheshape_wellness' })}</Field>
          </div>
        </section>

        <section className={styles.card} hidden={tab !== 'activities'}>
          <h2 className={styles.sectionTitle}>Activities</h2>
          <div className={styles.row}>
            <Field label="Activities each person chooses" hint="If fewer activities still have space, she chooses those, at the same price. 0 means no choice.">{number('picks', { min: 0, max: 20 })}</Field>
            <Field label="Label" hint={`e.g. Choose your ${data.picks || 2} favourites`}>{text('picksLabel', { maxLength: 120 })}</Field>
          </div>
          {data.picks > 0 && needPlaces > activityPlaces && (
            <p className={ev.warn}>
              {data.totalPlaces} people × {data.picks} activities need {needPlaces} activity places; the activities below have {activityPlaces}. Late registrations will get fewer activities unless you add places.
            </p>
          )}
          <div className={ev.list}>
            {data.activities.map((a, i) => {
              const live = stats && data.activities[i]?.id ? data.activities[i] : null
              return (
                <div key={a.id ?? `new-${i}`} className={ev.item}>
                  <div className={ev.itemGrid}>
                    <Field label="Name"><input className={styles.input} value={a.name} onChange={(e) => setItem('activities', i, { name: e.target.value })} maxLength={120} /></Field>
                    <Field label="Led by"><input className={styles.input} value={a.ledBy ?? ''} onChange={(e) => setItem('activities', i, { ledBy: e.target.value })} maxLength={120} /></Field>
                    <Field label="Places"><input className={styles.input} type="number" min={0} value={a.places} onChange={(e) => setItem('activities', i, { places: e.target.value === '' ? '' : Number(e.target.value) })} /></Field>
                  </div>
                  <div className={ev.itemFoot}>
                    <label className={styles.toggle}><input type="checkbox" checked={a.visible !== false} onChange={(e) => setItem('activities', i, { visible: e.target.checked })} /><span>Show on the page</span></label>
                    {live && typeof live.confirmed === 'number' && <span className={ev.muted}>{live.confirmed} confirmed{live.held ? `, ${live.held} paying now` : ''}</span>}
                    <span className={ev.spacer} />
                    <button type="button" className={ev.icon} onClick={() => set('activities', move(data.activities, i, -1))} aria-label="Move up"><ArrowUp size={15} /></button>
                    <button type="button" className={ev.icon} onClick={() => set('activities', move(data.activities, i, 1))} aria-label="Move down"><ArrowDown size={15} /></button>
                    <button type="button" className={ev.icon} onClick={() => removeItem('activities', i)} aria-label="Remove"><Trash2 size={15} /></button>
                  </div>
                </div>
              )
            })}
          </div>
          <div><button type="button" className={styles.smallButton} onClick={() => set('activities', [...data.activities, { name: '', ledBy: '', places: 10, visible: true }])}><Plus size={14} /> Add an activity</button></div>
          <p className={styles.hint}>Removing an activity that people already chose hides it instead, so their tickets stay correct.</p>
        </section>

        <section className={styles.card} hidden={tab !== 'form'}>
          <h2 className={styles.sectionTitle}>Registration form</h2>
          <p className={styles.hint}>Name, phone and email are always asked. Add the other questions here.{data.questions === null ? ' A new event starts with our usual questions; save to see them, then edit.' : ''}</p>
          {data.questions !== null && (
            <div className={ev.list}>
              {data.questions.map((q, i) => (
                <div key={q.id ?? `q-${i}`} className={ev.item}>
                  <div className={ev.itemGrid2}>
                    <Field label="Question"><input className={styles.input} value={q.label} onChange={(e) => setItem('questions', i, { label: e.target.value })} maxLength={300} /></Field>
                    <Field label="Type">
                      <select className={styles.input} value={q.type} onChange={(e) => setItem('questions', i, { type: e.target.value, options: e.target.value === 'choice' ? (q.options?.length ? q.options : ['', '']) : [] })}>
                        {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </Field>
                  </div>
                  <Field label="Help line (optional)" hint={q.sensitive ? 'Say who will see the answer, e.g. our team and the health professionals only.' : null}>
                    <input className={styles.input} value={q.help ?? ''} onChange={(e) => setItem('questions', i, { help: e.target.value })} maxLength={400} />
                  </Field>
                  {q.type === 'choice' && (
                    <Field label="Options" hint="One per line.">
                      <textarea className={styles.textarea} rows={Math.max(3, q.options.length)} value={q.options.join('\n')} onChange={(e) => setItem('questions', i, { options: e.target.value.split('\n') })} />
                    </Field>
                  )}
                  <div className={ev.itemFoot}>
                    <label className={styles.toggle}><input type="checkbox" checked={q.required} onChange={(e) => setItem('questions', i, { required: e.target.checked })} /><span>Required</span></label>
                    <label className={styles.toggle}><input type="checkbox" checked={q.sensitive} onChange={(e) => setItem('questions', i, { sensitive: e.target.checked })} /><span>Health information (private)</span></label>
                    <span className={ev.spacer} />
                    <button type="button" className={ev.icon} onClick={() => set('questions', move(data.questions, i, -1))} aria-label="Move up"><ArrowUp size={15} /></button>
                    <button type="button" className={ev.icon} onClick={() => set('questions', move(data.questions, i, 1))} aria-label="Move down"><ArrowDown size={15} /></button>
                    <button type="button" className={ev.icon} onClick={() => removeItem('questions', i)} aria-label="Remove"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.questions !== null && (
            <div><button type="button" className={styles.smallButton} onClick={() => set('questions', [...data.questions, { label: '', help: '', type: 'text', options: [], required: false, sensitive: false }])}><Plus size={14} /> Add a question</button></div>
          )}
          <p className={styles.hint}>Health information answers are encrypted, visible only to admins with medical access, never emailed or exported, and deleted {data.healthRetentionDays} days after the event.</p>
        </section>

        <section className={styles.card} hidden={tab !== 'page'}>
          <h2 className={styles.sectionTitle}>Page</h2>
          <HomeImageUploader label="Main photo" value={data.heroImage} onChange={(url) => set('heroImage', url)} disabled={saving} hint="One strong photo, portrait works best." />
          <span className={styles.label}>Photo strip</span>
          <div className={ev.thumbs}>
            {data.gallery.map((g, i) => (
              <div key={i} className={ev.thumb}>
                <HomeImageUploader label={`Photo ${i + 1}`} value={g.imageUrl} onChange={(url) => (url ? setItem('gallery', i, { imageUrl: url }) : removeItem('gallery', i))} disabled={saving} />
              </div>
            ))}
          </div>
          <div><button type="button" className={styles.smallButton} onClick={() => set('gallery', [...data.gallery, { imageUrl: '', caption: '' }])}><Plus size={14} /> Add a photo</button></div>

          <Field label="Included for everyone" hint="One per line, e.g. Healthy brunch.">
            <textarea className={styles.textarea} rows={4} value={data.included.join('\n')} onChange={(e) => set('included', e.target.value.split('\n'))} />
          </Field>

          <span className={styles.label}>Partners</span>
          <p className={styles.hint}>Logos are shown together in white on green. Transparent PNGs work best.</p>
          <div className={ev.thumbs}>
            {data.partners.map((p, i) => (
              <div key={i} className={ev.thumb}>
                <HomeImageUploader contain label="Logo" value={p.imageUrl} onChange={(url) => setItem('partners', i, { imageUrl: url })} disabled={saving} />
                <input className={styles.input} placeholder="Name" value={p.name} onChange={(e) => setItem('partners', i, { name: e.target.value })} maxLength={80} />
                <button type="button" className={styles.ghost} onClick={() => removeItem('partners', i)}>Remove</button>
              </div>
            ))}
          </div>
          <div><button type="button" className={styles.smallButton} onClick={() => set('partners', [...data.partners, { name: '', imageUrl: '' }])}><Plus size={14} /> Add a partner</button></div>

          <h2 className={styles.sectionTitle}>Ticket email</h2>
          <Field label="Dress code" hint="Shown on the ticket and in the email.">{area('dressCode', 3)}</Field>
          <Field label="Other information for the ticket" hint="Programme, what to bring. Nothing private.">{area('ticketNote', 4)}</Field>
          <Field label="Ticket number prefix" hint="Letters only, e.g. HWE gives HWE-0001.">{text('ticketPrefix', { maxLength: 8 })}</Field>
        </section>

        <section className={styles.card} hidden={tab !== 'settings'}>
          <h2 className={styles.sectionTitle}>Places & dates</h2>
          <Field label="Status" hint="Draft: only admins can see it. Open: people can register. Closed: the page stays, registration stops.">
            <select className={styles.input} value={data.status} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Draft</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </Field>
          <div className={styles.row}>
            <Field label="Total places" hint="Registration closes when this many are confirmed.">{number('totalPlaces', { min: 0 })}</Field>
            <Field label="Hold while paying (minutes)" hint="Places are held this long while she pays.">{number('holdMinutes', { min: 5, max: 120 })}</Field>
          </div>
          <div className={styles.row}>
            <Field label="Registration opens" hint="Optional.">
              <input className={styles.input} type="datetime-local" value={toLocal(data.opensAt)} onChange={(e) => set('opensAt', fromLocal(e.target.value))} />
            </Field>
            <Field label="Registration closes" hint="Closes at this time or when full, whichever comes first.">
              <input className={styles.input} type="datetime-local" value={toLocal(data.closesAt)} onChange={(e) => set('closesAt', fromLocal(e.target.value))} />
            </Field>
          </div>
          <Field label="Link" hint="sheshapewellness.com/events/… (and sheshapewellness.com/… on its own).">{text('slug', { maxLength: 120 })}</Field>
          <Field label="Who pays the payment fee">
            <select className={styles.input} value={data.feePaidBy} onChange={(e) => set('feePaidBy', e.target.value)}>
              <option value="organiser">We do: she pays exactly the ticket price</option>
              <option value="customer">She does: the fee is added at payment</option>
            </select>
          </Field>
          <Field label="Message when fully booked">{area('fullMessage', 2, { placeholder: `${data.title || 'The event'} is fully booked. Follow @sheshape_wellness to hear about the next one.` })}</Field>
          <Field label="Message when registration is closed">{area('closedMessage', 2)}</Field>
          <Field label="Delete health answers after the event (days)">{number('healthRetentionDays', { min: 1 })}</Field>
        </section>

        <div className={`${styles.actions} ${tabs.saveBar}`}>
          <span className={tabs.saveNote}>Changes on every tab are saved together.</span>
          <button type="submit" className={styles.primary} disabled={saving}>
            <Check size={16} /> {saving ? 'Saving…' : isNew ? 'Create event' : 'Save event'}
          </button>
        </div>
      </form>
    </div>
  )
}
