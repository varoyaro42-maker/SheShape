import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Reveal from './Reveal.jsx'
import styles from './Carousel.module.css'

/**
 * Horizontal, swipeable row of cards with snap points and arrow buttons.
 * Children are the slides; each slides in from the right as it appears.
 */
export default function Carousel({ children, label = 'Carousel', slideWidth = 360 }) {
  const trackRef = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const update = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setAtStart(track.scrollLeft <= 4)
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined
    update()
    track.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(track)
    return () => {
      track.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [update])

  function slide(direction) {
    const track = trackRef.current
    if (!track) return
    const first = track.firstElementChild
    const step = first ? first.getBoundingClientRect().width + 20 : slideWidth
    track.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  const slides = Array.isArray(children) ? children : [children]

  return (
    <div className={styles.carousel}>
      <div className={styles.track} ref={trackRef} role="region" aria-label={label} tabIndex={0}>
        {slides.map((child, index) => (
          <Reveal
            key={child?.key ?? index}
            className={`${styles.slide} reveal-x`}
            delay={index * 90}
            style={{ '--slide-width': `${slideWidth}px` }}
          >
            {child}
          </Reveal>
        ))}
      </div>

      <div className={styles.controls}>
        <button type="button" className={styles.arrow} onClick={() => slide(-1)} disabled={atStart} aria-label="Previous">
          <ArrowLeft size={18} />
        </button>
        <button type="button" className={styles.arrow} onClick={() => slide(1)} disabled={atEnd} aria-label="Next">
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
