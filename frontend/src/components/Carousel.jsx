import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import Reveal from './Reveal.jsx'
import styles from './Carousel.module.css'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Horizontal, swipeable row of cards with arrow buttons.
 * With `autoplay`, the row glides continuously and loops (slides are
 * duplicated for a seamless wrap); it pauses while hovered, touched or
 * focused, and after an arrow press.
 */
export default function Carousel({ children, label = 'Carousel', slideWidth = 360, autoplay = false, speed = 26 }) {
  const trackRef = useRef(null)
  const pausedUntil = useRef(0)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)
  const looping = autoplay && !reducedMotion()

  const update = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setAtStart(!looping && track.scrollLeft <= 4)
    setAtEnd(!looping && track.scrollLeft + track.clientWidth >= track.scrollWidth - 4)
  }, [looping])

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

  // Continuous glide. Whole pixels only, so browsers that round scroll
  // positions still move; a float accumulator carries the remainder.
  useEffect(() => {
    const track = trackRef.current
    if (!track || !looping) return undefined

    let frame
    let last = performance.now()
    let carry = 0
    let hovered = false

    const step = (now) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (!hovered && !document.hidden && now > pausedUntil.current) {
        carry += speed * dt
        const whole = Math.floor(carry)
        if (whole > 0) {
          carry -= whole
          const half = track.scrollWidth / 2
          let next = track.scrollLeft + whole
          if (next >= half) next -= half
          track.scrollLeft = next
        }
      }
      frame = requestAnimationFrame(step)
    }

    const pause = () => { hovered = true }
    const resume = () => { hovered = false }
    track.addEventListener('pointerenter', pause)
    track.addEventListener('pointerleave', resume)
    track.addEventListener('pointerdown', pause)
    track.addEventListener('pointerup', resume)
    track.addEventListener('focusin', pause)
    track.addEventListener('focusout', resume)
    frame = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(frame)
      track.removeEventListener('pointerenter', pause)
      track.removeEventListener('pointerleave', resume)
      track.removeEventListener('pointerdown', pause)
      track.removeEventListener('pointerup', resume)
      track.removeEventListener('focusin', pause)
      track.removeEventListener('focusout', resume)
    }
  }, [looping, speed])

  function slide(direction) {
    const track = trackRef.current
    if (!track) return
    const first = track.firstElementChild
    const step = first ? first.getBoundingClientRect().width + 20 : slideWidth
    pausedUntil.current = performance.now() + 2500
    track.scrollBy({ left: direction * step, behavior: 'smooth' })
  }

  const slides = (Array.isArray(children) ? children : [children]).filter(Boolean)
  const rendered = looping ? [...slides, ...slides] : slides

  return (
    <div className={styles.carousel}>
      <div
        className={looping ? `${styles.track} ${styles.looping}` : styles.track}
        ref={trackRef}
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        {rendered.map((child, index) => (
          <Reveal
            key={`${child?.key ?? index}-${index}`}
            className={`${styles.slide} reveal-x`}
            delay={Math.min(index, 5) * 90}
            style={{ '--slide-width': `${slideWidth}px` }}
            aria-hidden={looping && index >= slides.length ? 'true' : undefined}
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
