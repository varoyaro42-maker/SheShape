import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AtSign, MessageCircle } from 'lucide-react'
import { homeContent } from '../api/home.js'
import NewsletterForm from './NewsletterForm.jsx'
import styles from './Footer.module.css'

const handle = (value) => (value ? value.replace(/^@/, '') : '')

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

  const contact = content?.contact
  const instagram = handle(contact?.instagram)
  const whatsapp = contact?.whatsapp?.replace(/[^\d]/g, '')
  const newsletterOn = content?.newsletter?.enabled !== false

  return (
    <footer className={styles.footer}>
      {newsletterOn && (
        <div className={`page ${styles.statement}`}>
          <div>
            <p className={styles.statementEyebrow}>Newsletter</p>
            <p className={styles.statementText}>{content?.newsletter?.heading || 'Tips, workouts and early access to new programs.'}</p>
            <p className={styles.statementNote}>{content?.newsletter?.paragraph || 'One email a week at most. Unsubscribe any time.'}</p>
          </div>
          <div className={styles.statementForm}>
            <NewsletterForm light />
          </div>
        </div>
      )}

      <div className={`page ${styles.inner}`}>
        <div className={styles.brandCol}>
          <Link to="/" className={styles.brand}>
            <img src="/logo-light.svg" alt="" className={styles.brandIcon} />
            She Shape
          </Link>
          <p className={styles.description}>
            Coached strength training, small-group programs and nutrition guidance for women in Kigali.
          </p>
          <div className={styles.social}>
            {instagram && (
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                <AtSign size={16} />{instagram}
              </a>
            )}
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
                <MessageCircle size={16} />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className={styles.column}>
          <h3>Explore</h3>
          <ul>
            <li><Link to="/programs">Programs</Link></li>
            <li><Link to="/shop">Shop</Link></li>
            <li><Link to="/blog">Blog</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className={styles.column}>
          <h3>Visit us</h3>
          <ul className={styles.contactList}>
            {contact?.address && <li>{contact.address}</li>}
            {contact?.phone && (
              <li>
                <a href={`tel:${contact.phone}`}>{contact.phone}</a>
              </li>
            )}
            {contact?.email && (
              <li>
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </li>
            )}
            {!contact?.address && !contact?.phone && !contact?.email && <li>Kigali, Rwanda</li>}
          </ul>
        </div>

      </div>

      <div className={`page ${styles.bottom}`}>
        <span>© {new Date().getFullYear()} She Shape. All rights reserved.</span>
        <span className={styles.bottomTagline}>Learn · Grow · Thrive</span>
      </div>
    </footer>
  )
}
