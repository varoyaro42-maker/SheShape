import { useEffect, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { adminHome } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import HomeImageUploader from '../../components/HomeImageUploader.jsx'
import Loading from '../../components/Loading.jsx'
import styles from './ProductForm.module.css'

const BLANK = {
  hero: { eyebrow: '', title: '', script: '', paragraph: '', primaryButtonLabel: '', secondaryButtonLabel: '', imageUrl: '' },
  stats: [],
  featured: { eyebrow: '', heading: '', script: '', paragraph: '', tags: [], buttonLabel: '' },
  program: { eyebrow: '', buttonLabel: '' },
  app: { enabled: true, eyebrow: '', heading: '', script: '', paragraph: '', features: [], imageUrl: '', demoUrl: '', demoLabel: '' },
  ticker: { enabled: true, items: [] },
  gallery: [],
  tips: [],
  testimonials: [],
  team: [],
  about: { heading: '', paragraph: '', imageUrl: '' },
  contact: { phone: '', email: '', whatsapp: '', instagram: '', address: '' },
  newsletter: { enabled: true, heading: '', paragraph: '' }
}

function Field({ label, hint, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className={styles.field} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={styles.label} style={{ margin: 0 }}>
        {label}
      </span>
    </label>
  )
}

/** Repeatable rows (stats, tips, quotes, team). `fields` describes each row's inputs. */
function ListEditor({ items, onChange, fields, addLabel, blank, disabled }) {
  function update(index, key, value) {
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  }

  function remove(index) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {items.map((item, index) => (
        <div
          key={index}
          style={{
            display: 'grid',
            gap: '0.6rem',
            padding: '0.9rem',
            border: '1px solid var(--admin-line)',
            borderRadius: 10,
            background: 'var(--admin-canvas)'
          }}
        >
          {fields.map((field) =>
            field.type === 'image' ? (
              <HomeImageUploader
                key={field.key}
                label={field.label}
                value={item[field.key] ?? ''}
                onChange={(url) => update(index, field.key, url)}
                disabled={disabled}
              />
            ) : field.type === 'textarea' ? (
              <Field key={field.key} label={field.label}>
                <textarea
                  value={item[field.key] ?? ''}
                  onChange={(event) => update(index, field.key, event.target.value)}
                  rows={field.rows ?? 3}
                  className={styles.textarea}
                  placeholder={field.placeholder}
                />
              </Field>
            ) : (
              <Field key={field.key} label={field.label}>
                <input
                  type="text"
                  value={item[field.key] ?? ''}
                  onChange={(event) => update(index, field.key, event.target.value)}
                  className={styles.input}
                  placeholder={field.placeholder}
                  maxLength={field.max ?? 200}
                />
              </Field>
            )
          )}
          <div>
            <button type="button" onClick={() => remove(index)} className={styles.ghost}>
              <Trash2 size={14} />
              Remove
            </button>
          </div>
        </div>
      ))}

      <div>
        <button type="button" onClick={() => onChange([...items, { ...blank }])} className={styles.ghost}>
          <Plus size={15} />
          {addLabel}
        </button>
      </div>
    </div>
  )
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
      .then((data) => active && setContent({ ...BLANK, ...data }))
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  function set(section, key, value) {
    setContent((current) => ({ ...current, [section]: { ...current[section], [key]: value } }))
  }

  function setList(section, value) {
    setContent((current) => ({ ...current, [section]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const updated = await adminHome.update(content)
      setContent({ ...BLANK, ...updated })
      showToast('Site content updated.')
    } catch (err) {
      setError(readError(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading />

  const text = (section, key, props = {}) => (
    <input
      type="text"
      value={content[section][key] ?? ''}
      onChange={(event) => set(section, key, event.target.value)}
      className={styles.input}
      {...props}
    />
  )

  const area = (section, key, rows = 3) => (
    <textarea
      value={content[section][key] ?? ''}
      onChange={(event) => set(section, key, event.target.value)}
      rows={rows}
      className={styles.textarea}
    />
  )

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Site content</h1>
          <p className={styles.slug}>Everything editable on the home page, about page and footer.</p>
        </div>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      <form onSubmit={submit} className={styles.form} noValidate>
        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Hero</h2>
          <HomeImageUploader label="Hero photo" value={content.hero.imageUrl} onChange={(url) => set('hero', 'imageUrl', url)} disabled={saving} />
          <Field label="Small line above the headline">{text('hero', 'eyebrow', { maxLength: 80 })}</Field>
          <Field label="Headline">{text('hero', 'title', { maxLength: 120 })}</Field>
          <Field label="Paragraph">{area('hero', 'paragraph')}</Field>
          <div className={styles.row}>
            <Field label="Primary button" hint="Links to programs.">{text('hero', 'primaryButtonLabel', { maxLength: 40 })}</Field>
            <Field label="Secondary button" hint="Links to the shop.">{text('hero', 'secondaryButtonLabel', { maxLength: 40 })}</Field>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Scrolling words</h2>
          <p className={styles.hint}>The band of words that slides under the hero. Short words work best.</p>
          <Toggle label="Show the scrolling band" checked={content.ticker.enabled !== false} onChange={(value) => set('ticker', 'enabled', value)} />
          <Field label="Words (comma separated)">
            <input
              type="text"
              value={(content.ticker.items ?? []).join(', ')}
              onChange={(event) => set('ticker', 'items', event.target.value.split(',').map((word) => word.trim()).filter(Boolean))}
              className={styles.input}
              placeholder="Learn, Grow, Thrive, She Strong Classes, Kigali"
            />
          </Field>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Instagram photos</h2>
          <p className={styles.hint}>A sliding strip of photos near the bottom of the home page. Six to ten square photos look best. Each links to your Instagram unless you give it its own link.</p>
          <ListEditor
            items={content.gallery}
            onChange={(value) => setList('gallery', value)}
            addLabel="Add a photo"
            blank={{ imageUrl: '', caption: '', href: '' }}
            disabled={saving}
            fields={[
              { key: 'imageUrl', label: 'Photo', type: 'image' },
              { key: 'caption', label: 'Caption (shown on hover)', placeholder: 'Saturday session, Remera', max: 80 },
              { key: 'href', label: 'Link (optional)', placeholder: 'https://instagram.com/p/…', max: 300 }
            ]}
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Numbers that matter</h2>
          <p className={styles.hint}>Shown under the hero and on the about page. Keep them true: "250+", "4", "2026".</p>
          <ListEditor
            items={content.stats}
            onChange={(value) => setList('stats', value)}
            addLabel="Add a number"
            blank={{ value: '', label: '' }}
            disabled={saving}
            fields={[
              { key: 'value', label: 'Number', placeholder: '250+', max: 20 },
              { key: 'label', label: 'What it is', placeholder: 'women in the community', max: 80 }
            ]}
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Nkondo Active promo</h2>
          <p className={styles.hint}>The product shown comes from your most recently added product.</p>
          <Field label="Small line">{text('featured', 'eyebrow', { maxLength: 80 })}</Field>
          <Field label="Heading">{text('featured', 'heading', { maxLength: 80 })}</Field>
          <Field label="Subheading (italic)">{text('featured', 'script', { maxLength: 80 })}</Field>
          <Field label="Paragraph">{area('featured', 'paragraph')}</Field>
          <Field label="Tags (comma separated)">
            <input
              type="text"
              value={content.featured.tags.join(', ')}
              onChange={(event) => set('featured', 'tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))}
              className={styles.input}
            />
          </Field>
          <Field label="Button label">{text('featured', 'buttonLabel', { maxLength: 40 })}</Field>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Myths and tips</h2>
          <p className={styles.hint}>The dark band on the home page. Three reads best. Remove all to hide it.</p>
          <ListEditor
            items={content.tips}
            onChange={(value) => setList('tips', value)}
            addLabel="Add a tip"
            blank={{ title: '', body: '' }}
            disabled={saving}
            fields={[
              { key: 'title', label: 'Title', placeholder: "Lifting won't make you bulky.", max: 90 },
              { key: 'body', label: 'Body', type: 'textarea', rows: 2 }
            ]}
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>What members say</h2>
          <p className={styles.hint}>Short, real quotes with a first name. Shown on the home and about pages.</p>
          <ListEditor
            items={content.testimonials}
            onChange={(value) => setList('testimonials', value)}
            addLabel="Add a quote"
            blank={{ quote: '', name: '', detail: '' }}
            disabled={saving}
            fields={[
              { key: 'quote', label: 'Quote', type: 'textarea', rows: 3 },
              { key: 'name', label: 'Name', placeholder: 'Ama', max: 60 },
              { key: 'detail', label: 'Detail', placeholder: 'She Strong Classes, since March', max: 80 }
            ]}
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Coaches and team</h2>
          <ListEditor
            items={content.team}
            onChange={(value) => setList('team', value)}
            addLabel="Add a person"
            blank={{ name: '', role: '', bio: '', imageUrl: '' }}
            disabled={saving}
            fields={[
              { key: 'imageUrl', label: 'Photo', type: 'image' },
              { key: 'name', label: 'Name', placeholder: 'Arnoldine Urukundo', max: 80 },
              { key: 'role', label: 'Role', placeholder: 'Co-founder and head coach', max: 80 },
              { key: 'bio', label: 'Short bio', type: 'textarea', rows: 3 }
            ]}
          />
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>About page</h2>
          <HomeImageUploader label="About photo" value={content.about.imageUrl} onChange={(url) => set('about', 'imageUrl', url)} disabled={saving} />
          <Field label="Heading">{text('about', 'heading', { maxLength: 120 })}</Field>
          <Field label="Your story" hint="Leave an empty line between paragraphs.">{area('about', 'paragraph', 7)}</Field>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>App section</h2>
          <Toggle label="Show the app section on the home page" checked={content.app.enabled !== false} onChange={(value) => set('app', 'enabled', value)} />
          <HomeImageUploader label="Phone screenshot" value={content.app.imageUrl} onChange={(url) => set('app', 'imageUrl', url)} disabled={saving} />
          <Field label="Small line">{text('app', 'eyebrow', { maxLength: 80 })}</Field>
          <Field label="Heading">{text('app', 'heading', { maxLength: 80 })}</Field>
          <Field label="Paragraph">{area('app', 'paragraph')}</Field>
          <Field label="Feature list (one per line)">
            <textarea
              value={content.app.features.join('\n')}
              onChange={(event) => set('app', 'features', event.target.value.split('\n').map((line) => line.trim()).filter(Boolean))}
              rows={4}
              className={styles.textarea}
            />
          </Field>
          <div className={styles.row}>
            <Field label="Demo link" hint="Leave blank to hide the button.">{text('app', 'demoUrl', { placeholder: '/app-demo.html' })}</Field>
            <Field label="Demo button label">{text('app', 'demoLabel', { maxLength: 40 })}</Field>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Newsletter</h2>
          <Toggle label="Show newsletter signup on the site" checked={content.newsletter.enabled !== false} onChange={(value) => set('newsletter', 'enabled', value)} />
          <Field label="Heading">{text('newsletter', 'heading', { maxLength: 120 })}</Field>
          <Field label="Paragraph">{text('newsletter', 'paragraph', { maxLength: 160 })}</Field>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Contact details</h2>
          <div className={styles.row}>
            <Field label="Phone">{text('contact', 'phone')}</Field>
            <Field label="WhatsApp number">{text('contact', 'whatsapp')}</Field>
          </div>
          <div className={styles.row}>
            <Field label="Email">{text('contact', 'email', { type: 'email' })}</Field>
            <Field label="Address">{text('contact', 'address')}</Field>
          </div>
          <Field label="Instagram handle">{text('contact', 'instagram', { placeholder: '@sheshape_wellness' })}</Field>
        </section>

        <div className={styles.actions}>
          <button type="submit" disabled={saving} className={styles.primary}>
            <Check size={16} />
            {saving ? 'Saving' : 'Save content'}
          </button>
        </div>
      </form>
    </div>
  )
}
