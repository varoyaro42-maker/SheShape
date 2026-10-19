import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { events, formatEventDate, formatMoney } from '../api/events.js'
import { readError } from '../api/client.js'
import Loading from '../components/Loading.jsx'
import NotFound from './NotFound.jsx'
import { MomoBadges, CardBadges } from '../components/PaymentBadges.jsx'
import styles from './EventPage.module.css'

const blankForm = { name: '', phone: '', email: '', answers: {}, activityIds: [], paymentMethod: 'momo' }
const storageKey = (slug) => `event-form:${slug}`

// What she typed survives a failed payment, a refresh or the card redirect.
function loadSaved(slug) {
  try {
    return { ...blankForm, ...JSON.parse(sessionStorage.getItem(storageKey(slug)) || '{}') }
  } catch {
    return blankForm
  }
}

function useEvent(slug) {
  const [event, setEvent] = useState(null)
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const data = await events.get(slug)
      setEvent(data)
      return data
    } catch (err) {
      if (err.response?.status === 404) setMissing(true)
      else setLoadError(readError(err))
      return null
    }
  }, [slug])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { event, missing, loadError, refresh }
}

/** The line that nudges her to book: louder as places run out. */
function urgencyText(left, total) {
  if (left <= 5) return `Only ${left === 1 ? '1 place' : `${left} places`} left. Reserve yours now before they are gone.`
  if (left / total <= 0.3) return `Places are going fast: only ${left} left. Reserve yours today.`
  return 'Places are limited. Reserve yours today: it takes two minutes.'
}

function placesText(left) {
  if (left <= 0) return 'Full'
  return left === 1 ? '1 place left' : `${left} places left`
}

export default function EventPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { event, missing, loadError, refresh } = useEvent(slug)
  const [form, setForm] = useState(() => loadSaved(slug))
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [waiting, setWaiting] = useState(null)
  const formRef = useRef(null)
  const registerRef = useRef(null)
  const [formInView, setFormInView] = useState(false)
  const refreshedOnFocus = useRef(false)

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(slug), JSON.stringify(form))
    } catch {
      // private mode: nothing to keep
    }
  }, [form, slug])

  const openActivities = useMemo(() => (event?.activities ?? []).filter((a) => a.left > 0), [event])
  const needed = event ? Math.min(event.picks, openActivities.length) : 0

  // Drop picks that have filled since she chose them.
  useEffect(() => {
    if (!event) return
    setForm((current) => {
      const keep = current.activityIds.filter((id) => openActivities.some((a) => a.id === id))
      return keep.length === current.activityIds.length ? current : { ...current, activityIds: keep }
    })
  }, [event, openActivities])

  // Hide the phone "Register" bar once the form is on screen.
  useEffect(() => {
    const el = registerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => setFormInView(entry.isIntersecting), { rootMargin: '0px 0px -30% 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [event])

  // Poll while she approves the MoMo prompt.
  useEffect(() => {
    if (!waiting) return undefined
    let stop = false
    const tick = async () => {
      try {
        const reg = await events.status(waiting.token)
        if (stop) return
        if (reg.status === 'confirmed') {
          sessionStorage.removeItem(storageKey(slug))
          navigate(`/tickets/${reg.token}`, { replace: true })
          return
        }
        if (reg.status === 'expired' || reg.status === 'cancelled') {
          setWaiting(null)
          setMessage('The payment did not go through, so your places were released. Your details are still here: try again when you are ready.')
          refresh()
          return
        }
        if (reg.status === 'attention') {
          navigate(`/tickets/${reg.token}`, { replace: true })
          return
        }
      } catch {
        // network blip: keep polling
      }
      if (!stop) setTimeout(tick, 3000)
    }
    const timer = setTimeout(tick, 2500)
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [waiting, navigate, refresh, slug])

  if (missing) return <NotFound />
  if (loadError && !event) return <div className={styles.page}><p className={styles.notice}>{loadError}</p></div>
  if (!event) return <Loading />

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }
  const setAnswer = (id, value) => {
    setForm((current) => ({ ...current, answers: { ...current.answers, [id]: value } }))
    setErrors((current) => ({ ...current, [`q_${id}`]: undefined }))
  }
  const toggleActivity = (id) => {
    setErrors((current) => ({ ...current, activities: undefined }))
    setForm((current) => {
      if (current.activityIds.includes(id)) return { ...current, activityIds: current.activityIds.filter((x) => x !== id) }
      if (current.activityIds.length >= needed) return needed === 1 ? { ...current, activityIds: [id] } : current
      return { ...current, activityIds: [...current.activityIds, id] }
    })
  }

  async function submit(e) {
    e.preventDefault()
    setMessage('')
    setErrors({})
    setSubmitting(true)
    try {
      // Fresh counts before taking the hold.
      const latest = await refresh()
      if (latest && latest.state !== 'open') {
        setSubmitting(false)
        return
      }
      const reg = await events.register(slug, {
        name: form.name,
        phone: form.phone,
        email: form.email,
        answers: form.answers,
        activityIds: form.activityIds,
        paymentMethod: form.paymentMethod
      })
      if (reg.status === 'confirmed') {
        sessionStorage.removeItem(storageKey(slug))
        navigate(`/tickets/${reg.token}`)
        return
      }
      if (form.paymentMethod === 'card' && reg.checkoutUrl) {
        window.location.assign(reg.checkoutUrl)
        return
      }
      setWaiting(reg)
    } catch (err) {
      const body = err.response?.data
      const fieldErrors = {}
      for (const d of body?.details ?? []) fieldErrors[d.field] = d.message
      setErrors(fieldErrors)
      setMessage(readError(err))
      if (body?.meta?.state === 'activity_full') {
        await refresh()
        formRef.current?.querySelector('[data-section="activities"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (Object.keys(fieldErrors).length) {
        const first = Object.keys(fieldErrors)[0]
        formRef.current?.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const time = event.startTime ? (event.endTime ? `${event.startTime} to ${event.endTime}` : `From ${event.startTime}`) : null
  const closedText =
    event.state === 'full'
      ? event.fullMessage || `${event.title} is fully booked.`
      : event.state === 'not_open'
        ? 'Registration has not opened yet.'
        : event.closedMessage || 'Registration for this event is closed.'

  return (
    <div className={styles.page}>
      <section className={`${styles.wrap} ${styles.hero}`}>
        <div className={styles.heroCopy}>
          {event.poweredBy && <p className={styles.kicker}>{event.poweredBy}</p>}
          <h1 className={styles.title}>{event.title}</h1>
          {event.tagline && <p className={styles.tagline}>{event.tagline}</p>}
          <div className={styles.chips}>
            <span className={styles.chipDark}>{formatEventDate(event.date)}</span>
            {event.state === 'open' && <span className={styles.chip}>{placesText(event.placesLeft)}</span>}
          </div>
          <dl className={styles.facts}>
            {time && (<div><dt>Time</dt><dd>{time}</dd></div>)}
            {event.venue && (<div><dt>Venue</dt><dd>{event.venue}</dd></div>)}
            <div><dt>Ticket</dt><dd>{event.price ? formatMoney(event.price) : 'Free'}{event.priceNote ? `, ${event.priceNote}` : ''}</dd></div>
          </dl>
          {event.state === 'open' && (
            <a href="#register" className={styles.cta}>
              Register <ArrowRight size={18} />
            </a>
          )}
        </div>
        {event.heroImage && (
          <div className={styles.heroArt}>
            <img src={event.heroImage} alt="" fetchPriority="high" />
          </div>
        )}
      </section>

      {event.gallery.length > 0 && (
        <div className={`${styles.wrap} ${styles.gallery}`}>
          {event.gallery.map((g, i) => (
            <img key={`${g.imageUrl}-${i}`} src={g.imageUrl} alt={g.caption || ''} loading="lazy" decoding="async" />
          ))}
        </div>
      )}

      {event.description && (
        <section className={`${styles.wrap} ${styles.description}`}>
          {event.description.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
        </section>
      )}

      {(event.activities.length > 0 || event.included.length > 0) && (
        <section className={styles.wrap}>
          <div className={styles.experience}>
            {event.activities.length > 0 && (
              <div>
                <h2 className={styles.blockTitle}>Activities</h2>
                <p className={styles.blockLabel}>{event.picksLabel || (event.picks > 1 ? `Choose your ${event.picks} favourites` : 'Choose your favourite')}</p>
                <ul className={styles.list}>
                  {event.activities.map((a) => (
                    <li key={a.id}>
                      <span>{a.name}{a.ledBy ? <small> · {a.ledBy}</small> : null}</span>
                      {event.state === 'open' && <em className={a.left ? '' : styles.full}>{placesText(a.left)}</em>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {event.included.length > 0 && (
              <div>
                <h2 className={styles.blockTitle}>Plus</h2>
                <p className={styles.blockLabel}>Included for everyone</p>
                <ul className={styles.list}>
                  {event.included.map((item, i) => <li key={i}><span>{item}</span></li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {event.partners.length > 0 && (
        <section className={`${styles.wrap} ${styles.partners}`}>
          <p className={styles.partnersLabel}>In partnership with</p>
          <ul>
            {event.partners.map((p, i) => (
              <PartnerLogo key={`${p.name}-${i}`} partner={p} />
            ))}
          </ul>
        </section>
      )}

      <section className={styles.wrap}>
        <div className={styles.ticketBand}>
          <div>
            <p className={styles.bandLabel}>Your ticket</p>
            <p className={styles.bandPrice}>{event.price ? formatMoney(event.price) : 'Free'}</p>
            {event.priceNote && <p className={styles.bandNote}>{event.priceNote}</p>}
          </div>
          <div className={styles.bandRight}>
            <p className={styles.bandLabel}>{formatEventDate(event.date)}</p>
            {event.venue && <p className={styles.bandNote}>{event.venue}{time ? ` · ${time}` : ''}</p>}
            {event.state === 'open' && (
              <a href="#register" className={styles.bandCta}>
                Reserve your place <ArrowRight size={17} />
              </a>
            )}
          </div>
        </div>
      </section>

      <section id="register" ref={registerRef} className={styles.registerBand}>
        <div className={styles.wrap}>
          {event.state !== 'open' ? (
            <div className={styles.closed}>
              <h2>{closedText}</h2>
              {event.contactInstagram && <p>Follow @{event.contactInstagram.replace(/^@/, '')} to hear about the next one.</p>}
            </div>
          ) : waiting ? (
            <div className={styles.waiting} role="status">
              <span className={styles.spinner} aria-hidden="true" />
              <h2>Approve the payment on your phone</h2>
              <p>
                A prompt for {formatMoney(event.price)} has gone to {form.phone}. Enter your mobile money PIN to approve it. Your places are held for {event.holdMinutes} minutes. This page updates by itself.
              </p>
              <p className={styles.small}>No prompt? Dial *182*7*1# to see pending payments.</p>
            </div>
          ) : (
            <div className={styles.registerGrid}>
            <form id="event-form" ref={formRef} className={styles.form} onSubmit={submit} noValidate>
              <h2 className={styles.formTitle}>Register</h2>
              <p className={styles.formLead}>{urgencyText(event.placesLeft, event.totalPlaces)}</p>

              {message && <p className={styles.error} role="alert">{message}</p>}

              {event.activities.length > 0 && event.picks > 0 && (
                <fieldset className={styles.fieldset} data-section="activities" data-field="activities" onFocus={() => { if (!refreshedOnFocus.current) { refreshedOnFocus.current = true; refresh() } }}>
                  <legend>{needed === 1 ? 'Choose 1 activity' : `Choose ${needed} activities`}</legend>
                  {needed < event.picks && needed > 0 && (
                    <p className={styles.hint}>
                      {needed === 1 ? 'Only one activity still has space.' : `Only ${needed} activities still have space.`} You can register for {needed === 1 ? 'it' : 'them'}, at the same price.
                    </p>
                  )}
                  <div className={styles.activityGrid}>
                    {event.activities.map((a) => {
                      const selected = form.activityIds.includes(a.id)
                      const disabled = a.left <= 0 || (!selected && form.activityIds.length >= needed && needed > 1)
                      return (
                        <button key={a.id} type="button" className={`${styles.activity} ${selected ? styles.selected : ''}`} onClick={() => toggleActivity(a.id)} disabled={a.left <= 0} aria-pressed={selected} data-dim={disabled && !selected ? 'true' : undefined}>
                          <span className={styles.check} aria-hidden="true">{selected && <Check size={14} />}</span>
                          <span className={styles.activityName}>{a.name}</span>
                          {a.ledBy && <span className={styles.activityBy}>{a.ledBy}</span>}
                          <span className={a.left ? styles.left : styles.fullTag}>{placesText(a.left)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className={styles.counter}>{form.activityIds.length} of {needed} chosen</p>
                  {errors.activities && <p className={styles.fieldError}>{errors.activities}</p>}
                </fieldset>
              )}

              <fieldset className={styles.fieldset}>
                <legend>Your details</legend>
                <Field label="Full name" error={errors.name} name="name">
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" required />
                </Field>
                <Field label="Phone (WhatsApp)" error={errors.phone} name="phone" hint={form.paymentMethod === 'momo' ? 'The mobile money prompt goes to this number.' : null}>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="078..." required />
                </Field>
                <Field label="Email" error={errors.email} name="email" hint="Your ticket is sent here.">
                  <input value={form.email} onChange={(e) => set('email', e.target.value)} type="email" inputMode="email" autoComplete="email" required />
                </Field>
              </fieldset>

              {event.questions.length > 0 && (
                <fieldset className={styles.fieldset}>
                  <legend>A few questions</legend>
                  {event.questions.map((q) => (
                    <Question key={q.id} q={q} value={form.answers[q.id]} onChange={(v) => setAnswer(q.id, v)} error={errors[`q_${q.id}`]} />
                  ))}
                </fieldset>
              )}

              {event.price > 0 && (
                <fieldset className={styles.fieldset}>
                  <legend>Payment</legend>
                  <div className={styles.methods}>
                    <button type="button" className={`${styles.method} ${form.paymentMethod === 'momo' ? styles.selected : ''}`} onClick={() => set('paymentMethod', 'momo')} aria-pressed={form.paymentMethod === 'momo'}>
                      <MomoBadges />
                      <span>Mobile money</span>
                      <small>MTN MoMo or Airtel Money</small>
                    </button>
                    <button type="button" className={`${styles.method} ${form.paymentMethod === 'card' ? styles.selected : ''}`} onClick={() => set('paymentMethod', 'card')} aria-pressed={form.paymentMethod === 'card'}>
                      <CardBadges />
                      <span>Card</span>
                      <small>Visa or Mastercard</small>
                    </button>
                  </div>
                  {event.feePaidBy === 'customer' && <p className={styles.hint}>A small payment service fee is added when you pay.</p>}
                </fieldset>
              )}

              <button type="submit" className={styles.submit} disabled={submitting}>
                {submitting ? 'One moment…' : event.price > 0 ? `Pay ${formatMoney(event.price)}` : 'Register'}
              </button>
              <p className={styles.small}>Your places are held for {event.holdMinutes} minutes while you pay. You get your ticket on this page and by email.</p>
            </form>
            <aside className={styles.summary} aria-label="Your registration">
              <p className={styles.summaryKicker}>Your registration</p>
              <h3 className={styles.summaryTitle}>{event.title}</h3>
              <dl className={styles.summaryRows}>
                <div><dt>Date</dt><dd>{formatEventDate(event.date)}</dd></div>
                {time && <div><dt>Time</dt><dd>{time}</dd></div>}
                {event.venue && <div><dt>Venue</dt><dd>{event.venue}</dd></div>}
                {event.picks > 0 && event.activities.length > 0 && (
                  <div>
                    <dt>{needed === 1 ? 'Activity' : 'Activities'}</dt>
                    <dd>
                      {form.activityIds.length
                        ? event.activities.filter((a) => form.activityIds.includes(a.id)).map((a) => a.name).join(', ')
                        : <span className={styles.muted}>Choose {needed}</span>}
                    </dd>
                  </div>
                )}
              </dl>
              <div className={styles.summaryTotal}>
                <span>Total</span>
                <strong>{event.price ? formatMoney(event.price) : 'Free'}</strong>
              </div>
              <button type="submit" form="event-form" className={styles.submit} disabled={submitting}>
                {submitting ? 'One moment…' : event.price > 0 ? `Pay ${formatMoney(event.price)}` : 'Register'}
              </button>
              <p className={styles.small}>Your place is confirmed the moment you pay.</p>
            </aside>
            </div>
          )}
          {(event.contactWhatsapp || event.contactInstagram) && (
            <p className={styles.contact}>
              {event.contactWhatsapp && <>Questions? WhatsApp {event.contactWhatsapp}</>}
              {event.contactWhatsapp && event.contactInstagram && ' · '}
              {event.contactInstagram && <>@{event.contactInstagram.replace(/^@/, '')}</>}
            </p>
          )}
        </div>
      </section>

      {/* Rendered on <body>: the page's entrance animation would otherwise pin it to the page, not the screen. */}
      {event.state === 'open' && !waiting && !formInView &&
        createPortal(
          <a href="#register" className={styles.mobileBar}>
            <span>{event.price ? formatMoney(event.price) : 'Free'}</span>
            <strong>Register <ArrowRight size={16} /></strong>
          </a>,
          document.body
        )}

    </div>
  )
}

/**
 * White logos (made for a dark background) sit straight on the green band;
 * coloured logos get a white tile. Decided from the image itself, so any file works.
 */
function PartnerLogo({ partner }) {
  const [light, setLight] = useState(false)

  function inspect(event) {
    try {
      const img = event.currentTarget
      const canvas = document.createElement('canvas')
      canvas.width = 48
      canvas.height = 48
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, 48, 48)
      const { data } = ctx.getImageData(0, 0, 48, 48)
      let sum = 0
      let count = 0
      let transparent = 0
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 40) {
          transparent += 1
          continue
        }
        sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
        count += 1
      }
      // Mostly see-through and what is left is near white: a logo for dark backgrounds.
      setLight(transparent > 48 * 48 * 0.2 && count > 0 && sum / count > 225)
    } catch {
      // unreadable image: keep the white tile
    }
  }

  return (
    <li title={partner.name} className={light ? styles.onGreen : undefined}>
      {partner.imageUrl ? <img src={partner.imageUrl} alt={partner.name} loading="lazy" onLoad={inspect} /> : <span>{partner.name}</span>}
    </li>
  )
}

function Field({ label, hint, error, name, children }) {
  return (
    <label className={styles.field} data-field={name}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint && !error && <span className={styles.hint}>{hint}</span>}
      {error && <span className={styles.fieldError}>{error}</span>}
    </label>
  )
}

function Question({ q, value, onChange, error }) {
  const label = (
    <span className={styles.label}>
      {q.label}
      {!q.required && <span className={styles.optional}> (optional)</span>}
    </span>
  )
  const help = q.help && <span className={styles.hint}>{q.help}</span>
  const err = error && <span className={styles.fieldError}>{error}</span>

  if (q.type === 'consent') {
    return (
      <label className={`${styles.field} ${styles.consent}`} data-field={`q_${q.id}`}>
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        <span>{q.label}{help}{err}</span>
      </label>
    )
  }
  if (q.type === 'choice' || q.type === 'yesno') {
    const options = q.type === 'yesno' ? [['yes', 'Yes'], ['no', 'No']] : q.options.map((o) => [o, o])
    return (
      <div className={styles.field} data-field={`q_${q.id}`} role="radiogroup" aria-label={q.label}>
        {label}
        {help}
        <div className={styles.options}>
          {options.map(([v, text]) => (
            <button key={v} type="button" role="radio" aria-checked={value === v} className={`${styles.option} ${value === v ? styles.selected : ''}`} onClick={() => onChange(v)}>
              {text}
            </button>
          ))}
        </div>
        {err}
      </div>
    )
  }
  return (
    <label className={styles.field} data-field={`q_${q.id}`}>
      {label}
      {help}
      {q.type === 'longtext' ? (
        <textarea rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} maxLength={2000} />
      ) : (
        <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} maxLength={300} />
      )}
      {err}
    </label>
  )
}
