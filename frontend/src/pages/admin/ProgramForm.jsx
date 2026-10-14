import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { adminPrograms, adminUploads } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import VideoUploader from '../../components/VideoUploader.jsx'
import Loading from '../../components/Loading.jsx'
import styles from './ProductForm.module.css'

const BLANK = {
  name: '',
  tagline: '',
  label: '',
  description: '',
  highlights: '',
  status: 'coming_soon'
}

export default function AdminProgramFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isNew = !id

  const [fields, setFields] = useState(BLANK)
  const [coverImage, setCoverImage] = useState('')
  const [videos, setVideos] = useState([])
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (isNew) return

    let active = true

    adminPrograms
      .detail(id)
      .then((program) => {
        if (!active) return
        setFields({
          name: program.name,
          tagline: program.tagline ?? '',
          label: program.label ?? '',
          description: program.description ?? '',
          highlights: (program.highlights ?? []).join('\n'),
          status: program.status
        })
        setCoverImage(program.coverImage ?? '')
        setVideos(program.videos ?? [])
        setSlug(program.slug)
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

  async function handleCoverChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setUploadingCover(true)
    setError('')

    try {
      const { uploadUrl, url } = await adminUploads.presign({ contentType: file.type, size: file.size })
      const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file })
      if (!response.ok) throw new Error(`Upload failed (${response.status}).`)
      setCoverImage(url)
    } catch (err) {
      setError(err.response ? readError(err) : err.message)
    } finally {
      setUploadingCover(false)
    }
  }

  async function addVideo({ url, title }) {
    if (isNew) {
      setVideos((current) => [...current, { id: url, url, title }])
      return
    }

    const video = await adminPrograms.attachVideo(id, { url, title })
    setVideos((current) => [...current, video])
  }

  async function removeVideo(video) {
    if (isNew) {
      setVideos((current) => current.filter((item) => item.id !== video.id))
      return
    }

    await adminPrograms.detachVideo(id, video.id)
    setVideos((current) => current.filter((item) => item.id !== video.id))
  }

  function applyError(err) {
    setError(readError(err))

    const details = err?.response?.data?.details
    if (Array.isArray(details)) {
      setFieldErrors(Object.fromEntries(details.map((item) => [item.field, item.message])))
    }
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})

    const payload = {
      name: fields.name,
      tagline: fields.tagline,
      label: fields.label,
      description: fields.description,
      highlights: fields.highlights.split('\n').map((line) => line.trim()).filter(Boolean),
      coverImage: coverImage || null,
      status: fields.status
    }

    try {
      if (isNew) {
        const created = await adminPrograms.create(payload)
        for (const video of videos) {
          await adminPrograms.attachVideo(created.id, { url: video.url, title: video.title })
        }
        showToast(`"${created.name}" created.`)
        navigate(`/admin/programs/${created.id}`, { replace: true })
      } else {
        const updated = await adminPrograms.update(id, payload)
        showToast(`"${updated.name}" updated.`)
        navigate('/admin/programs')
      }
    } catch (err) {
      applyError(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{isNew ? 'New program' : fields.name}</h1>
          {slug && <p className={styles.slug}>{slug}</p>}
        </div>

        <Link to="/admin/programs" className={styles.back}>
          Back to programs
        </Link>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={submit} className={styles.form} noValidate>
        <section className={styles.card}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input
              type="text"
              value={fields.name}
              onChange={(event) => set('name', event.target.value)}
              maxLength={120}
              className={styles.input}
            />
            {fieldErrors.name && <span className={styles.hint}>{fieldErrors.name}</span>}
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Label</span>
              <input
                type="text"
                value={fields.label}
                onChange={(event) => set('label', event.target.value)}
                maxLength={40}
                placeholder="e.g. Signature"
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Status</span>
              <select
                value={fields.status}
                onChange={(event) => set('status', event.target.value)}
                className={styles.input}
              >
                <option value="coming_soon">Coming soon</option>
                <option value="open">Open</option>
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Tagline</span>
            <input
              type="text"
              value={fields.tagline}
              onChange={(event) => set('tagline', event.target.value)}
              maxLength={200}
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Description</span>
            <textarea
              value={fields.description}
              onChange={(event) => set('description', event.target.value)}
              rows={6}
              className={styles.textarea}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Highlights (one per line)</span>
            <textarea
              value={fields.highlights}
              onChange={(event) => set('highlights', event.target.value)}
              rows={4}
              className={styles.textarea}
            />
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Cover image</h2>

          {coverImage && <img src={coverImage} alt="" style={{ maxWidth: 240, borderRadius: 10 }} />}

          <label className={styles.field}>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverChange} />
            {uploadingCover && <span className={styles.hint}>Uploading…</span>}
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Videos</h2>

          <VideoUploader videos={videos} onAdd={addVideo} onRemove={removeVideo} disabled={saving} />
        </section>

        <div className={styles.actions}>
          <button type="submit" disabled={saving} className={styles.primary}>
            <Check size={16} />
            {saving ? 'Saving' : isNew ? 'Create program' : 'Save changes'}
          </button>

          <Link to="/admin/programs" className={styles.ghost}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
