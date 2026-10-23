import { useEffect, useState } from 'react'
import { House, Dumbbell, Play, ChartColumn, User, Flame, MapPin, Check, SkipForward, Pause, TrendingUp, Signal, Wifi, BatteryFull } from 'lucide-react'
import styles from './AppPreview.module.css'

const SCREENS = ['today', 'workout', 'progress']
const TABS = { today: 0, workout: 2, progress: 3 }
const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function Ring({ value, total }) {
  const r = 34
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 80 80" className={styles.ring} aria-hidden="true">
      <circle cx="40" cy="40" r={r} className={styles.ringTrack} />
      <circle cx="40" cy="40" r={r} className={styles.ringValue} style={{ strokeDasharray: c, '--ring-offset': c * (1 - value / total) }} />
    </svg>
  )
}

function Today() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const done = [true, false, true, false, false, false, false]
  return (
    <div className={styles.screen}>
      <p className={styles.hello}>Mwaramutse,</p>
      <h4 className={styles.name}>Ama</h4>

      <div className={styles.week}>
        {days.map((day, i) => (
          <span key={i} className={`${styles.day}${done[i] ? ` ${styles.dayDone}` : ''}${i === 4 ? ` ${styles.dayToday}` : ''}`}>
            <small>{day}</small>
            {done[i] ? <Check size={11} strokeWidth={3} /> : <b>{12 + i}</b>}
          </span>
        ))}
      </div>

      <div className={styles.ringCard}>
        <div className={styles.ringWrap}>
          <Ring value={2} total={3} />
          <span className={styles.ringText}>2/3</span>
        </div>
        <div>
          <p className={styles.cardLabel}>This week</p>
          <p className={styles.cardStrong}>One session to go</p>
          <p className={styles.streak}>
            <Flame size={12} /> 6-week streak
          </p>
        </div>
      </div>

      <div className={styles.nextCard}>
        <p className={styles.cardLabel}>Today · 06:30</p>
        <p className={styles.nextTitle}>She Strong Classes</p>
        <p className={styles.nextMeta}>
          <MapPin size={11} /> Fitnesspoint Kimihurura
        </p>
        <span className={styles.startBtn}>
          <Play size={12} fill="currentColor" /> Start session
        </span>
      </div>
    </div>
  )
}

function Workout({ active }) {
  const [seconds, setSeconds] = useState(45)
  useEffect(() => {
    if (!active) return undefined
    setSeconds(45)
    const timer = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 45)), 1000)
    return () => clearInterval(timer)
  }, [active])

  return (
    <div className={`${styles.screen} ${styles.dark}`}>
      <p className={styles.setLabel}>Lower body · Set 2 of 4</p>
      <h4 className={styles.exercise}>Goblet squat</h4>
      <p className={styles.reps}>12 reps · 16 kg</p>

      <div className={styles.timer}>
        <span>00:{String(seconds).padStart(2, '0')}</span>
        <small>rest</small>
      </div>
      <div className={styles.timerBar}>
        <span style={{ width: `${((45 - seconds) / 45) * 100}%` }} />
      </div>

      <div className={styles.controls}>
        <span className={styles.ctrl}>
          <Pause size={14} />
        </span>
        <span className={`${styles.ctrl} ${styles.ctrlMain}`}>
          <Check size={18} strokeWidth={3} />
        </span>
        <span className={styles.ctrl}>
          <SkipForward size={14} />
        </span>
      </div>

      <p className={styles.upNextLabel}>Up next</p>
      <div className={styles.upNext}>
        <span>Romanian deadlift</span>
        <small>3 × 10</small>
      </div>
      <div className={styles.upNext}>
        <span>Walking lunges</span>
        <small>3 × 12</small>
      </div>
    </div>
  )
}

function Progress() {
  const bars = [38, 44, 46, 52, 55, 58, 64, 70]
  return (
    <div className={styles.screen}>
      <p className={styles.cardLabel}>Progress</p>
      <h4 className={styles.name}>Squat</h4>
      <p className={styles.gain}>
        <TrendingUp size={13} /> +12 kg in 8 weeks
      </p>

      <div className={styles.chart}>
        {bars.map((h, i) => (
          <span key={i} className={styles.chartBar} style={{ '--h': `${h}%`, '--d': `${i * 60}ms` }} />
        ))}
      </div>
      <div className={styles.chartAxis}>
        <span>Wk 1</span>
        <span>Wk 8</span>
      </div>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <b>24</b>
          <small>sessions</small>
        </div>
        <div className={styles.stat}>
          <b>-3.1%</b>
          <small>body fat</small>
        </div>
        <div className={styles.stat}>
          <b>+1.4</b>
          <small>kg muscle</small>
        </div>
      </div>
    </div>
  )
}

/** A live-looking phone mockup that cycles through three app screens. */
export default function AppPreview() {
  const still = reducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (still || paused) return undefined
    const timer = setTimeout(() => setIndex((i) => (i + 1) % SCREENS.length), 4200)
    return () => clearTimeout(timer)
  }, [index, paused, still])

  const screen = SCREENS[index]

  return (
    <div className={styles.stage} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={styles.glow} aria-hidden="true" />

      <div className={styles.phone} role="img" aria-label="Preview of the She Shape Wellness app: weekly plan, workout player and progress tracking">
        <div className={styles.notch} />
        <div className={styles.statusBar}>
          <span>9:41</span>
          <span className={styles.statusIcons}>
            <Signal size={11} /> <Wifi size={11} /> <BatteryFull size={13} />
          </span>
        </div>

        <div className={styles.viewport}>
          <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
            <Today />
            <Workout active={screen === 'workout'} />
            <Progress key={screen === 'progress' ? 'p-on' : 'p-off'} />
          </div>
        </div>

        <nav className={styles.tabBar} aria-hidden="true">
          {[House, Dumbbell, Play, ChartColumn, User].map((Icon, i) => (
            <span key={i} className={`${styles.tab}${TABS[screen] === i ? ` ${styles.tabActive}` : ''}`}>
              <Icon size={16} />
            </span>
          ))}
        </nav>
      </div>

      <div className={`${styles.float} ${styles.floatTop}`} aria-hidden="true">
        <span className={styles.floatIcon}>
          <Check size={13} strokeWidth={3} />
        </span>
        <span>
          <b>Session complete</b>
          <small>+1 to your streak</small>
        </span>
      </div>
      <div className={`${styles.float} ${styles.floatBottom}`} aria-hidden="true">
        <span className={`${styles.floatIcon} ${styles.floatIconAlt}`}>
          <Flame size={13} />
        </span>
        <span>
          <b>6 weeks</b>
          <small>training streak</small>
        </span>
      </div>

      <div className={styles.dots}>
        {SCREENS.map((name, i) => (
          <button key={name} type="button" aria-label={`Show ${name} screen`} className={i === index ? `${styles.dot} ${styles.dotOn}` : styles.dot} onClick={() => setIndex(i)} />
        ))}
      </div>
    </div>
  )
}
