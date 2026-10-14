import styles from './Feedback.module.css'

export default function Loading({ label = 'Loading' }) {
  return (
    <div className={styles.box} role="status" aria-live="polite">
      <span className={styles.spinner} />
      <p className={styles.text}>{label}</p>
    </div>
  )
}
