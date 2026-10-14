import { CalendarDays } from 'lucide-react'
import styles from './ScheduleList.module.css'

export default function ScheduleList({ schedule, compact = false }) {
  if (!schedule?.length) return null

  return (
    <ul className={compact ? `${styles.list} ${styles.compact}` : styles.list}>
      {schedule.map((entry, index) => (
        <li key={`${entry.day}-${entry.time}-${index}`} className={styles.row}>
          <span className={styles.icon}>
            <CalendarDays size={16} />
          </span>
          <span className={styles.day}>{entry.day}</span>
          <span className={styles.time}>{entry.time}</span>
          {entry.note && <span className={styles.note}>{entry.note}</span>}
        </li>
      ))}
    </ul>
  )
}
