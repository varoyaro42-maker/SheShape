import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { useCart } from '../context/cart-context.js'
import { useAuth } from '../context/auth-context.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import { formatPrice } from '../utils/format.js'
import { rememberReturn, readReturn, clearReturn } from '../utils/afterLogin.js'
import QuantityStepper from '../components/QuantityStepper.jsx'
import Loading from '../components/Loading.jsx'
import Empty from '../components/Empty.jsx'
import styles from './Product.module.css'

export default function Product() {
  const { slug } = useParams()
  const { data: product, loading, error } = useApi(`/products/${slug}`)
  const { addItem } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const to = usePortalPath()

  const [activeImage, setActiveImage] = useState(0)
  const [activeColor, setActiveColor] = useState(null)
  const [size, setSize] = useState(null)
  const [choiceError, setChoiceError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setActiveImage(0)
    setActiveColor(null)
    setSize(null)
    setChoiceError('')
    setQuantity(1)
    setAdded(false)
  }, [slug])

  // Back from signing in: add what she had chosen, once.
  useEffect(() => {
    if (!user || !product || user.role === 'admin') return
    const pending = readReturn()?.item
    if (!pending || pending.slug !== product.slug) return
    clearReturn()
    const stillThere = (value, list) => (value && list.includes(value) ? value : null)
    const colorList = [...new Set((product.images ?? []).map((image) => image.color).filter(Boolean))]
    const color = stillThere(pending.color, colorList)
    const pendingSize = stillThere(pending.size, product.sizes ?? [])
    if (product.stock < 1 || (colorList.length && !color) || ((product.sizes ?? []).length && !pendingSize)) return
    setActiveColor(color)
    setSize(pendingSize)
    addItem(product, Math.max(1, Number(pending.quantity) || 1), { color, size: pendingSize })
    setAdded(true)
  }, [user, product, addItem])

  useEffect(() => {
    if (!added) return
    const timer = setTimeout(() => setAdded(false), 2500)
    return () => clearTimeout(timer)
  }, [added])

  if (loading) {
    return (
      <div className="page">
        <Loading label="Loading product" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="page">
        <Empty title="Product not found" message={error}>
          <Link to={to('/shop')} className="btn">
            Back to shop
          </Link>
        </Empty>
      </div>
    )
  }

  const allImages = product.images ?? []
  const colors = [...new Set(allImages.map((image) => image.color).filter(Boolean))]
  const visibleImages = activeColor ? allImages.filter((image) => image.color === activeColor) : allImages
  const images = visibleImages.length ? visibleImages : allImages
  const cover = images[activeImage]?.url
  const soldOut = product.stock === 0

  const swatchHex = (color) => allImages.find((image) => image.color === color)?.colorHex || null

  const sizes = product.sizes ?? []

  const handleSelectColor = (color) => {
    setActiveColor(color)
    setActiveImage(0)
    setChoiceError('')
  }

  const handleAdd = () => {
    const missing = [colors.length && !activeColor ? 'a colour' : null, sizes.length && !size ? 'a size' : null].filter(Boolean)
    if (missing.length) {
      setChoiceError(`Choose ${missing.join(' and ')} first.`)
      return
    }

    if (!user) {
      // Come back to this product after signing in, with her choice already in the cart.
      const back = `/dashboard/product/${product.slug}`
      rememberReturn(back, { slug: product.slug, color: activeColor, size, quantity })
      navigate('/login', { state: { from: { pathname: back } } })
      return
    }

    addItem(product, quantity, { color: activeColor, size })
    setAdded(true)
  }

  return (
    <div className="page">
      <Link to={to('/shop')} className={styles.back}>
        ← Back to shop
      </Link>

      <div className={styles.layout}>
        <div className={styles.gallery}>
          <div className={styles.mainImage}>
            {cover && <img src={cover} alt={product.name} width="900" height="900" />}
          </div>
          {images.length > 1 && (
            <div className={styles.thumbs}>
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActiveImage(index)}
                  aria-label={`View image ${index + 1}`}
                  className={
                    index === activeImage ? `${styles.thumb} ${styles.thumbActive}` : styles.thumb
                  }
                >
                  <img src={image.url} alt="" width="160" height="160" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.details}>
          {product.category && <span className={styles.category}>{product.category.name}</span>}
          <h1 className={styles.name}>{product.name}</h1>
          <span className={styles.price}>{formatPrice(product.price)}</span>
          <p className={styles.description}>{product.description}</p>
          <span className={soldOut ? `${styles.stock} ${styles.stockOut}` : styles.stock}>
            {soldOut ? 'Out of stock' : `${product.stock} in stock`}
          </span>

          {!soldOut && colors.length > 0 && (
            <div className={styles.choice}>
              <span className={styles.choiceLabel}>
                Colour{activeColor ? <strong>: {activeColor}</strong> : null}
              </span>
              <div className={styles.swatches}>
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleSelectColor(color)}
                    aria-pressed={activeColor === color}
                    className={activeColor === color ? `${styles.swatch} ${styles.swatchActive}` : styles.swatch}
                  >
                    {swatchHex(color) && (
                      <span className={styles.swatchDot} style={{ background: swatchHex(color) }} />
                    )}
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!soldOut && sizes.length > 0 && (
            <div className={styles.choice}>
              <span className={styles.choiceLabel}>
                Size{size ? <strong>: {size}</strong> : null}
              </span>
              <div className={styles.swatches}>
                {sizes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSize(option)
                      setChoiceError('')
                    }}
                    aria-pressed={size === option}
                    className={size === option ? `${styles.swatch} ${styles.sizeButton} ${styles.swatchActive}` : `${styles.swatch} ${styles.sizeButton}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          )}

          {choiceError && (
            <p className={styles.choiceError} role="alert">
              {choiceError}
            </p>
          )}

          {!soldOut && (
            <div className={styles.actions}>
              <QuantityStepper value={quantity} max={product.stock} onChange={setQuantity} />
              <button type="button" className="btn" onClick={handleAdd}>
                {user ? 'Add to cart' : 'Log in to add to cart'}
              </button>
            </div>
          )}

          {added && (
            <p className={styles.added} role="status">
              Added to your cart. <Link to="/dashboard/cart">View cart</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
