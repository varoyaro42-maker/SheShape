import { CheckCircle2, AlertCircle, X } from 'lucide-react'
import styles from './ToastStack.module.css'

export default function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={
            toast.type === 'error' ? `${styles.toast} ${styles.error}` : `${styles.toast} ${styles.success}`
          }
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className={styles.message}>{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className={styles.close}
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
