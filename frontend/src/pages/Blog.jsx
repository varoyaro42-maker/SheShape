import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { posts as postsApi } from '../api/posts.js'
import { readError } from '../api/client.js'
import { formatPostDate } from '../utils/post.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import Loading from '../components/Loading.jsx'
import Empty from '../components/Empty.jsx'
import styles from './Blog.module.css'

export default function BlogPage() {
  const to = usePortalPath()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const result = await postsApi.list({ page, limit: 9 })
      setRows(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
    window.scrollTo({ top: 0 })
  }, [load])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Journal</h1>
        <p className={styles.intro}>
          Training, recovery and the small habits that hold a routine together.
        </p>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {loading && <Loading />}

      {!loading && rows.length === 0 && <Empty message="Nothing here yet. Check back soon." />}

      {!loading && rows.length > 0 && (
        <div className={styles.grid}>
          {rows.map((post) => (
            <article key={post.id} className={styles.card}>
              <Link to={to(`/blog/${post.slug}`)} className={styles.cardLink}>
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className={styles.cover} />
                ) : (
                  <span className={styles.coverEmpty} />
                )}

                <div className={styles.cardBody}>
                  <p className={styles.date}>{formatPostDate(post.publishedAt)}</p>
                  <h2 className={styles.cardTitle}>{post.title}</h2>
                  <p className={styles.excerpt}>{post.excerpt}</p>
                </div>
              </Link>
            </article>
          ))}
        </div>
      )}

      {meta && meta.pages > 1 && (
        <div className={styles.pager}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className={styles.ghost}
          >
            Newer
          </button>

          <span className={styles.pagerLabel}>
            Page {meta.page} of {meta.pages}
          </span>

          <button
            type="button"
            disabled={page >= meta.pages}
            onClick={() => setPage((current) => current + 1)}
            className={styles.ghost}
          >
            Older
          </button>
        </div>
      )}
    </div>
  )
}
