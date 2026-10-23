import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { formatEventDate, formatMoney } from '../api/events.js'
import Loading from '../components/Loading.jsx'
import styles from './Events.module.css'

const STATE_TEXT = { open: null, full: 'Fully booked', closed: 'Registration closed', not_open: 'Opening soon' }

export default function Events() {
  const { data, loading, error } = useApi('/events')

  return (
    <div className="page">
      <header className={styles.header}>
        <p className="eyebrow">Events</p>
        <h1 className={styles.title}>Days to move, learn and meet</h1>
      </header>
      {loading && <Loading />}
      {error && <p>{error}</p>}
      {data && data.length === 0 && <p className={styles.empty}>No events right now. Follow @sheshape_wellness to hear about the next one.</p>}
      <div className={styles.grid}>
        {(data ?? []).map((e) => (
          <Link key={e.slug} to={`/events/${e.slug}`} className={styles.card}>
            {e.heroImage ? <img src={e.heroImage} alt="" loading="lazy" /> : <div className={styles.placeholder}><img src="/brand/logo-green.svg" alt="" /></div>}
            <div className={styles.body}>
              <span className={styles.date}>{formatEventDate(e.date)}</span>
              <h2>{e.title}</h2>
              {e.tagline && <p>{e.tagline}</p>}
              <div className={styles.meta}>
                <span>{e.price ? formatMoney(e.price) : 'Free'}</span>
                {STATE_TEXT[e.state] && <span className={`${styles.state} ${e.state === 'full' ? styles.full : ''}`}>{STATE_TEXT[e.state]}</span>}
              </div>
              <span className={styles.more}>
                {e.state === 'open' ? 'Register' : 'View'} <ArrowRight size={16} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
