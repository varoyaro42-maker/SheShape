import { Link } from 'react-router-dom'
import { ArrowRight, Clock, MapPin, Users } from 'lucide-react'
import { formatPrice } from '../utils/format.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import ScheduleList from './ScheduleList.jsx'
import styles from './ProgramCard.module.css'

export default function ProgramCard({ program, showSchedule = true }) {
  const to = usePortalPath()
  const href = to(`/programs/${program.slug}`)
  const open = program.status === 'open'

  return (
    <article className={styles.card}>
      <Link to={href} className={`${styles.media} media-zoom`} aria-label={program.name}>
        {program.coverImage ? (
          <img src={program.coverImage} alt="" loading="lazy" />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            {program.name.charAt(0)}
          </span>
        )}
        <span className={open ? `${styles.status} ${styles.statusOpen}` : styles.status}>
          {open ? 'Open now' : 'Coming soon'}
        </span>
      </Link>

      <div className={styles.body}>
        {program.label && <span className="eyebrow">{program.label}</span>}
        <h3 className={styles.name}>
          <Link to={href}>{program.name}</Link>
        </h3>
        {program.tagline && <p className={styles.tagline}>{program.tagline}</p>}

        <ul className={styles.meta}>
          {program.price !== null && program.price !== undefined && (
            <li className={styles.price}>
              {formatPrice(program.price)}
              {program.priceNote && <span className={styles.priceNote}> {program.priceNote}</span>}
            </li>
          )}
          {program.duration && (
            <li>
              <Clock size={14} />
              {program.duration}
            </li>
          )}
          {program.location && (
            <li>
              <MapPin size={14} />
              {program.location}
            </li>
          )}
          {program.capacity && (
            <li>
              <Users size={14} />
              Max {program.capacity}
            </li>
          )}
        </ul>

        {showSchedule && program.schedule?.length > 0 && (
          <div className={styles.schedule}>
            <ScheduleList schedule={program.schedule.slice(0, 2)} compact />
          </div>
        )}

        <Link to={href} className={styles.link}>
          {open && program.bookable ? 'Details and booking' : 'Details'}
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  )
}
