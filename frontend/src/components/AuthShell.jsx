import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import styles from '../pages/Form.module.css'

const PERKS = ['Track your orders and deliveries', 'Ask to join a program in one tap', 'First to hear about new classes']

/** Two-panel frame for sign in, sign up and password screens. */
export default function AuthShell({ children }) {
  return (
    <div className={styles.page}>
      <div className={`${styles.shell} rise`}>
        <aside className={styles.brand}>
          <Link to="/" className={styles.brandLogo} aria-label="She Shape Wellness home">
            <img src="/brand/logo-white.svg" alt="She Shape Wellness" />
          </Link>
          <div>
            <p className={styles.brandTitle}>Strong is your shape.</p>
            <ul className={styles.brandList}>
              {PERKS.map((perk) => (
                <li key={perk}>
                  <Check size={15} />
                  {perk}
                </li>
              ))}
            </ul>
          </div>
          <p className={styles.brandFoot}>Learn · Grow · Thrive</p>
        </aside>
        <div className={styles.card}>{children}</div>
      </div>
    </div>
  )
}
