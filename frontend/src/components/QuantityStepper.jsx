import styles from './QuantityStepper.module.css'

export default function QuantityStepper({ value, max, onChange, label = 'Quantity' }) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className={styles.value} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  )
}
