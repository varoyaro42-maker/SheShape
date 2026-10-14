import { useEffect, useState } from 'react'
import { homeContent } from '../api/home.js'
import { readError } from '../api/client.js'
import Loading from '../components/Loading.jsx'
import styles from './About.module.css'

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

  const { heading, paragraph, imageUrl } = content.about

  return (
    <div className="page">
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>About us</p>
          <h1 className={styles.title}>{heading || 'About She Shape'}</h1>
          {paragraph ? (
            paragraph.split('\n').map((line, index) => (
              <p key={index} className={styles.paragraph}>
                {line}
              </p>
            ))
          ) : (
            <p className={styles.paragraph}>
              She Shape is built for women who train with intention — structured programs, honest
              gear, and a community that shows up for each other.
            </p>
          )}
        </div>

        <div className={styles.art}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className={styles.image} />
          ) : (
            <div className={styles.placeholder} />
          )}
        </div>
      </section>
    </div>
  )
}
