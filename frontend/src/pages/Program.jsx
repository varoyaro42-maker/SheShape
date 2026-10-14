import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Clock, MapPin, Users, UserRound, CalendarDays } from 'lucide-react'
import { programs as programsApi } from '../api/programs.js'
import { readError } from '../api/client.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import { formatPrice } from '../utils/format.js'
import BookingForm from '../components/BookingForm.jsx'
import ScheduleList from '../components/ScheduleList.jsx'
import Reveal from '../components/Reveal.jsx'
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
        setOthers(all.filter((item) => item.slug !== slug).slice(0, 3))
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
      <div className={`page ${styles.missing}`}>
        <h1 className={styles.missingTitle}>Program not found</h1>
        <p className={styles.missingText}>{error || 'This program may have been removed.'}</p>
        <Link to={to('/programs')} className="btn btn-outline">
          <ArrowLeft size={16} />
          Back to programs
        </Link>
      </div>
    )
  }

  const open = program.status === 'open'
  const canBook = program.bookable !== false
  const facts = [
    program.price !== null && program.price !== undefined
      ? { icon: null, label: 'Price', value: `${formatPrice(program.price)}${program.priceNote ? ` ${program.priceNote}` : ''}` }
      : null,
    program.duration ? { icon: Clock, label: 'Duration', value: program.duration } : null,
    program.location ? { icon: MapPin, label: 'Where', value: program.location } : null,
    program.coach ? { icon: UserRound, label: 'Coach', value: program.coach } : null,
    program.capacity ? { icon: Users, label: 'Group size', value: `Up to ${program.capacity}` } : null
  ].filter(Boolean)

  return (
    <div className="page">
      <Link to={to('/programs')} className={styles.back}>
        <ArrowLeft size={15} />
        All programs
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={`${styles.status} ${open ? styles.statusOpen : ''} rise`}>
            {open ? 'Open now' : 'Coming soon'}
          </span>
          {program.label && <span className="eyebrow rise rise-2">{program.label}</span>}
          <h1 className={`${styles.title} rise rise-2`}>{program.name}</h1>
          {program.tagline && <p className={`${styles.tagline} rise rise-3`}>{program.tagline}</p>}

          {facts.length > 0 && (
            <dl className={`${styles.facts} rise rise-3`}>
              {facts.map((fact) => (
                <div key={fact.label} className={styles.fact}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {canBook && (
            <a href="#book" className="btn btn-lg rise rise-4">
              {open ? 'Ask to join' : 'Join the waitlist'}
              <ArrowRight size={18} />
            </a>
          )}
        </div>

        <div className={`${styles.heroArt} rise rise-3`}>
          {program.coverImage ? (
            <img src={program.coverImage} alt="" className={styles.cover} fetchPriority="high" />
          ) : (
            <div className={styles.coverPlaceholder}>{program.name.charAt(0)}</div>
          )}
        </div>
      </header>

      <div className={styles.columns}>
        <div className={styles.main}>
          {program.description && (
            <Reveal as="section" className={styles.block}>
              <h2 className={styles.blockTitle}>About this program</h2>
              {program.description.split(/\n{2,}/).map((paragraph, index) => (
                <p key={index} className={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
            </Reveal>
          )}

          {program.highlights?.length > 0 && (
            <Reveal as="section" className={styles.block}>
              <h2 className={styles.blockTitle}>What you get</h2>
              <ul className={styles.highlights}>
                {program.highlights.map((item) => (
                  <li key={item}>
                    <span className={styles.check}>
                      <Check size={14} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {program.schedule?.length > 0 && (
            <Reveal as="section" className={styles.block}>
              <h2 className={styles.blockTitle}>
                <CalendarDays size={20} />
                Weekly schedule
              </h2>
              <div className={styles.scheduleCard}>
                <ScheduleList schedule={program.schedule} />
              </div>
            </Reveal>
          )}

          {program.videos?.length > 0 && (
            <Reveal as="section" className={styles.block}>
              <h2 className={styles.blockTitle}>Videos</h2>
              <div className={styles.videoList}>
                {program.videos.map((video) => (
                  <div key={video.id} className={styles.videoItem}>
                    <video src={video.url} controls preload="metadata" className={styles.video} />
                    <p className={styles.videoTitle}>{video.title}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>

        <aside className={styles.aside} id="book">
          <Reveal className={styles.bookCard}>
            <h2 className={styles.bookTitle}>{open ? 'Ask to join' : 'Join the waitlist'}</h2>
            <p className={styles.bookText}>
              {open
                ? 'Leave your details and a coach will confirm your place and the start date.'
                : "This program isn't running yet. Leave your details and you'll hear from us first when it opens."}
            </p>
            {canBook ? (
              <BookingForm program={program} />
            ) : (
              <p className={styles.closed}>
                Requests are closed for now. <Link to={to('/contact')}>Message us</Link> and we'll point you to
                something similar.
              </p>
            )}
          </Reveal>
        </aside>
      </div>

      {others.length > 0 && (
        <Reveal as="section" className={styles.others}>
          <h2 className={styles.othersTitle}>Other programs</h2>
          <ul className={styles.othersList}>
            {others.map((item) => (
              <li key={item.id}>
                <Link to={to(`/programs/${item.slug}`)} className={styles.othersLink}>
                  <span>
                    <span className={styles.othersName}>{item.name}</span>
                    {item.tagline && <span className={styles.othersTagline}>{item.tagline}</span>}
                  </span>
                  <ArrowRight size={18} />
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
    </div>
  )
}
