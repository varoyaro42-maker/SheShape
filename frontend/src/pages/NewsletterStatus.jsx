import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, MailX, AlertCircle } from 'lucide-react'
import styles from './NewsletterStatus.module.css'

const STATES = {
  confirmed: {
    icon: CheckCircle2,
    title: "You're in",
    text: 'Thanks for confirming. Tips, workouts and new programs will land in your inbox, never more than once a week.'
  },
  unsubscribed: {
    icon: MailX,
    title: 'Unsubscribed',
    text: "You won't get any more newsletters from us. You can sign up again any time from the website."
  },
  invalid: {
    icon: AlertCircle,
    title: 'That link has expired',
    text: 'The link you opened is no longer valid. Sign up again below and we will send a fresh confirmation.'
  }
}

export default function NewsletterStatus() {
  const { state } = useParams()
  const copy = STATES[state] ?? STATES.invalid
  const Icon = copy.icon

  return (
    <div className={`page ${styles.page}`}>
      <div className={`${styles.card} rise`}>
        <span className={styles.icon}>
          <Icon size={28} />
        </span>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.text}>{copy.text}</p>
        <Link to="/" className="btn">
          Back to the site
        </Link>
      </div>
    </div>
  )
}
