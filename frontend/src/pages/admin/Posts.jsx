import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CircleCheck } from 'lucide-react'
import { adminPosts } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import FilterSelect from '../../components/FilterSelect.jsx'
import styles from './Posts.module.css'

const LIMIT = 20

function formatWhen(post) {
  const stamp = post.publishedAt ?? post.updatedAt
  if (!stamp) return ''

  return new Date(stamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default function AdminPostsPage() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const [page, setPage] = useState(1)
  const [published, setPublished] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 350)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = { page, limit: LIMIT }
      if (published) params.published = published
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()

      const result = await adminPosts.list(params)
      setRows(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }, [page, published, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [published, debouncedSearch])

  async function togglePublished(post) {
    setBusyId(post.id)
    setError('')

    try {
      const updated = await adminPosts.update(post.id, { isPublished: !post.isPublished })
      setRows((current) =>
        current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
      )
      showToast(`${updated.title} ${updated.isPublished ? 'published' : 'unpublished'}.`)
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function destroy(post) {
    setBusyId(post.id)
    setError('')

    try {
      await adminPosts.remove(post.id)
      setConfirmId(null)
      showToast(`${post.title} was deleted.`)
      load()
    } catch (err) {
      setConfirmId(null)
      setError(readError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Blog</h1>
          <p className={styles.subtitle}>
            {meta ? `${meta.total} post${meta.total === 1 ? '' : 's'}` : 'Loading'}
          </p>
        </div>

        <Link to="/admin/posts/new" className={styles.primary}>
          <Plus size={16} />
          Write a post
        </Link>
      </header>

      <div className={styles.filters}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title"
          className={styles.search}
        />

        <FilterSelect
          icon={CircleCheck}
          value={published}
          onChange={setPublished}
          options={[
            { value: '', label: 'Published and draft' },
            { value: 'true', label: 'Published only' },
            { value: 'false', label: 'Drafts only' }
          ]}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading && <Loading />}

      {!loading && rows.length === 0 && <Empty message="No posts yet." />}

      {!loading && rows.length > 0 && (
        <ul className={styles.list}>
          {rows.map((post) => {
            const busy = busyId === post.id

            return (
              <li key={post.id} className={busy ? `${styles.row} ${styles.busy}` : styles.row}>
                {post.coverImage ? (
                  <img src={post.coverImage} alt="" className={styles.thumb} />
                ) : (
                  <span className={styles.thumbEmpty} />
                )}

                <div className={styles.body}>
                  <Link to={`/admin/posts/${post.id}`} className={styles.name}>
                    {post.title}
                  </Link>

                  <p className={styles.excerpt}>{post.excerpt}</p>

                  <p className={styles.meta}>
                    {post.author?.name ?? 'No author'} · {formatWhen(post)}
                  </p>
                </div>

                <div className={styles.side}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => togglePublished(post)}
                    className={
                      post.isPublished
                        ? `${styles.badge} ${styles.badgeLive}`
                        : `${styles.badge} ${styles.badgeDraft}`
                    }
                  >
                    {post.isPublished ? 'Published' : 'Draft'}
                  </button>

                  {confirmId === post.id ? (
                    <span className={styles.actions}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => destroy(post)}
                        className={styles.danger}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className={styles.ghost}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <span className={styles.actions}>
                      <Link to={`/admin/posts/${post.id}`} className={styles.ghost}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmId(post.id)}
                        className={styles.ghost}
                      >
                        Delete
                      </button>
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {meta && meta.pages > 1 && (
        <div className={styles.pager}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
            className={styles.ghost}
          >
            Previous
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
            Next
          </button>
        </div>
      )}
    </div>
  )
}
