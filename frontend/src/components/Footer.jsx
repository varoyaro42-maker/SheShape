import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { homeContent } from '../api/home.js'
import styles from './Footer.module.css'

export default function Footer() {
  const [content, setContent] = useState(null)

  useEffect(() => {
    let active = true

    homeContent
      .get()
      .then((data) => active && setContent(data))
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  const contactInfo = content?.contact
  const eyebrow = content?.hero?.eyebrow

  return (
    <footer className={styles.footer}>
      <div className={`page ${styles.inner}`}>
        <div>
          <div className={styles.brand}>
            <img src="/favicon.ico" alt="" className={styles.brandIcon} />
            She Shape
          </div>
          <p className={styles.description}>
            Women's fitness in Kigali and online. Structured programs, classes, and nutrition
            coaching.
          </p>
          <p className={styles.tagline}>Strong is your shape.</p>
        </div>

        <div className={styles.column}>
          <h3>Shop</h3>
          <ul>
            <li>
              <Link to="/shop">All products</Link>
            </li>
          </ul>
        </div>

        <div className={styles.column}>
          <h3>Explore</h3>
          <ul>
            <li>
              <Link to="/programs">Programs</Link>
            </li>
            <li>
              <Link to="/blog">Blog</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>

        {contactInfo && (contactInfo.email || contactInfo.phone || contactInfo.instagram || contactInfo.address) && (
          <div className={styles.column}>
            <h3>Contact</h3>
            <ul className={styles.contactList}>
              {contactInfo.email && (
                <li>
                  <span className={styles.contactLabel}>Email</span>
                  <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>
                </li>
              )}
              {contactInfo.phone && (
                <li>
                  <span className={styles.contactLabel}>Phone</span>
                  <a href={`tel:${contactInfo.phone}`}>{contactInfo.phone}</a>
                </li>
              )}
              {contactInfo.instagram && (
                <li>
                  <span className={styles.contactLabel}>Instagram</span>
                  <a
                    href={`https://instagram.com/${contactInfo.instagram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {contactInfo.instagram.startsWith('@') ? contactInfo.instagram : `@${contactInfo.instagram}`}
                  </a>
                </li>
              )}
              {contactInfo.address && (
                <li>
                  <span className={styles.contactLabel}>Location</span>
                  <span>{contactInfo.address}</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <div className={`page ${styles.bottom}`}>
        <span>© {new Date().getFullYear()} She Shape. All rights reserved.</span>
        {eyebrow && <span className={styles.bottomTagline}>{eyebrow}</span>}
      </div>
    </footer>
  )
}
