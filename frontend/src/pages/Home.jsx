import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Salad, ShoppingBag, BookOpen, Check, ArrowRight } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { homeContent } from '../api/home.js'
import { programs as programsApi } from '../api/programs.js'
import { readError } from '../api/client.js'
import { formatPrice } from '../utils/format.js'
import ProductCard from '../components/ProductCard.jsx'
import Loading from '../components/Loading.jsx'
import styles from './Home.module.css'

const PILLARS = [
  {
    index: '01',
    icon: Dumbbell,
    title: 'Programs',
    tagline: 'train with intention',
    bullets: ['She Strong Classes', 'She Strong Challenge (group training)', 'Corporate Workshops', 'Wellness Events'],
    linkLabel: 'Explore Programs',
    to: '/programs'
  },
  {
    index: '02',
    icon: Salad,
    title: 'Nutrition',
    tagline: 'fuel your strength',
    bullets: ['Nutrition Coaching', 'Consult a Nutritionist'],
    linkLabel: 'Ask about Nutrition',
    to: '/contact'
  },
  {
    index: '03',
    icon: ShoppingBag,
    title: 'Shop',
    tagline: 'made to move with you',
    bullets: ['Activewear & accessories', 'Supplements', 'Wellness Journals'],
    linkLabel: 'Explore Shop',
    to: '/shop'
  },
  {
    index: '04',
    icon: BookOpen,
    title: 'Health & Education',
    tagline: 'learn as you grow',
    bullets: ['Podcast', 'YouTube Videos', 'Research', 'Materials'],
    linkLabel: 'Read the Journal',
    to: '/blog'
  }
]

export default function Home() {
  const { data: products, loading: productsLoading } = useApi('/products', { limit: 4 })
  const [content, setContent] = useState(null)
  const [programsList, setProgramsList] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    homeContent
      .get()
      .then((data) => active && setContent(data))
      .catch((err) => active && setError(readError(err)))

    programsApi
      .list()
      .then((data) => active && setProgramsList(data))
      .catch(() => active && setProgramsList([]))

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

  const { hero, featured, program, app } = content
  const spotlight = products?.[0] ?? null
  const featuredProgram = programsList?.find((item) => item.status === 'open') ?? programsList?.[0] ?? null

  return (
    <>
    <div className={`page ${styles.page}`}>
      <section className={styles.hero}>
        <div className={styles.heroBlob} aria-hidden="true" />
        <div>
          <p className={styles.eyebrow}>{hero.eyebrow}</p>
          <h1 className={styles.title}>{hero.title}</h1>
          <p className={styles.script}>{hero.script}</p>
          <p className={styles.lead}>{hero.paragraph}</p>
          <div className={styles.actions}>
            <Link to="/shop" className="btn">
              {hero.primaryButtonLabel}
            </Link>
            <Link to="/programs" className="btn btn-outline">
              {hero.secondaryButtonLabel}
            </Link>
          </div>
        </div>

        <div className={styles.heroArt}>
          <div className={styles.heroArtAccent} />
          {hero.imageUrl ? (
            <img src={hero.imageUrl} alt="" className={styles.heroArtImage} />
          ) : (
            <div className={styles.heroArtFrame} />
          )}
        </div>
      </section>

      <section className={styles.pillars}>
        <div className={styles.pillarsHead}>
          <p className={styles.pillarsEyebrow}>What we offer</p>
          <h2 className={styles.pillarsTitle}>Everything She Shape offers</h2>
          <p className={styles.pillarsSubtitle}>Pick a pillar to see everything inside it.</p>
        </div>

        <div className={styles.pillarGrid}>
          {PILLARS.map((pillar) => (
            <Link key={pillar.title} to={pillar.to} className={styles.pillarCard}>
              <div className={styles.pillarTop}>
                <span className={styles.pillarIcon}>
                  <pillar.icon size={24} />
                </span>
                <span className={styles.pillarIndex}>{pillar.index}</span>
              </div>

              <h3 className={styles.pillarTitle}>{pillar.title}</h3>
              <p className={styles.pillarTagline}>{pillar.tagline}</p>

              <ul className={styles.pillarList}>
                {pillar.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>

              <span className={styles.pillarLink}>{pillar.linkLabel} →</span>
            </Link>
          ))}
        </div>
      </section>

      {spotlight && (
        <section className={styles.featured}>
          <div>
            <p className={styles.eyebrow}>{featured.eyebrow}</p>
            <div className={styles.featuredHeading}>{featured.heading}</div>
            <p className={styles.script}>{featured.script}</p>
            <p className={styles.lead}>{featured.paragraph}</p>

            {featured.tags?.length > 0 && (
              <div className={styles.tags}>
                {featured.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className={styles.spotlightCard}>
              <span className={styles.spotlightName}>{spotlight.name}</span>
              <span className={styles.spotlightPrice}>{formatPrice(spotlight.price)}</span>
            </div>

            <Link to={`/product/${spotlight.slug}`} className={`btn ${styles.featuredButton}`}>
              {featured.buttonLabel}
              <ArrowRight size={18} />
            </Link>
          </div>

          <div className={styles.featuredArt}>
            {spotlight.images?.[0]?.url ? (
              <img src={spotlight.images[0].url} alt={spotlight.name} className={styles.featuredImage} />
            ) : (
              <div className={styles.featuredPlaceholder} />
            )}
          </div>
        </section>
      )}

      {app.heading && (
        <section className={styles.appSection}>
          <div>
            <p className={styles.eyebrow}>{app.eyebrow}</p>
            <h2 className={styles.appHeading}>{app.heading}</h2>
            <p className={styles.script}>{app.script}</p>
            <p className={styles.lead}>{app.paragraph}</p>

            {app.features?.length > 0 && (
              <ul className={styles.featureList}>
                {app.features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.appArt}>
            {app.imageUrl ? (
              <img src={app.imageUrl} alt="" className={styles.appImage} />
            ) : (
              <div className={styles.appPlaceholder} />
            )}
          </div>
        </section>
      )}

      <section className={styles.latest}>
        <div className={styles.sectionHead}>
          <h2>Latest products</h2>
          <Link to="/shop" className="btn btn-outline">
            View all
          </Link>
        </div>
        {productsLoading ? (
          <Loading label="Loading products" />
        ) : (
          <div className={styles.grid}>
            {(products ?? []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>

    {featuredProgram && (
      <section className={styles.programBand}>
        <div className={`page ${styles.programInner}`}>
          <div>
            <p className={styles.programEyebrow}>{program.eyebrow}</p>
            <h2 className={styles.programTitle}>{featuredProgram.name}</h2>
            <p className={styles.programText}>{featuredProgram.description || featuredProgram.tagline}</p>
            <Link to={`/programs/${featuredProgram.slug}`} className={styles.programButton}>
              {program.buttonLabel}
            </Link>
          </div>

          <div className={styles.programArt}>
            {featuredProgram.coverImage ? (
              <img src={featuredProgram.coverImage} alt={featuredProgram.name} className={styles.programImage} />
            ) : (
              <div className={styles.programPlaceholder} />
            )}
          </div>
        </div>
      </section>
    )}
    </>
  )
}
