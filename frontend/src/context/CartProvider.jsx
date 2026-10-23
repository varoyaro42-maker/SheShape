import { useEffect, useMemo, useReducer } from 'react'
import { CartContext } from './cart-context.js'

const STORAGE_KEY = 'sheshape.cart.v1'

// One cart line per product + colour + size.
const lineKey = (id, color, size) => `${id}|${color ?? ''}|${size ?? ''}`

function sanitize(raw) {
  if (!Array.isArray(raw)) return []

  return raw
    .filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        Number.isInteger(item.price) &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    )
    .map((item) => ({
      key: lineKey(item.id, item.color, item.size),
      id: item.id,
      color: typeof item.color === 'string' && item.color ? item.color : null,
      size: typeof item.size === 'string' && item.size ? item.size : null,
      slug: String(item.slug ?? ''),
      name: String(item.name ?? ''),
      price: item.price,
      image: item.image ?? null,
      stock: Number.isInteger(item.stock) ? item.stock : 0,
      quantity: item.quantity
    }))
}

function loadItems() {
  try {
    return sanitize(JSON.parse(window.localStorage.getItem(STORAGE_KEY)))
  } catch {
    return []
  }
}

function clamp(value, max) {
  if (max <= 0) return 0
  return Math.max(1, Math.min(value, max))
}

function reducer(items, action) {
  switch (action.type) {
    case 'add': {
      const { product, quantity, color = null, size = null } = action
      const key = lineKey(product.id, color, size)
      // Stock is per product, shared by all its colours and sizes.
      const elsewhere = items.filter((item) => item.id === product.id && item.key !== key).reduce((sum, item) => sum + item.quantity, 0)
      const room = Math.max(0, product.stock - elsewhere)
      const existing = items.find((item) => item.key === key)

      if (existing) {
        return items.map((item) =>
          item.key === key ? { ...item, quantity: clamp(item.quantity + quantity, room) } : item
        )
      }

      if (room <= 0) return items

      return [
        ...items,
        {
          key,
          id: product.id,
          color,
          size,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: (color && product.images?.find((image) => image.color === color)?.url) || product.images?.[0]?.url || null,
          stock: product.stock,
          quantity: clamp(quantity, room)
        }
      ]
    }

    case 'update':
      return items.map((item) =>
        item.key === action.key ? { ...item, quantity: clamp(action.quantity, item.stock) } : item
      )

    case 'remove':
      return items.filter((item) => item.key !== action.key)

    case 'clear':
      return []

    default:
      return items
  }
}

export default function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, loadItems)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const value = useMemo(
    () => ({
      items,
      addItem: (product, quantity = 1, { color = null, size = null } = {}) => dispatch({ type: 'add', product, quantity, color, size }),
      updateQuantity: (key, quantity) => dispatch({ type: 'update', key, quantity }),
      removeItem: (key) => dispatch({ type: 'remove', key }),
      clearCart: () => dispatch({ type: 'clear' }),
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    }),
    [items]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
