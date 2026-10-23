import { useEffect, useRef, useState } from 'react'
import { Filter, Check, ChevronDown } from 'lucide-react'
import styles from './FilterSelect.module.css'

export default function FilterSelect({
  icon: Icon = Filter,
  value,
  onChange,
  options,
  placeholder = 'Select',
  fullWidth = false
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const current = options.find((option) => option.value === value)

  return (
    <div className={fullWidth ? `${styles.wrap} ${styles.fullWidth}` : styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={fullWidth ? `${styles.trigger} ${styles.triggerFullWidth}` : styles.trigger}
        onClick={() => setOpen((state) => !state)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Icon size={15} />
        <span className={styles.triggerLabel}>{current ? current.label : placeholder}</span>
        <ChevronDown size={15} className={open ? styles.chevronOpen : styles.chevron} />
      </button>

      {open && (
        <div className={styles.panel} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={styles.option}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
            >
              <span className={styles.check}>
                {option.value === value && <Check size={14} />}
              </span>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
