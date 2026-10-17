import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import styles from './HeroVideo.module.css'

const prefersStill = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || navigator.connection?.saveData === true)

const narrowScreen = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 720px)').matches

// Events that count as a real interaction, after which browsers let us turn the sound on.
const ACTIVATION_EVENTS = ['pointerup', 'keydown', 'touchend']

/**
 * The landing video. Starts on its own with sound wherever the browser allows
 * it; otherwise it starts silent and switches the sound on at the visitor's
 * first tap or key press anywhere on the page. Pauses while scrolled out of
 * view so the voice does not follow people down the page.
 *
 * `cover` stretches it behind whatever the parent lays over it (the full
 * screen hero); clicks then only ever switch the sound on, never pause.
 */
export default function HeroVideo({ src, smallSrc, poster, title = 'She Shape', className = '', cover = false }) {
  const videoRef = useRef(null)
  const barRef = useRef(null)
  const lastAutoUnmute = useRef(0)
  const [still] = useState(prefersStill)
  const [source] = useState(() => (smallSrc && narrowScreen() ? smallSrc : src))
  const [muted, setMuted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [needsTap, setNeedsTap] = useState(false)

  // Try to start with sound; fall back to a silent start.
  useEffect(() => {
    const video = videoRef.current
    if (!video || still) return undefined
    let cancelled = false

    const start = async () => {
      video.muted = false
      try {
        await video.play()
      } catch {
        if (cancelled) return
        video.muted = true
        try {
          await video.play()
          if (!cancelled) setNeedsTap(true)
        } catch {
          // Even a silent start is blocked; the poster and the play button stay.
        }
      }
    }

    start()
    return () => {
      cancelled = true
    }
  }, [still, source])

  // The first real interaction anywhere on the page turns the sound on.
  useEffect(() => {
    if (!needsTap) return undefined

    const unmute = async (event) => {
      const video = videoRef.current
      if (!video || event.target?.closest?.('[data-sound-control]')) return
      video.muted = false
      try {
        if (video.paused) await video.play()
        lastAutoUnmute.current = performance.now()
        setNeedsTap(false)
      } catch {
        video.muted = true
      }
    }

    ACTIVATION_EVENTS.forEach((name) => document.addEventListener(name, unmute, { passive: true }))
    return () => ACTIVATION_EVENTS.forEach((name) => document.removeEventListener(name, unmute))
  }, [needsTap])

  // Pause out of view, pick up again when the hero is back.
  useEffect(() => {
    const video = videoRef.current
    if (!video || still || typeof IntersectionObserver === 'undefined') return undefined
    let pausedByUs = false

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (pausedByUs) {
            pausedByUs = false
            video.play().catch(() => {})
          }
        } else if (!video.paused) {
          pausedByUs = true
          video.pause()
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(video)
    return () => observer.disconnect()
  }, [still])

  function soundOn() {
    const video = videoRef.current
    if (!video) return
    video.muted = false
    setNeedsTap(false)
    if (video.paused) video.play().catch(() => {})
  }

  function toggleSound() {
    const video = videoRef.current
    if (!video) return
    if (video.muted) return soundOn()
    video.muted = true
  }

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }

  function handleFrameClick() {
    // A tap that just switched the sound on should not also pause the video.
    if (performance.now() - lastAutoUnmute.current < 600) return
    if (needsTap) return soundOn()
    if (!cover) togglePlay()
  }

  function handleTime() {
    const video = videoRef.current
    if (!video || !barRef.current || !video.duration) return
    barRef.current.style.transform = `scaleX(${video.currentTime / video.duration})`
  }

  return (
    <div className={`${styles.frame}${cover ? ` ${styles.cover}` : ''}${className ? ` ${className}` : ''}`}>
      <video
        ref={videoRef}
        className={styles.video}
        src={source}
        poster={poster || undefined}
        loop
        playsInline
        preload={still ? 'metadata' : 'auto'}
        aria-label={title}
        onClick={handleFrameClick}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        onTimeUpdate={handleTime}
      />

      {!playing && (
        <button type="button" className={styles.bigPlay} onClick={soundOn} aria-label={`Play ${title}`}>
          <Play size={30} fill="currentColor" />
        </button>
      )}

      <div className={styles.controls}>
        {needsTap && playing && (
          <button type="button" className={styles.tap} data-sound-control onClick={soundOn}>
            <Volume2 size={17} />
            Tap for sound
          </button>
        )}
        <button type="button" className={styles.control} data-sound-control onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button type="button" className={styles.control} data-sound-control onClick={toggleSound} aria-label={muted ? 'Sound on' : 'Sound off'} aria-pressed={!muted}>
          {muted ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>
      </div>

      <div className={styles.progress} aria-hidden="true">
        <span ref={barRef} className={styles.progressFill} />
      </div>
    </div>
  )
}
