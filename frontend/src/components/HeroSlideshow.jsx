import { useEffect, useRef, useState } from 'react'
import styles from './HeroSlideshow.module.css'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Crossfading hero photos with a slow zoom. Pauses on hover; the dots jump
 * to a slide. With one slide (or reduced motion) it is a still image.
 */
export default function HeroSlideshow({ slides = [], interval = 5500, className = '' }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const still = slides.length < 2 || reducedMotion()
  const timer = useRef(null)

  useEffect(() => {
    if (still || paused) return undefined
    timer.current = setInterval(() => setIndex((current) => (current + 1) % slides.length), interval)
    return () => clearInterval(timer.current)
  }, [still, paused, interval, slides.length])

  // Preload the next photo so the crossfade never shows a blank.
  useEffect(() => {
    if (still) return
    const next = slides[(index + 1) % slides.length]
    if (next?.imageUrl) {
      const img = new Image()
      img.src = next.imageUrl
    }
  }, [index, slides, still])

  if (!slides.length) return null

  return (
    <div
      className={`${styles.slideshow}${className ? ` ${className}` : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((slide, i) => (
        <figure
          key={`${slide.imageUrl}-${i}`}
          className={i === index ? `${styles.slide} ${styles.active}` : styles.slide}
          aria-hidden={i !== index}
        >
          <img
            src={slide.imageUrl}
            alt={slide.caption || ''}
            className={still ? styles.image : `${styles.image} ${styles.zoom}`}
            fetchPriority={i === 0 ? 'high' : 'low'}
            decoding="async"
          />
          {slide.caption && <figcaption className={styles.caption}>{slide.caption}</figcaption>}
        </figure>
      ))}

      {!still && (
        <div className={styles.dots} role="tablist" aria-label="Hero photos">
          {slides.map((slide, i) => (
            <button
              key={`dot-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={slide.caption || `Photo ${i + 1}`}
              className={i === index ? `${styles.dot} ${styles.dotActive}` : styles.dot}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
