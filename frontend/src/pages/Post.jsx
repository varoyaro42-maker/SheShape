import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { posts as postsApi } from '../api/posts.js'
import { readError } from '../api/client.js'
import { formatPostDate, toParagraphs, readingMinutes } from '../utils/post.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import Loading from '../components/Loading.jsx'
import styles from './Post.module.css'

export default function PostPage() {
  const { slug } = useParams()
  const to = usePortalPath()

  const [post, setPost] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    setLoading(true)
    setError('')
    window.scrollTo({ top: 0 })

    postsApi
      .detail(slug)
      .then((result) => {
        if (!active) return
        setPost(result.data)
        setRelated(result.related ?? [])
      })
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [slug])

  if (loading) return <Loading />

  if (!post) {
    return (
      <div className={styles.page}>
        <h1 className={styles.missingTitle}>Post not found</h1>
        <p className={styles.missingText}>{error || 'This post may have been removed.'}</p>
        <Link to={to('/blog')} className={styles.back}>
          Back to the journal
        </Link>
      </div>
    )
  }

  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <Link to={to('/blog')} className={styles.back}>
          Journal
        </Link>

        <h1 className={styles.title}>{post.title}</h1>

        <p className={styles.meta}>
          {post.author?.name && <span>{post.author.name}</span>}
          <span>{formatPostDate(post.publishedAt)}</span>
          <span>{readingMinutes(post.body)} min read</span>
        </p>
      </header>

      {post.coverImage && <img src={post.coverImage} alt="" className={styles.cover} />}

      <div className={styles.body}>
        {toParagraphs(post.body).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      {related.length > 0 && (
        <footer className={styles.related}>
          <h2 className={styles.relatedTitle}>More from the journal</h2>

          <ul className={styles.relatedList}>
            {related.map((item) => (
              <li key={item.id}>
                <Link to={to(`/blog/${item.slug}`)} className={styles.relatedLink}>
                  <span className={styles.relatedName}>{item.title}</span>
                  <span className={styles.relatedDate}>
                    {formatPostDate(item.publishedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  )
}
