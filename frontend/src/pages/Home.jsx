import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Quote, ExternalLink } from 'lucide-react'
import { useApi } from '../hooks/useApi.js'
import { homeContent } from '../api/home.js'
import { programs as programsApi } from '../api/programs.js'
import { readError } from '../api/client.js'
import { formatPrice } from '../utils/format.js'
import ProductCard from '../components/ProductCard.jsx'
import ProgramCard from '../components/ProgramCard.jsx'
import SectionHeading from '../components/SectionHeading.jsx'
import NewsletterForm from '../components/NewsletterForm.jsx'
import Carousel from '../components/Carousel.jsx'
import Reveal from '../components/Reveal.jsx'
import Loading from '../components/Loading.jsx'
import styles from './Home.module.css'

function Testimonials({ items }) {
  return (
    <section className={styles.section}>
      <div className="page">
        <SectionHeading eyebrow="From the community" title="Women who train with us" />
        <Carousel label="Member quotes" slideWidth={400}>
          {items.map((item, index) => (
            <figure key={`${item.name}-${index}`} className={styles.quote}>
              <Quote size={22} className={styles.quoteMark} aria-hidden="true" />
              <blockquote>{item.quote}</blockquote>
              <figcaption>
                <strong>{item.name}</strong>
                {item.detail && <span>{item.detail}</span>}
              </figcaption>
            </figure>
          ))}
        </Carousel>
      </div>
    </section>
  )
}

function Team({ items }) {
  return (
    <section className={`${styles.section} ${styles.teamSection}`}>
      <div className="page">
        <SectionHeading eyebrow="Coaches" title="The people behind the programs" />
        <div className={styles.teamGrid}>
          {items.map((member, index) => (
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
      </div>
    </section>
  )
}

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

  const { hero, stats, featured, app, tips, testimonials, team, about, newsletter } = content
  const spotlight = products?.[0] ?? null
  const featuredPrograms = programsList ?? []

  return (
    <>
      <section className={styles.hero}>
        <div className={`page ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            {hero.eyebrow && <span className={`eyebrow rise`}>{hero.eyebrow}</span>}
            <h1 className={`${styles.heroTitle} rise rise-2`}>{hero.title}</h1>
            <p className={`${styles.heroLead} rise rise-3`}>{hero.paragraph}</p>
            <div className={`${styles.heroActions} rise rise-4`}>
              <Link to="/programs" className="btn btn-lg">
                {hero.primaryButtonLabel || 'See programs'}
                <ArrowRight size={18} />
              </Link>
              <Link to="/shop" className="btn btn-outline btn-lg">
                {hero.secondaryButtonLabel || 'Shop Nkondo Active'}
              </Link>
            </div>
          </div>

          <div className={`${styles.heroArt} rise rise-3`}>
            <div className={styles.heroShape} aria-hidden="true" />
            {hero.imageUrl ? (
              <img src={hero.imageUrl} alt="" className={styles.heroImage} fetchPriority="high" />
            ) : (
              <div className={styles.heroFrame}>
                <img src="/logo.svg" alt="" className={styles.heroFrameLogo} />
              </div>
            )}
          </div>
        </div>
      </section>

      {stats?.length > 0 && (
        <section className={styles.stats}>
          <div className={`page ${styles.statsInner}`}>
            {stats.map((stat, index) => (
              <Reveal key={`${stat.label}-${index}`} delay={index * 90} className={styles.stat}>
                <span className={styles.statValue}>{stat.value}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {featuredPrograms.length > 0 && (
        <section className={styles.section}>
          <div className="page">
            <SectionHeading
              eyebrow="Programs"
              title="Train with us"
              lead="Coached, progressive and built around real life. Pick the one that fits your week and ask to join."
              action={
                <Link to="/programs" className="btn btn-outline">
                  All programs
                </Link>
              }
            />
            <Carousel label="Programs" slideWidth={380}>
              {featuredPrograms.map((program) => (
                <ProgramCard key={program.id} program={program} />
              ))}
            </Carousel>
          </div>
        </section>
      )}

      {spotlight && (
        <section className={`${styles.section} ${styles.featured}`}>
          <div className={`page ${styles.split}`}>
            <Reveal className={styles.splitCopy}>
              {featured.eyebrow && <span className="eyebrow">{featured.eyebrow}</span>}
              <h2 className={styles.featuredHeading}>{featured.heading}</h2>
              {featured.script && <p className={styles.featuredSub}>{featured.script}</p>}
              <p className={styles.lead}>{featured.paragraph}</p>

              {featured.tags?.length > 0 && (
                <div className={styles.chips}>
                  {featured.tags.map((tag) => (
                    <span key={tag} className="chip">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <Link to={`/product/${spotlight.slug}`} className={styles.spotlight}>
                <span className={styles.spotlightName}>{spotlight.name}</span>
                <span className={styles.spotlightPrice}>{formatPrice(spotlight.price)}</span>
              </Link>

              <Link to="/shop" className="btn">
                {featured.buttonLabel || 'Shop now'}
                <ArrowRight size={18} />
              </Link>
            </Reveal>

            <Reveal delay={120} className={`${styles.splitArt} media-zoom`}>
              {spotlight.images?.[0]?.url ? (
                <img src={spotlight.images[0].url} alt={spotlight.name} loading="lazy" />
              ) : (
                <div className={styles.artPlaceholder} />
              )}
            </Reveal>
          </div>
        </section>
      )}

      {tips?.length > 0 && (
        <section className={styles.tips}>
          <div className="page">
            <SectionHeading
              eyebrow="Did you know?"
              title="Myths we hear every week"
              light
              action={
                <Link to="/programs" className="btn btn-light">
                  See our programs
                </Link>
              }
            />
            <div className={styles.tipGrid}>
              {tips.map((tip, index) => (
                <Reveal key={`${tip.title}-${index}`} delay={index * 90} className={styles.tip}>
                  <span className={styles.tipIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <h3 className={styles.tipTitle}>{tip.title}</h3>
                  <p className={styles.tipBody}>{tip.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {testimonials?.length > 0 && <Testimonials items={testimonials} />}

      {team?.length > 0 && <Team items={team} />}

      <section className={styles.section}>
        <div className={`page ${styles.split} ${styles.splitReverse}`}>
          <Reveal className={`${styles.splitArt} ${styles.aboutArt} media-zoom`}>
            {about.imageUrl ? (
              <img src={about.imageUrl} alt="" loading="lazy" />
            ) : (
              <div className={styles.artPlaceholder} />
            )}
          </Reveal>

          <Reveal delay={120} className={styles.splitCopy}>
            <span className="eyebrow">About She Shape</span>
            <h2 className={styles.sectionTitle}>{about.heading}</h2>
            <p className={styles.lead}>{about.paragraph}</p>
            <Link to="/about" className="btn btn-outline">
              Read our story
              <ArrowRight size={18} />
            </Link>
          </Reveal>
        </div>
      </section>

      {app?.enabled && app.heading && (
        <section className={`${styles.section} ${styles.appSection}`}>
          <div className={`page ${styles.split}`}>
            <Reveal className={styles.splitCopy}>
              {app.eyebrow && <span className="eyebrow">{app.eyebrow}</span>}
              <h2 className={styles.sectionTitle}>{app.heading}</h2>
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

              {app.demoUrl && (
                <a href={app.demoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                  {app.demoLabel || 'Try the prototype'}
                  <ExternalLink size={16} />
                </a>
              )}
            </Reveal>

            <Reveal delay={120} className={styles.phoneWrap}>
              <div className={styles.phone}>
                {app.imageUrl ? (
                  <img src={app.imageUrl} alt="" loading="lazy" />
                ) : (
                  <div className={styles.phoneScreen}>
                    <img src="/logo-light.svg" alt="" className={styles.phoneLogo} />
                    <p className={styles.phoneTitle}>Strong women, stronger together</p>
                    <p className={styles.phoneText}>Programs, nutrition and coaching for women in Rwanda.</p>
                  </div>
                )}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {products?.length > 0 && (
        <section className={styles.section}>
          <div className="page">
            <SectionHeading
              eyebrow="Shop"
              title="Latest from Nkondo Active"
              action={
                <Link to="/shop" className="btn btn-outline">
                  View all
                </Link>
              }
            />
            {productsLoading ? (
              <Loading label="Loading products" />
            ) : (
              <div className={styles.productGrid}>
                {products.map((product, index) => (
                  <Reveal key={product.id} delay={index * 70}>
                    <ProductCard product={product} />
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {newsletter?.enabled && (
        <section className={styles.newsletter}>
          <div className={`page ${styles.newsletterInner}`}>
            <Reveal className={styles.newsletterCopy}>
              <span className="eyebrow">Newsletter</span>
              <h2 className={styles.newsletterTitle}>{newsletter.heading}</h2>
              <p className={styles.newsletterText}>{newsletter.paragraph}</p>
            </Reveal>
            <Reveal delay={100}>
              <NewsletterForm />
            </Reveal>
          </div>
        </section>
      )}
    </>
  )
}
