import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { programs as programsApi } from '../api/programs.js'
import { readError } from '../api/client.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import Loading from '../components/Loading.jsx'
import Empty from '../components/Empty.jsx'
import styles from './Programs.module.css'

export default function ProgramsPage() {
  const to = usePortalPath()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Train with intention</p>
        <h1 className={styles.title}>Programs</h1>
        <p className={styles.intro}>
          Structured training for women — in studio, in groups, at work, or at our wellness
          events. Every session is coached, progressive, and built for real life.
        </p>
      </header>

      <div className={styles.banner}>
        <strong>Booking isn&apos;t open here yet.</strong> These programs run today, but signing
        up happens over the phone. Message us and we&apos;ll place you.
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading && <Loading />}

      {!loading && rows.length === 0 && <Empty message="No programs listed yet." />}

      {!loading && rows.length > 0 && (
        <div className={styles.grid}>
          {rows.map((program) => (
            <article key={program.id} className={styles.card}>
              {program.coverImage ? (
                <img src={program.coverImage} alt="" className={styles.cover} />
              ) : (
                <span className={styles.coverEmpty} />
              )}

              <div className={styles.cardBody}>
                {program.label && <p className={styles.label}>{program.label}</p>}

                <h2 className={styles.cardTitle}>
                  <Link to={to(`/programs/${program.slug}`)} className={styles.cardLink}>
                    {program.name}
                  </Link>
                </h2>

                <p className={styles.tagline}>{program.tagline}</p>

                {program.highlights?.length > 0 && (
                  <ul className={styles.highlights}>
                    {program.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}

                <p className={styles.badge}>Coming soon</p>
              </div>
            </article>
          ))}
        </div>
      )}

      <footer className={styles.footer}>
        <p>
          Want to join one of these? <Link to={to('/shop')}>Shop our products</Link> while booking
          is being built, or reach us on the number in the footer.
        </p>
      </footer>
    </div>
  )
}
