import Marquee from './Marquee.jsx'
import styles from './Ticker.module.css'

/** Brand words sliding across a green band. */
export default function Ticker({ items }) {
  if (!items?.length) return null

  return (
    <div className={styles.band} aria-hidden="true">
      <Marquee duration={Math.max(18, items.length * 5)}>
        {items.map((item, index) => (
          <span key={`${item}-${index}`} className={styles.item}>
            {item}
            <span className={styles.dot} />
          </span>
        ))}
      </Marquee>
    </div>
  )
}
