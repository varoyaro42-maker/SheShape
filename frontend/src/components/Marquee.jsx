import styles from './Marquee.module.css'

/**
 * Endless horizontal scroll of its children (duplicated for a seamless loop).
 * Pauses on hover; shows a static row when the visitor prefers reduced motion.
 */
export default function Marquee({ children, duration = 40, className = '', gap = 0 }) {
  const items = Array.isArray(children) ? children : [children]

  return (
    <div className={`${styles.marquee}${className ? ` ${className}` : ''}`} style={{ '--marquee-duration': `${duration}s`, '--marquee-gap': `${gap}px` }}>
      <div className={styles.track}>
        {items}
        {items.map((child, index) => (
          <span key={`dup-${index}`} aria-hidden="true" className={styles.dup}>
            {child}
          </span>
        ))}
      </div>
    </div>
  )
}
