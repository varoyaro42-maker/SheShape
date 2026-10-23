import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { programs as programsApi } from '../api/programs.js'
import { readError } from '../api/client.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import ProgramCard from '../components/ProgramCard.jsx'
import BookingForm from '../components/BookingForm.jsx'
import Reveal from '../components/Reveal.jsx'
import Loading from '../components/Loading.jsx'
import Empty from '../components/Empty.jsx'
import styles from './Programs.module.css'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open now' },
  { value: 'coming_soon', label: 'Coming soon' }
]

export default function ProgramsPage() {
  const to = usePortalPath()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    let active = true

    programsApi
      .list()
      .then((data) => active && setRows(data))
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  const visible = filter === 'all' ? rows : rows.filter((program) => program.status === filter)
  const openCount = rows.filter((program) => program.status === 'open').length

  return (
    <div className="page">
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <span className="eyebrow rise">Programs</span>
          <h1 className={`${styles.title} rise rise-2`}>Train with us</h1>
          <p className={`${styles.intro} rise rise-3`}>
            Coached strength classes, small groups and workplace sessions across Kigali. Every program is
            progressive, built around real life, and led by a coach who knows your name.
          </p>
        </div>
        {rows.length > 1 && (
          <div className={`${styles.filters} rise rise-4`} role="group" aria-label="Filter programs">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={filter === item.value ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              >
                {item.label}
                {item.value === 'open' && openCount > 0 && <span className={styles.count}>{openCount}</span>}
              </button>
            ))}
          </div>
        )}
      </header>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <Loading />}
      {!loading && visible.length === 0 && <Empty message="No programs listed here yet." />}

      {!loading && visible.length > 0 && (
        <div className={styles.grid}>
          {visible.map((program, index) => (
            <Reveal key={program.id} delay={index * 70}>
              <ProgramCard program={program} />
            </Reveal>
          ))}
        </div>
      )}

      <Reveal as="section" className={styles.help}>
        <div className={styles.helpCopy}>
          <span className="eyebrow">Not sure where to start?</span>
          <h2 className={styles.helpTitle}>Tell us about yourself and we'll suggest a program.</h2>
          <p className={styles.helpText}>
            New to training, coming back after a break, or short on time? Leave your details and a coach will
            reply with a recommendation. You can also <Link to={to('/contact')}>send us a message</Link>.
          </p>
        </div>
        <div className={styles.helpForm}>
          <BookingForm />
        </div>
      </Reveal>
    </div>
  )
}
