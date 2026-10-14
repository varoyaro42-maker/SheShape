import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { programs as programsApi } from '../api/programs.js'
import { readError } from '../api/client.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import Loading from '../components/Loading.jsx'
import styles from './Program.module.css'

export default function ProgramPage() {
  const { slug } = useParams()
  const to = usePortalPath()

  const [program, setProgram] = useState(null)
  const [others, setOthers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')
    window.scrollTo({ top: 0 })

    Promise.all([programsApi.detail(slug), programsApi.list()])
      .then(([one, all]) => {
        if (!active) return
        setProgram(one)
        setOthers(all.filter((item) => item.slug !== slug))
      })
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [slug])

  if (loading) return <Loading />

  if (!program) {
    return (
      <div className={styles.page}>
        <h1 className={styles.missingTitle}>Program not found</h1>
        <p className={styles.missingText}>{error || 'This program may have been removed.'}</p>
        <Link to={to('/programs')} className={styles.back}>
          Back to programs
        </Link>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Link to={to('/programs')} className={styles.back}>
        Programs
      </Link>

      <header className={styles.header}>
        {program.label && <p className={styles.label}>{program.label}</p>}
        <h1 className={styles.title}>{program.name}</h1>
        <p className={styles.tagline}>{program.tagline}</p>
      </header>

      {program.coverImage && (
        <img src={program.coverImage} alt="" className={styles.cover} />
      )}

      <div className={styles.columns}>
        <div className={styles.main}>
          <p className={styles.description}>{program.description}</p>

          {program.highlights?.length > 0 && (
            <ul className={styles.highlights}>
              {program.highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          {program.videos?.length > 0 && (
            <section className={styles.videos}>
              <h2 className={styles.videosTitle}>Videos</h2>
              <div className={styles.videoList}>
                {program.videos.map((video) => (
                  <div key={video.id} className={styles.videoItem}>
                    <video src={video.url} controls className={styles.video} />
                    <p className={styles.videoTitle}>{video.title}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className={styles.aside}>
          <p className={styles.badge}>Coming soon</p>
          <p className={styles.asideText}>
            This program runs today, but you can&apos;t book it on this site yet. Call or message
            us using the number in the footer and we&apos;ll place you.
          </p>
        </aside>
      </div>

      {others.length > 0 && (
        <section className={styles.others}>
          <h2 className={styles.othersTitle}>Other programs</h2>

          <ul className={styles.othersList}>
            {others.map((item) => (
              <li key={item.id}>
                <Link to={to(`/programs/${item.slug}`)} className={styles.othersLink}>
                  <span className={styles.othersName}>{item.name}</span>
                  <span className={styles.othersTagline}>{item.tagline}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
