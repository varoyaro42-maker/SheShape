import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Newspaper } from 'lucide-react'
import { homeContent } from '../api/home.js'
import { readError } from '../api/client.js'
import Reveal from '../components/Reveal.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import Loading from '../components/Loading.jsx'
import styles from './About.module.css'

const PRESS_URL =
  'https://www.newtimes.co.rw/article/33924/news/featured/how-she-shape-is-creating-safest-space-for-women-at-fitnesspoint-other-gyms'

export default function AboutPage() {
  const [content, setContent] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    homeContent
      .get()
      .then((data) => active && setContent(data))
      .catch((err) => active && setError(readError(err)))

    return () => {
      active = false
    }
  }, [])

  if (error) {
    return (
      <div className="page">
        <p className={styles.error}>{error}</p>
      </div>
    )
  }

  if (!content) return <Loading />

  const { about, stats, team, testimonials, contact } = content
  const paragraphs = (about.paragraph || '').split(/\n{2,}|\n/).filter(Boolean)

  return (
    <div className="page">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className="eyebrow rise">About She Shape Wellness</span>
          <h1 className={`${styles.title} rise rise-2`}>{about.heading || 'About She Shape Wellness'}</h1>
          <div className={`${styles.story} rise rise-3`}>
            {paragraphs.length > 0 ? (
              paragraphs.map((line, index) => <p key={index}>{line}</p>)
            ) : (
              <p>
                She Shape Wellness is a women's fitness community in Kigali: coached strength training, small-group
                programs and honest nutrition guidance, backed by Fitnesspoint gyms.
              </p>
            )}
          </div>
          <div className={`${styles.heroActions} rise rise-4`}>
            <Link to="/programs" className="btn">
              See programs
              <ArrowRight size={18} />
            </Link>
            <Link to="/contact" className="btn btn-outline">
              Get in touch
            </Link>
          </div>
        </div>

        <div className={`${styles.heroArt} rise rise-3`}>
          {about.imageUrl ? (
            <img src={about.imageUrl} alt="" className={styles.image} fetchPriority="high" />
          ) : (
            <div className={styles.placeholder}>
              <img src="/brand/logo-green.svg" alt="" className={styles.placeholderLogo} />
            </div>
          )}
        </div>
      </section>

      {stats?.length > 0 && (
        <section className={styles.stats}>
          {stats.map((stat, index) => (
            <Reveal key={`${stat.label}-${index}`} delay={index * 90} className={styles.stat}>
              <span className={styles.statValue}>{stat.value}</span>
              <span className={styles.statLabel}>{stat.label}</span>
            </Reveal>
          ))}
        </section>
      )}

      <Reveal as="section" className={styles.press}>
        <Newspaper size={20} />
        <p>
          Featured in The New Times:{' '}
          <a href={PRESS_URL} target="_blank" rel="noopener noreferrer">
            How She Shape Wellness is creating the safest space for women at Fitnesspoint and other gyms
          </a>
        </p>
      </Reveal>

      {team?.length > 0 && (
        <section className={styles.section}>
          <SectionHeading eyebrow="Coaches" title="Meet the team" />
          <div className={styles.teamGrid}>
            {team.map((member, index) => (
              <Reveal key={`${member.name}-${index}`} delay={index * 80} className={styles.member}>
                <div className={`${styles.memberPhoto} media-zoom`}>
                  {member.imageUrl ? (
                    <img src={member.imageUrl} alt={member.name} loading="lazy" />
                  ) : (
                    <span className={styles.memberInitial}>{member.name?.charAt(0)}</span>
                  )}
                </div>
                <h3 className={styles.memberName}>{member.name}</h3>
                {member.role && <p className={styles.memberRole}>{member.role}</p>}
                {member.bio && <p className={styles.memberBio}>{member.bio}</p>}
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {testimonials?.length > 0 && (
        <section className={styles.section}>
          <SectionHeading eyebrow="Community" title="In their words" />
          <div className={styles.quotes}>
            {testimonials.map((item, index) => (
              <Reveal key={`${item.name}-${index}`} as="figure" delay={index * 80} className={styles.quote}>
                <blockquote>{item.quote}</blockquote>
                <figcaption>
                  <strong>{item.name}</strong>
                  {item.detail && <span>{item.detail}</span>}
                </figcaption>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <Reveal as="section" className={styles.cta}>
        <div>
          <h2 className={styles.ctaTitle}>Come train with us</h2>
          <p className={styles.ctaText}>
            {contact?.address ? `Find us at ${contact.address}. ` : ''}
            First session nerves are normal. Everyone here started somewhere.
          </p>
        </div>
        <Link to="/programs" className="btn btn-light btn-lg">
          Choose a program
          <ArrowRight size={18} />
        </Link>
      </Reveal>
    </div>
  )
}
