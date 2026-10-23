import { Link } from 'react-router-dom'
import { ArrowRight, Clock, MapPin, Users } from 'lucide-react'
import { formatPrice } from '../utils/format.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import { summarizeSchedule } from '../utils/program.js'
import styles from './ProgramCard.module.css'

export default function ProgramCard({ program }) {
  const to = usePortalPath()
  const href = to(`/programs/${program.slug}`)
  const open = program.status === 'open'
  const slots = summarizeSchedule(program.schedule).slice(0, 2)

  return (
    <article className={styles.card}>
      <Link to={href} className={`${styles.media} media-zoom`} aria-label={program.name}>
        {program.coverImage ? (
          <img src={program.coverImage} alt="" loading="lazy" />
        ) : (
          <span className={styles.placeholder} aria-hidden="true">
            <img src="/brand/logo-green.svg" alt="" />
          </span>
        )}
        <span className={open ? `${styles.status} ${styles.statusOpen}` : styles.status}>
          {open ? 'Open now' : 'Coming soon'}
        </span>
        {program.price !== null && program.price !== undefined && (
          <span className={styles.price}>
            {formatPrice(program.price)}
            {program.priceNote && <small> {program.priceNote}</small>}
          </span>
        )}
      </Link>

      <div className={styles.body}>
        <div className={styles.head}>
          {program.label && <span className={styles.label}>{program.label}</span>}
          <h3 className={styles.name}>
            <Link to={href}>{program.name}</Link>
          </h3>
          {program.tagline && <p className={styles.tagline}>{program.tagline}</p>}
        </div>

        {(program.duration || program.location || program.capacity) && (
          <ul className={styles.meta}>
            {program.duration && (
              <li>
                <Clock size={13} />
                {program.duration}
              </li>
            )}
            {program.location && (
              <li>
                <MapPin size={13} />
                {program.location}
              </li>
            )}
            {program.capacity && (
              <li>
                <Users size={13} />
                Max {program.capacity}
              </li>
            )}
          </ul>
        )}

        {slots.length > 0 && (
          <div className={styles.slots}>
            {slots.map((slot) => (
              <div key={slot.time} className={styles.slot}>
                <span className={styles.days}>
                  {slot.days.map((day) => (
                    <span key={day} className={styles.day}>
                      {day}
                    </span>
                  ))}
                </span>
                {slot.time && <span className={styles.time}>{slot.time}</span>}
              </div>
            ))}
          </div>
        )}

        <Link to={href} className={styles.link}>
          {open && program.bookable !== false ? 'Details and booking' : 'Details'}
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  )
}
