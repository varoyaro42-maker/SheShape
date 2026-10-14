import { useEffect, useState } from 'react'
import { Phone, Mail, MapPin, MessageCircle, AtSign, User, MessageSquare, Send } from 'lucide-react'
import { homeContent } from '../api/home.js'
import { contact } from '../api/contact.js'
import { readError } from '../api/client.js'
import Loading from '../components/Loading.jsx'
import styles from './Contact.module.css'

const BLANK = { name: '', email: '', message: '' }

export default function ContactPage() {
  const [content, setContent] = useState(null)
  const [loadError, setLoadError] = useState('')

  const [fields, setFields] = useState(BLANK)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    let active = true

    homeContent
      .get()
      .then((data) => active && setContent(data))
      .catch((err) => active && setLoadError(readError(err)))

    return () => {
      active = false
    }
  }, [])

  function set(field, value) {
    setFields((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function submit(event) {
    event.preventDefault()
    setSending(true)
    setError('')
    setFieldErrors({})

    try {
      await contact.send(fields)
      setSent(true)
      setFields(BLANK)
    } catch (err) {
      setError(readError(err))
      const details = err?.response?.data?.details
      if (Array.isArray(details)) {
        setFieldErrors(Object.fromEntries(details.map((item) => [item.field, item.message])))
      }
    } finally {
      setSending(false)
    }
  }

  if (loadError) {
    return (
      <div className="page">
        <p className={styles.error}>{loadError}</p>
      </div>
    )
  }

  if (!content) return <Loading />

  const { phone, email, whatsapp, instagram, address } = content.contact

  return (
    <div className={styles.page}>
      <header className={`page ${styles.header}`}>
        <div className={styles.headerBlob} aria-hidden="true" />
        <p className={styles.eyebrow}>Get in touch</p>
        <h1 className={styles.title}>Let's talk shape, strength &amp; strategy</h1>
        <p className={styles.lead}>
          Questions about programs, nutrition coaching, or an order? Send us a message and we'll
          get back to you.
        </p>
      </header>

      <div className={`page ${styles.layout}`}>
        <form onSubmit={submit} className={styles.form} noValidate>
          <div className={styles.formHead}>
            <h2 className={styles.formTitle}>Send a message</h2>
            <p className={styles.formSubtitle}>We usually reply within one business day.</p>
          </div>

          {sent && <p className={styles.success}>Thanks — your message is on its way to us.</p>}
          {error && <p className={styles.errorBanner}>{error}</p>}

          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <span className={styles.inputWrap}>
              <User size={17} className={styles.inputIcon} />
              <input
                type="text"
                value={fields.name}
                onChange={(event) => set('name', event.target.value)}
                className={styles.input}
                maxLength={80}
                placeholder="Your full name"
              />
            </span>
            {fieldErrors.name && <span className={styles.hint}>{fieldErrors.name}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <span className={styles.inputWrap}>
              <Mail size={17} className={styles.inputIcon} />
              <input
                type="email"
                value={fields.email}
                onChange={(event) => set('email', event.target.value)}
                className={styles.input}
                placeholder="you@example.com"
              />
            </span>
            {fieldErrors.email && <span className={styles.hint}>{fieldErrors.email}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Message</span>
            <span className={styles.inputWrap}>
              <MessageSquare size={17} className={`${styles.inputIcon} ${styles.inputIconTop}`} />
              <textarea
                value={fields.message}
                onChange={(event) => set('message', event.target.value)}
                rows={6}
                className={styles.textarea}
                placeholder="Tell us what you need help with"
              />
            </span>
            {fieldErrors.message && <span className={styles.hint}>{fieldErrors.message}</span>}
          </label>

          <button type="submit" disabled={sending} className={`btn ${styles.submitButton}`}>
            {sending ? 'Sending…' : 'Send message'}
            {!sending && <Send size={16} />}
          </button>
        </form>

        <aside className={styles.info}>
          <p className={styles.infoTitle}>Reach us directly</p>

          <div className={styles.infoList}>
            {phone && (
              <a href={`tel:${phone}`} className={styles.infoRow}>
                <span className={styles.infoIcon}>
                  <Phone size={18} />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Call</span>
                  {phone}
                </span>
              </a>
            )}
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`}
                className={styles.infoRow}
              >
                <span className={styles.infoIcon}>
                  <MessageCircle size={18} />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>WhatsApp</span>
                  {whatsapp}
                </span>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className={styles.infoRow}>
                <span className={styles.infoIcon}>
                  <Mail size={18} />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Email</span>
                  {email}
                </span>
              </a>
            )}
            {instagram && (
              <a
                href={`https://instagram.com/${instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.infoRow}
              >
                <span className={styles.infoIcon}>
                  <AtSign size={18} />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Instagram</span>
                  {instagram.startsWith('@') ? instagram : `@${instagram}`}
                </span>
              </a>
            )}
            {address && (
              <span className={styles.infoRow}>
                <span className={styles.infoIcon}>
                  <MapPin size={18} />
                </span>
                <span className={styles.infoText}>
                  <span className={styles.infoLabel}>Visit</span>
                  {address}
                </span>
              </span>
            )}
            {!phone && !whatsapp && !email && !instagram && !address && (
              <p className={styles.infoEmpty}>Send a message and we'll reply by email.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
