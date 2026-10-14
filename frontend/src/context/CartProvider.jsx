import { useEffect, useMemo, useReducer } from 'react'
import { CartContext } from './cart-context.js'

const STORAGE_KEY = 'sheshape.cart.v1'

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
      id: item.id,
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
      const { product, quantity } = action
      const existing = items.find((item) => item.id === product.id)

      if (existing) {
        return items.map((item) =>
          item.id === product.id
            ? { ...item, quantity: clamp(item.quantity + quantity, product.stock) }
            : item
        )
      }

      return [
        ...items,
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          image: product.images?.[0]?.url ?? null,
          stock: product.stock,
          quantity: clamp(quantity, product.stock)
        }
      ]
    }

    case 'update':
      return items.map((item) =>
        item.id === action.id ? { ...item, quantity: clamp(action.quantity, item.stock) } : item
      )

    case 'remove':
      return items.filter((item) => item.id !== action.id)

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
      addItem: (product, quantity = 1) => dispatch({ type: 'add', product, quantity }),
      updateQuantity: (id, quantity) => dispatch({ type: 'update', id, quantity }),
      removeItem: (id) => dispatch({ type: 'remove', id }),
      clearCart: () => dispatch({ type: 'clear' }),
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    }),
    [items]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
