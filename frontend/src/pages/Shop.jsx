import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { useDebounced } from '../hooks/useDebounced.js'
import ProductCard from '../components/ProductCard.jsx'
import Loading from '../components/Loading.jsx'
import Empty from '../components/Empty.jsx'
import styles from './Shop.module.css'

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = searchParams.get('category') || ''
  const page = Number(searchParams.get('page')) || 1

  const [term, setTerm] = useState(searchParams.get('search') || '')
  const search = useDebounced(term)

  const categories = useApi('/products/categories')
  const products = useApi('/products', {
    page,
    limit: 12,
    category: category || undefined,
    search: search || undefined
  })

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    setSearchParams(next)
  }

  const selectCategory = (value) => updateParams({ category: value, page: null })

  const changeSearch = (value) => {
    setTerm(value)
    updateParams({ search: value || null, page: null })
  }

  return (
    <div className="page">
      <header className={styles.header}>
        <h1 className={styles.title}>Shop</h1>
        <p className={styles.subtitle}>
          Everything you need for training, picked by the She Shape team.
        </p>
      </header>

      <div className={styles.controls}>
        <div className={styles.filters}>
          <button
            type="button"
            onClick={() => selectCategory('')}
            className={category ? styles.chip : `${styles.chip} ${styles.chipActive}`}
          >
            All
          </button>
          {(categories.data ?? []).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectCategory(item.slug)}
              className={
                category === item.slug ? `${styles.chip} ${styles.chipActive}` : styles.chip
              }
            >
              {item.name}
            </button>
          ))}
        </div>

        <input
          type="search"
          className={styles.search}
          placeholder="Search products"
          value={term}
          onChange={(event) => changeSearch(event.target.value)}
          aria-label="Search products"
        />
      </div>

      {products.loading && <Loading label="Loading products" />}

      {products.error && !products.loading && (
        <Empty title="We could not load the shop" message={products.error} />
      )}

      {!products.loading && !products.error && products.data?.length === 0 && (
        <Empty
          title="Nothing here yet"
          message="No products match this filter. Try another category or clear your search."
        />
      )}

      {!products.loading && !products.error && products.data?.length > 0 && (
        <>
          <div className={styles.grid}>
            {products.data.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {products.meta?.pages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                className="btn btn-outline"
                disabled={page <= 1}
                onClick={() => updateParams({ page: String(page - 1) })}
              >
                Previous
              </button>
              <span className={styles.pageInfo}>
                Page {products.meta.page} of {products.meta.pages}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                disabled={page >= products.meta.pages}
                onClick={() => updateParams({ page: String(page + 1) })}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
