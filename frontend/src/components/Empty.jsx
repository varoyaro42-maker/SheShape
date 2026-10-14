import styles from './Feedback.module.css'

export default function Empty({ title, message, children }) {
  return (
    <div className={styles.box}>
      <h2 className={styles.title}>{title}</h2>
      {message && <p className={styles.text}>{message}</p>}
      {children}
    </div>
  )
}
