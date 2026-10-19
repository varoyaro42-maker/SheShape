import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Check, Tag } from 'lucide-react'
import { adminProducts, adminCategories } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import ImageUploader from '../../components/ImageUploader.jsx'
import Loading from '../../components/Loading.jsx'
import FilterSelect from '../../components/FilterSelect.jsx'
import styles from './ProductForm.module.css'

const NEW_CATEGORY = '__new__'

const BLANK = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  stock: '0',
  sizes: '',
  isPublished: false
}

export default function AdminProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const isNew = !id

  const [fields, setFields] = useState(BLANK)
  const [images, setImages] = useState([])
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [categories, setCategories] = useState([])
  const [addingCategory, setAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [categorySaving, setCategorySaving] = useState(false)
  const [categoryError, setCategoryError] = useState('')

  useEffect(() => {
    let active = true

    adminCategories
      .list()
      .then((list) => active && setCategories(list))
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (isNew) return

    let active = true

    adminProducts
      .detail(id)
      .then((product) => {
        if (!active) return
        setFields({
          name: product.name,
          description: product.description,
          price: String(product.price),
          categoryId: product.category?.id ?? '',
          stock: String(product.stock),
          sizes: (product.sizes ?? []).join(', '),
          isPublished: product.isPublished
        })
        setImages(product.images ?? [])
        setSlug(product.slug)
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

  function handleCategorySelect(value) {
    if (value === NEW_CATEGORY) {
      setAddingCategory(true)
      setCategoryError('')
      return
    }

    set('categoryId', value)
  }

  async function createCategory() {
    const name = newCategoryName.trim()
    if (!name) {
      setCategoryError('Category name is required.')
      return
    }

    setCategorySaving(true)
    setCategoryError('')

    try {
      const category = await adminCategories.create({ name })
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name)))
      set('categoryId', category.id)
      setAddingCategory(false)
      setNewCategoryName('')
    } catch (err) {
      setCategoryError(readError(err))
    } finally {
      setCategorySaving(false)
    }
  }

  async function addImage(url) {
    if (isNew) {
      setImages((current) => [...current, { id: url, url, color: '', colorHex: '' }])
      return
    }

    const image = await adminProducts.attachImage(id, { url })
    setImages((current) => [...current, image])
  }

  async function removeImage(image) {
    if (isNew) {
      setImages((current) => current.filter((item) => item.id !== image.id))
      return
    }

    await adminProducts.detachImage(id, image.id)
    setImages((current) => current.filter((item) => item.id !== image.id))
  }

  async function updateImageColor(image, { color }) {
    setImages((current) =>
      current.map((item) => (item.id === image.id ? { ...item, color } : item))
    )

    if (isNew) return

    try {
      await adminProducts.updateImage(id, image.id, { color })
    } catch (err) {
      applyError(err)
    }
  }

  function applyError(err) {
    setError(readError(err))

    const details = err?.response?.data?.details
    if (Array.isArray(details)) {
      setFieldErrors(
        Object.fromEntries(details.map((item) => [item.field, item.message]))
      )
    }
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setFieldErrors({})

    const payload = {
      name: fields.name,
      description: fields.description,
      price: fields.price,
      categoryId: fields.categoryId,
      stock: fields.stock,
      sizes: fields.sizes,
      isPublished: fields.isPublished
    }

    try {
      if (isNew) {
        payload.images = images.map((image) => ({ url: image.url, color: image.color || undefined }))
        const created = await adminProducts.create(payload)
        showToast(`"${created.name}" created.`)
        navigate(`/admin/products/${created.id}`, { replace: true })
      } else {
        const updated = await adminProducts.update(id, payload)
        showToast(`"${updated.name}" updated.`)
        navigate('/admin/products')
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
          <h1 className={styles.title}>{isNew ? 'New product' : fields.name}</h1>
          {slug && <p className={styles.slug}>{slug}</p>}
        </div>

        <Link to="/admin/products" className={styles.back}>
          Back to products
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
              maxLength={160}
              className={styles.input}
            />
            {fieldErrors.name && <span className={styles.hint}>{fieldErrors.name}</span>}
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

          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Price in RWF</span>
              <input
                type="number"
                min="0"
                step="500"
                value={fields.price}
                onChange={(event) => set('price', event.target.value)}
                className={styles.input}
              />
              {fieldErrors.price && (
                <span className={styles.hint}>{fieldErrors.price}</span>
              )}
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Stock</span>
              <input
                type="number"
                min="0"
                step="1"
                value={fields.stock}
                onChange={(event) => set('stock', event.target.value)}
                className={styles.input}
              />
              {fieldErrors.stock && (
                <span className={styles.hint}>{fieldErrors.stock}</span>
              )}
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Sizes</span>
              <input
                type="text"
                value={fields.sizes}
                onChange={(event) => set('sizes', event.target.value)}
                placeholder="S, M, L, XL"
                className={styles.input}
              />
              <span className={styles.hint}>
                {fieldErrors.sizes ||
                  'Separate with commas. Customers must pick one. Leave empty for products without sizes. Colours come from the colour you give each photo below.'}
              </span>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Category</span>
              {addingCategory ? (
                <div className={styles.categoryRow}>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="New category name"
                    maxLength={80}
                    className={styles.input}
                    autoFocus
                  />
                  <button
                    type="button"
                    className={styles.smallButton}
                    onClick={createCategory}
                    disabled={categorySaving}
                  >
                    <Check size={14} />
                    {categorySaving ? 'Saving' : 'Add'}
                  </button>
                  <button
                    type="button"
                    className={styles.smallButton}
                    onClick={() => {
                      setAddingCategory(false)
                      setNewCategoryName('')
                      setCategoryError('')
                    }}
                    disabled={categorySaving}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <FilterSelect
                  icon={Tag}
                  value={fields.categoryId}
                  onChange={handleCategorySelect}
                  placeholder="Select a category"
                  fullWidth
                  options={[
                    ...categories.map((category) => ({ value: category.id, label: category.name })),
                    { value: NEW_CATEGORY, label: '+ Create new category…' }
                  ]}
                />
              )}
              {categoryError && <span className={styles.hint}>{categoryError}</span>}
              {fieldErrors.categoryId && (
                <span className={styles.hint}>{fieldErrors.categoryId}</span>
              )}
            </label>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Images</h2>

          <ImageUploader
            images={images}
            onAdd={addImage}
            onRemove={removeImage}
            onColorChange={updateImageColor}
            max={40}
            disabled={saving}
          />
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
                Published products appear in the shop. A product needs at least one image
                before it can be published.
              </span>
            </span>
          </label>

          {fieldErrors.isPublished && (
            <p className={styles.hint}>{fieldErrors.isPublished}</p>
          )}
        </section>

        <div className={styles.actions}>
          <button type="submit" disabled={saving} className={styles.primary}>
            <Check size={16} />
            {saving ? 'Saving' : isNew ? 'Create product' : 'Save changes'}
          </button>

          <Link to="/admin/products" className={styles.ghost}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
