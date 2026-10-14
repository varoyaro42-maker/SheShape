import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { adminHome } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import HomeImageUploader from '../../components/HomeImageUploader.jsx'
import Loading from '../../components/Loading.jsx'
import styles from './ProductForm.module.css'

const BLANK = {
  hero: {
    eyebrow: '',
    title: '',
    script: '',
    paragraph: '',
    primaryButtonLabel: '',
    secondaryButtonLabel: '',
    imageUrl: ''
  },
  featured: {
    eyebrow: '',
    heading: '',
    script: '',
    paragraph: '',
    tags: [],
    buttonLabel: ''
  },
  program: {
    eyebrow: '',
    buttonLabel: ''
  },
  app: {
    eyebrow: '',
    heading: '',
    script: '',
    paragraph: '',
    features: [],
    imageUrl: ''
  },
  about: {
    heading: '',
    paragraph: '',
    imageUrl: ''
  },
  contact: {
    phone: '',
    email: '',
    whatsapp: '',
    instagram: '',
    address: ''
  }
}

export default function AdminHomeSettingsPage() {
  const { showToast } = useToast()
  const [content, setContent] = useState(BLANK)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    adminHome
      .get()
      .then((data) => active && setContent(data))
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  function set(section, key, value) {
    setContent((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value }
    }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const updated = await adminHome.update(content)
      setContent(updated)
      showToast('Home page updated.')
    } catch (err) {
      setError(readError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Home page</h1>
          <p className={styles.slug}>Edit the text and pictures shown on the public homepage.</p>
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={submit} className={styles.form} noValidate>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Hero</h2>

          <HomeImageUploader
            label="Hero image"
            value={content.hero.imageUrl}
            onChange={(url) => set('hero', 'imageUrl', url)}
            disabled={saving}
          />

          <label className={styles.field}>
            <span className={styles.label}>Eyebrow</span>
            <input
              type="text"
              value={content.hero.eyebrow}
              onChange={(event) => set('hero', 'eyebrow', event.target.value)}
              className={styles.input}
              maxLength={80}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Headline</span>
            <input
              type="text"
              value={content.hero.title}
              onChange={(event) => set('hero', 'title', event.target.value)}
              className={styles.input}
              maxLength={120}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Script line</span>
            <input
              type="text"
              value={content.hero.script}
              onChange={(event) => set('hero', 'script', event.target.value)}
              className={styles.input}
              maxLength={120}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Paragraph</span>
            <textarea
              value={content.hero.paragraph}
              onChange={(event) => set('hero', 'paragraph', event.target.value)}
              rows={3}
              className={styles.textarea}
            />
          </label>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Primary button label</span>
              <input
                type="text"
                value={content.hero.primaryButtonLabel}
                onChange={(event) => set('hero', 'primaryButtonLabel', event.target.value)}
                className={styles.input}
                maxLength={40}
              />
              <span className={styles.hint}>Links to the shop.</span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Secondary button label</span>
              <input
                type="text"
                value={content.hero.secondaryButtonLabel}
                onChange={(event) => set('hero', 'secondaryButtonLabel', event.target.value)}
                className={styles.input}
                maxLength={40}
              />
              <span className={styles.hint}>Links to programs.</span>
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Featured promo</h2>
          <p className={styles.hint}>
            The picture, name and price shown here come automatically from your most recently added
            product — add a product in Products to feature it.
          </p>

          <label className={styles.field}>
            <span className={styles.label}>Eyebrow</span>
            <input
              type="text"
              value={content.featured.eyebrow}
              onChange={(event) => set('featured', 'eyebrow', event.target.value)}
              className={styles.input}
              maxLength={80}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Heading</span>
            <input
              type="text"
              value={content.featured.heading}
              onChange={(event) => set('featured', 'heading', event.target.value)}
              className={styles.input}
              maxLength={80}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Script line</span>
            <input
              type="text"
              value={content.featured.script}
              onChange={(event) => set('featured', 'script', event.target.value)}
              className={styles.input}
              maxLength={80}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Paragraph</span>
            <textarea
              value={content.featured.paragraph}
              onChange={(event) => set('featured', 'paragraph', event.target.value)}
              rows={3}
              className={styles.textarea}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Tags (comma separated)</span>
            <input
              type="text"
              value={content.featured.tags.join(', ')}
              onChange={(event) =>
                set(
                  'featured',
                  'tags',
                  event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean)
                )
              }
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Button label</span>
            <input
              type="text"
              value={content.featured.buttonLabel}
              onChange={(event) => set('featured', 'buttonLabel', event.target.value)}
              className={styles.input}
              maxLength={40}
            />
            <span className={styles.hint}>Links to that product's page.</span>
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Featured program</h2>
          <p className={styles.hint}>
            The picture, name and description shown here come automatically from your open programs
            (or your most recent program if none are open) — manage that in Programs.
          </p>

          <label className={styles.field}>
            <span className={styles.label}>Eyebrow</span>
            <input
              type="text"
              value={content.program.eyebrow}
              onChange={(event) => set('program', 'eyebrow', event.target.value)}
              className={styles.input}
              maxLength={40}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Button label</span>
            <input
              type="text"
              value={content.program.buttonLabel}
              onChange={(event) => set('program', 'buttonLabel', event.target.value)}
              className={styles.input}
              maxLength={40}
            />
            <span className={styles.hint}>Links to that program's page.</span>
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>App pitch</h2>

          <HomeImageUploader
            label="Section image"
            value={content.app.imageUrl}
            onChange={(url) => set('app', 'imageUrl', url)}
            disabled={saving}
          />

          <label className={styles.field}>
            <span className={styles.label}>Eyebrow</span>
            <input
              type="text"
              value={content.app.eyebrow}
              onChange={(event) => set('app', 'eyebrow', event.target.value)}
              className={styles.input}
              maxLength={80}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Heading</span>
            <input
              type="text"
              value={content.app.heading}
              onChange={(event) => set('app', 'heading', event.target.value)}
              className={styles.input}
              maxLength={80}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Script line</span>
            <input
              type="text"
              value={content.app.script}
              onChange={(event) => set('app', 'script', event.target.value)}
              className={styles.input}
              maxLength={80}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Paragraph</span>
            <textarea
              value={content.app.paragraph}
              onChange={(event) => set('app', 'paragraph', event.target.value)}
              rows={3}
              className={styles.textarea}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Feature list (one per line)</span>
            <textarea
              value={content.app.features.join('\n')}
              onChange={(event) =>
                set(
                  'app',
                  'features',
                  event.target.value.split('\n').map((line) => line.trim()).filter(Boolean)
                )
              }
              rows={4}
              className={styles.textarea}
            />
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>About page</h2>

          <HomeImageUploader
            label="About image"
            value={content.about.imageUrl}
            onChange={(url) => set('about', 'imageUrl', url)}
            disabled={saving}
          />

          <label className={styles.field}>
            <span className={styles.label}>Heading</span>
            <input
              type="text"
              value={content.about.heading}
              onChange={(event) => set('about', 'heading', event.target.value)}
              className={styles.input}
              maxLength={80}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Story</span>
            <textarea
              value={content.about.paragraph}
              onChange={(event) => set('about', 'paragraph', event.target.value)}
              rows={5}
              className={styles.textarea}
            />
          </label>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Contact details</h2>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Phone</span>
              <input
                type="text"
                value={content.contact.phone}
                onChange={(event) => set('contact', 'phone', event.target.value)}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>WhatsApp</span>
              <input
                type="text"
                value={content.contact.whatsapp}
                onChange={(event) => set('contact', 'whatsapp', event.target.value)}
                className={styles.input}
              />
            </label>
          </div>

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                type="email"
                value={content.contact.email}
                onChange={(event) => set('contact', 'email', event.target.value)}
                className={styles.input}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Address</span>
              <input
                type="text"
                value={content.contact.address}
                onChange={(event) => set('contact', 'address', event.target.value)}
                className={styles.input}
              />
            </label>
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Instagram handle</span>
            <input
              type="text"
              value={content.contact.instagram}
              onChange={(event) => set('contact', 'instagram', event.target.value)}
              className={styles.input}
              placeholder="@sheshape_rw"
            />
          </label>
        </section>

        <div className={styles.actions}>
          <button type="submit" disabled={saving} className={styles.primary}>
            <Check size={16} />
            {saving ? 'Saving' : 'Save home page'}
          </button>
        </div>
      </form>
    </div>
  )
}
