import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Tag, Package, Pencil, Trash2, ListFilter, CircleCheck } from 'lucide-react'
import { adminProducts, adminCategories } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import { formatPrice } from '../../utils/format.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import FilterSelect from '../../components/FilterSelect.jsx'
import styles from './Products.module.css'

const LIMIT = 20

export default function AdminProductsPage() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const [page, setPage] = useState(1)
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState([])
  const [published, setPublished] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 350)

  useEffect(() => {
    adminCategories.list().then(setCategories).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = { page, limit: LIMIT }
      if (categoryId) params.categoryId = categoryId
      if (published) params.published = published
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()

      const result = await adminProducts.list(params)
      setRows(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }, [page, categoryId, published, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [categoryId, published, debouncedSearch])

  async function togglePublished(product) {
    setBusyId(product.id)
    setError('')

    try {
      const updated = await adminProducts.update(product.id, {
        isPublished: !product.isPublished
      })
      setRows((current) =>
        current.map((row) => (row.id === updated.id ? { ...row, ...updated } : row))
      )
      showToast(`${updated.name} ${updated.isPublished ? 'published' : 'unpublished'}.`)
    } catch (err) {
      setError(readError(err))
    } finally {
      setBusyId(null)
    }
  }

  async function destroy(product) {
    setBusyId(product.id)
    setError('')

    try {
      await adminProducts.remove(product.id)
      setConfirmId(null)
      showToast(`${product.name} was deleted.`)
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
          <h1 className={styles.title}>Products</h1>
          <p className={styles.subtitle}>
            {meta ? `${meta.total} product${meta.total === 1 ? '' : 's'}` : 'Loading'}
          </p>
        </div>

        <Link to="/admin/products/new" className={styles.primary}>
          <Plus size={16} />
          New product
        </Link>
      </header>

      <div className={styles.filters}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name"
          className={styles.search}
        />

        <FilterSelect
          icon={ListFilter}
          value={categoryId}
          onChange={setCategoryId}
          options={[
            { value: '', label: 'All categories' },
            ...categories.map((cat) => ({ value: cat.id, label: cat.name }))
          ]}
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

      {!loading && rows.length === 0 && (
        <Empty message="No products match these filters." />
      )}

      {!loading && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thumbCol} />
                <th>Name</th>
                <th>Category</th>
                <th className={styles.numCol}>Price</th>
                <th className={styles.numCol}>Stock</th>
                <th>Status</th>
                <th className={styles.actionCol} />
              </tr>
            </thead>

            <tbody>
              {rows.map((product) => {
                const cover = product.images?.[0]?.url
                const busy = busyId === product.id

                return (
                  <tr key={product.id} className={busy ? styles.busy : undefined}>
                    <td>
                      {cover ? (
                        <img src={cover} alt="" className={styles.thumb} />
                      ) : (
                        <span className={styles.thumbEmpty}>
                          <Package size={16} />
                        </span>
                      )}
                    </td>

                    <td>
                      <Link to={`/admin/products/${product.id}`} className={styles.name}>
                        {product.name}
                      </Link>
                      <span className={styles.slug}>{product.slug}</span>
                    </td>

                    <td>
                      {product.category ? (
                        <span className={styles.categoryChip}>
                          <Tag size={12} />
                          {product.category.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className={styles.numCol}>{formatPrice(product.price)}</td>

                    <td className={styles.numCol}>
                      <span className={product.stock === 0 ? styles.stockOut : undefined}>
                        {product.stock}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => togglePublished(product)}
                        className={
                          product.isPublished
                            ? `${styles.badge} ${styles.badgeLive}`
                            : `${styles.badge} ${styles.badgeDraft}`
                        }
                      >
                        {product.isPublished ? 'Published' : 'Draft'}
                      </button>
                    </td>

                    <td className={styles.actionCol}>
                      {confirmId === product.id ? (
                        <span className={styles.confirm}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => destroy(product)}
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
                        <span className={styles.confirm}>
                          <Link
                            to={`/admin/products/${product.id}`}
                            className={styles.iconGhost}
                            title="Edit product"
                            aria-label="Edit product"
                          >
                            <Pencil size={15} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmId(product.id)}
                            className={styles.iconGhost}
                            title="Delete product"
                            aria-label="Delete product"
                          >
                            <Trash2 size={15} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
