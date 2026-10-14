import { useEffect, useState } from 'react'
import styles from './HeroSlideshow.module.css'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Hero photo card that switches between photos. Each photo carries a small
 * label and a caption over a gradient; progress bars along the bottom fill
 * while a photo is showing and can be clicked. Pauses on hover.
 */
export default function HeroSlideshow({ slides = [], interval = 5000, label = '', className = '' }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const still = slides.length < 2 || reducedMotion()

  useEffect(() => {
    if (still || paused) return undefined
    const timer = setTimeout(() => setIndex((current) => (current + 1) % slides.length), interval)
    return () => clearTimeout(timer)
  }, [still, paused, interval, slides.length, index])

  useEffect(() => {
    if (still) return
    const next = slides[(index + 1) % slides.length]
    if (next?.imageUrl) {
      const img = new Image()
      img.src = next.imageUrl
    }
  }, [index, slides, still])

  if (!slides.length) return null

  const current = slides[index]

  return (
    <div
      className={`${styles.slideshow}${paused ? ` ${styles.paused}` : ''}${className ? ` ${className}` : ''}`}
      style={{ '--slide-interval': `${interval}ms` }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <img
          key={`${slide.imageUrl}-${i}`}
          src={slide.imageUrl}
          alt={i === index ? slide.caption || '' : ''}
          aria-hidden={i !== index}
          className={`${styles.image}${i === index ? ` ${styles.active}` : ''}${still ? '' : ` ${styles.zoom}`}`}
          fetchPriority={i === 0 ? 'high' : 'low'}
          decoding="async"
        />
      ))}

      <div className={styles.shade} aria-hidden="true" />

      <div className={styles.overlay}>
        {(current.label || label) && (
          <span key={`lbl-${index}`} className={styles.label}>
            <span className={styles.labelLine} />
            {current.label || label}
          </span>
        )}
        {current.caption && (
          <p key={`cap-${index}`} className={styles.caption}>
            {current.caption}
          </p>
        )}
        {current.detail && <p className={styles.detail}>{current.detail}</p>}
      </div>

      {!still && (
        <div className={styles.bars} role="tablist" aria-label="Hero photos">
          {slides.map((slide, i) => (
            <button
              key={`bar-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={slide.caption || `Photo ${i + 1}`}
              className={styles.bar}
              onClick={() => setIndex(i)}
            >
              <span
                key={i === index ? `fill-${index}` : undefined}
                className={i < index ? `${styles.fill} ${styles.done}` : i === index ? `${styles.fill} ${styles.running}` : styles.fill}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
