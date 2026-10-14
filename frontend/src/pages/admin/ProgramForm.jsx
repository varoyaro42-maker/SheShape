import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Check, Plus, Trash2 } from 'lucide-react'
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
  status: 'coming_soon',
  price: '',
  priceNote: '',
  duration: '',
  location: '',
  coach: '',
  capacity: '',
  bookable: true
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AdminProgramFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isNew = !id

  const [fields, setFields] = useState(BLANK)
  const [schedule, setSchedule] = useState([])
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
          status: program.status,
          price: program.price ?? '',
          priceNote: program.priceNote ?? '',
          duration: program.duration ?? '',
          location: program.location ?? '',
          coach: program.coach ?? '',
          capacity: program.capacity ?? '',
          bookable: program.bookable !== false
        })
        setSchedule(program.schedule ?? [])
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

  function updateSession(index, key, value) {
    setSchedule((current) => current.map((entry, i) => (i === index ? { ...entry, [key]: value } : entry)))
  }

  function addSession() {
    setSchedule((current) => [...current, { day: 'Monday', time: '', note: '' }])
  }

  function removeSession(index) {
    setSchedule((current) => current.filter((_, i) => i !== index))
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
      status: fields.status,
      price: fields.price === '' ? null : Number(fields.price),
      priceNote: fields.priceNote,
      duration: fields.duration,
      location: fields.location,
      coach: fields.coach,
      capacity: fields.capacity === '' ? null : Number(fields.capacity),
      bookable: fields.bookable,
      schedule
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

  const hint = (field) => fieldErrors[field] && <span className={styles.hint}>{fieldErrors[field]}</span>

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
          <h2 className={styles.sectionTitle}>Basics</h2>

          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input type="text" value={fields.name} onChange={(event) => set('name', event.target.value)} maxLength={120} className={styles.input} />
            {hint('name')}
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Label</span>
              <input type="text" value={fields.label} onChange={(event) => set('label', event.target.value)} maxLength={40} placeholder="e.g. Signature, Group training" className={styles.input} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Status</span>
              <select value={fields.status} onChange={(event) => set('status', event.target.value)} className={styles.input}>
                <option value="coming_soon">Coming soon</option>
                <option value="open">Open</option>
              </select>
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Tagline</span>
            <input type="text" value={fields.tagline} onChange={(event) => set('tagline', event.target.value)} maxLength={200} placeholder="One line that says who it is for" className={styles.input} />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Description</span>
            <textarea value={fields.description} onChange={(event) => set('description', event.target.value)} rows={6} className={styles.textarea} />
            <span className={styles.hint}>Leave an empty line between paragraphs.</span>
          </label>

          <label className={styles.field}>
            <span className={styles.label}>What you get (one per line)</span>
            <textarea value={fields.highlights} onChange={(event) => set('highlights', event.target.value)} rows={4} className={styles.textarea} />
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Practical details</h2>
          <p className={styles.hint}>Shown on the program card and page. Leave anything blank to hide it.</p>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Price (RWF)</span>
              <input type="number" min="0" step="1" value={fields.price} onChange={(event) => set('price', event.target.value)} placeholder="45000" className={styles.input} />
              {hint('price')}
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Price note</span>
              <input type="text" value={fields.priceNote} onChange={(event) => set('priceNote', event.target.value)} maxLength={60} placeholder="per month, per session, for 12 weeks" className={styles.input} />
            </label>
          </div>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Duration</span>
              <input type="text" value={fields.duration} onChange={(event) => set('duration', event.target.value)} maxLength={80} placeholder="12 weeks · 3 sessions a week" className={styles.input} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Location</span>
              <input type="text" value={fields.location} onChange={(event) => set('location', event.target.value)} maxLength={120} placeholder="Fitnesspoint Kimihurura" className={styles.input} />
            </label>
          </div>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Coach</span>
              <input type="text" value={fields.coach} onChange={(event) => set('coach', event.target.value)} maxLength={80} placeholder="Coach Arnoldine" className={styles.input} />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Max group size</span>
              <input type="number" min="1" step="1" value={fields.capacity} onChange={(event) => set('capacity', event.target.value)} placeholder="5" className={styles.input} />
              {hint('capacity')}
            </label>
          </div>

          <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
            <input type="checkbox" checked={fields.bookable} onChange={(event) => set('bookable', event.target.checked)} />
            <span className={styles.label} style={{ margin: 0 }}>
              Customers can send a request to join from the website
            </span>
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Weekly schedule</h2>
          <p className={styles.hint}>Add each session. The note can hold the gym or room.</p>

          {schedule.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {schedule.map((entry, index) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: '150px 150px 1fr auto', gap: '0.6rem', alignItems: 'center' }}>
                  <select value={entry.day} onChange={(event) => updateSession(index, 'day', event.target.value)} className={styles.input}>
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                  <input type="text" value={entry.time} onChange={(event) => updateSession(index, 'time', event.target.value)} placeholder="06:30 – 07:30" className={styles.input} maxLength={40} />
                  <input type="text" value={entry.note} onChange={(event) => updateSession(index, 'note', event.target.value)} placeholder="Fitnesspoint Remera" className={styles.input} maxLength={120} />
                  <button type="button" onClick={() => removeSession(index)} className={styles.ghost} aria-label="Remove session">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className={styles.actions} style={{ marginTop: '0.75rem' }}>
            <button type="button" onClick={addSession} className={styles.ghost}>
              <Plus size={15} />
              Add a session
            </button>
          </div>
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
