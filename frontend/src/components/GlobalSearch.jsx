import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Package, ClipboardList } from 'lucide-react'
import { adminSearch } from '../api/admin.js'
import { formatPrice } from '../utils/format.js'
import { useDebounced } from '../hooks/useDebounced.js'
import styles from './GlobalSearch.module.css'

export default function GlobalSearch() {
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const debounced = useDebounced(term, 300)
  const wrapRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return

    function handleClick(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) setOpen(false)
    }

    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => {
    const query = debounced.trim()

    if (query.length < 2) {
      setResults(null)
      return
    }

    let active = true
    setLoading(true)

    adminSearch
      .query(query)
      .then((data) => active && setResults(data))
      .catch(() => active && setResults({ users: [], products: [], orders: [] }))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [debounced])

  function go(path) {
    setOpen(false)
    setTerm('')
    setResults(null)
    navigate(path)
  }

  const hasResults =
    results && (results.users.length > 0 || results.products.length > 0 || results.orders.length > 0)

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.field}>
        <Search size={16} className={styles.icon} />
        <input
          type="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search users, products, orders…"
          aria-label="Search users, products, orders"
        />
      </div>

      {open && term.trim().length >= 2 && (
        <div className={styles.panel}>
          {loading && <p className={styles.empty}>Searching…</p>}

          {!loading && results && !hasResults && (
            <p className={styles.empty}>No matches for "{term.trim()}".</p>
          )}

          {!loading && results?.users.length > 0 && (
            <div className={styles.group}>
              <span className={styles.groupLabel}>Customers</span>
              {results.users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className={styles.result}
                  onClick={() => go(`/admin/users/${user.id}`)}
                >
                  <Users size={15} className={styles.resultIcon} />
                  <span>
                    <span className={styles.resultTitle}>{user.name}</span>
                    <span className={styles.resultMeta}>{user.email}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && results?.products.length > 0 && (
            <div className={styles.group}>
              <span className={styles.groupLabel}>Products</span>
              {results.products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={styles.result}
                  onClick={() => go(`/admin/products/${product.id}`)}
                >
                  <Package size={15} className={styles.resultIcon} />
                  <span>
                    <span className={styles.resultTitle}>{product.name}</span>
                    <span className={styles.resultMeta}>{formatPrice(product.price)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!loading && results?.orders.length > 0 && (
            <div className={styles.group}>
              <span className={styles.groupLabel}>Orders</span>
              {results.orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className={styles.result}
                  onClick={() => go(`/admin/orders/${order.id}`)}
                >
                  <ClipboardList size={15} className={styles.resultIcon} />
                  <span>
                    <span className={styles.resultTitle}>{order.orderNumber}</span>
                    <span className={styles.resultMeta}>{order.customerName}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
