import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Check } from 'lucide-react'
import { adminPosts } from '../../api/admin.js'
import { uploadFile, ADMIN_PREPARE } from '../../utils/upload.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import Loading from '../../components/Loading.jsx'
import styles from './PostEditor.module.css'

const BLANK = {
  title: '',
  excerpt: '',
  body: '',
  coverImage: null,
  isPublished: false,
  publishedAt: ''
}

function toLocalInput(value) {
  if (!value) return ''

  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60000

  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export default function AdminPostEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isNew = !id

  const [fields, setFields] = useState(BLANK)
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (isNew) return

    let active = true

    adminPosts
      .detail(id)
      .then((post) => {
        if (!active) return
        setFields({
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          coverImage: post.coverImage,
          isPublished: post.isPublished,
          publishedAt: toLocalInput(post.publishedAt)
        })
        setSlug(post.slug)
      })
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [id, isNew])

  function set(field, value) {
    setFields((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  async function uploadCover(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    setError('')
    setUploading(true)

    try {
      set('coverImage', await uploadFile({ prepareUrl: ADMIN_PREPARE, kind: 'home', file }))
    } catch (err) {
      setError(err.response ? readError(err) : err.message)
    } finally {
      setUploading(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})

    const payload = {
      title: fields.title,
      excerpt: fields.excerpt,
      body: fields.body,
      coverImage: fields.coverImage,
      isPublished: fields.isPublished,
      publishedAt: fields.publishedAt ? new Date(fields.publishedAt).toISOString() : null
    }

    try {
      if (isNew) {
        const created = await adminPosts.create(payload)
        showToast(`"${created.title}" created.`)
        navigate(`/admin/posts/${created.id}`, { replace: true })
      } else {
        const updated = await adminPosts.update(id, payload)
        showToast(`"${updated.title}" updated.`)
        navigate('/admin/posts')
      }
    } catch (err) {
      setError(readError(err))

      const details = err?.response?.data?.details
      if (Array.isArray(details)) {
        setFieldErrors(Object.fromEntries(details.map((item) => [item.field, item.message])))
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{isNew ? 'New post' : fields.title || 'Untitled'}</h1>
          {slug && <p className={styles.slug}>{slug}</p>}
        </div>

        <div className={styles.headerActions}>
          {slug && fields.isPublished && (
            <a
              href={`/blog/${slug}`}
              target="_blank"
              rel="noreferrer"
              className={styles.back}
            >
              View live
            </a>
          )}

          <Link to="/admin/posts" className={styles.back}>
            Back to blog
          </Link>
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={submit} className={styles.form} noValidate>
        <section className={styles.card}>
          <label className={styles.field}>
            <span className={styles.label}>Title</span>
            <input
              type="text"
              value={fields.title}
              onChange={(event) => set('title', event.target.value)}
              maxLength={180}
              className={styles.input}
            />
            {fieldErrors.title && <span className={styles.hint}>{fieldErrors.title}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Post</span>
            <textarea
              value={fields.body}
              onChange={(event) => set('body', event.target.value)}
              rows={22}
              className={styles.editor}
            />
            <span className={styles.hint}>
              Leave a blank line between paragraphs. {fields.body.trim().split(/\s+/).filter(Boolean).length} words.
            </span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Excerpt</span>
            <textarea
              value={fields.excerpt}
              onChange={(event) => set('excerpt', event.target.value)}
              rows={3}
              maxLength={300}
              className={styles.input}
            />
            <span className={styles.hint}>
              Shown on the blog index. Left blank, the opening of the post is used.
            </span>
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Cover image</h2>

          {fields.coverImage ? (
            <div className={styles.cover}>
              <img src={fields.coverImage} alt="" className={styles.coverImage} />
              <button
                type="button"
                onClick={() => set('coverImage', null)}
                className={styles.ghost}
              >
                Remove
              </button>
            </div>
          ) : (
            <label className={styles.upload}>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadCover}
                className={styles.file}
              />
              <span>{uploading ? 'Uploading' : 'Choose an image'}</span>
            </label>
          )}

          <p className={styles.hint}>Optional. JPEG, PNG or WebP, up to 5 MB.</p>
        </section>

        <section className={styles.card}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={fields.isPublished}
              onChange={(event) => set('isPublished', event.target.checked)}
            />
            <span>
              <strong>Published</strong>
              <span className={styles.hint}>
                A post needs words in it before it can be published.
              </span>
            </span>
          </label>

          {fieldErrors.isPublished && (
            <p className={styles.hint}>{fieldErrors.isPublished}</p>
          )}

          <label className={styles.field}>
            <span className={styles.label}>Publish date</span>
            <input
              type="datetime-local"
              value={fields.publishedAt}
              onChange={(event) => set('publishedAt', event.target.value)}
              className={styles.input}
            />
            <span className={styles.hint}>
              Set a future date and the post appears on its own. Leave blank to stamp it
              when you publish.
            </span>
          </label>
        </section>

        <div className={styles.actions}>
          <button type="submit" disabled={saving || uploading} className={styles.primary}>
            <Check size={16} />
            {saving ? 'Saving' : isNew ? 'Create post' : 'Save changes'}
          </button>

          <Link to="/admin/posts" className={styles.ghost}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
