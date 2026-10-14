import { useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { newsletter } from '../api/newsletter.js'
import { readError } from '../api/client.js'
import styles from './NewsletterForm.module.css'

/**
 * Double opt-in signup. After submitting, the visitor confirms from the email
 * we send, so "done" here means "check your inbox", not "subscribed".
 */
export default function NewsletterForm({ compact = false, light = false }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState('idle')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!email.trim()) return
    setState('sending')
    setError('')

    try {
      const result = await newsletter.subscribe({ email: email.trim() })
      setState(result.alreadySubscribed ? 'already' : 'sent')
    } catch (err) {
      setError(readError(err))
      setState('idle')
    }
  }

  const classes = [styles.form, compact ? styles.compact : '', light ? styles.light : ''].filter(Boolean).join(' ')

  if (state === 'sent' || state === 'already') {
    return (
      <p className={`${styles.done} ${light ? styles.light : ''}`} role="status">
        <Check size={18} />
        {state === 'already' ? "You're already on the list." : 'Check your inbox and tap confirm to finish signing up.'}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className={classes} noValidate>
      <label className="sr-only" htmlFor={compact ? 'newsletter-email-footer' : 'newsletter-email'}>
        Email address
      </label>
      <input
        id={compact ? 'newsletter-email-footer' : 'newsletter-email'}
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Your email address"
        className={styles.input}
        autoComplete="email"
        required
      />
      <button type="submit" className={styles.button} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Subscribe'}
        {state !== 'sending' && <ArrowRight size={16} />}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  )
}
