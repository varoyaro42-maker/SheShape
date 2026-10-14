import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../hooks/useApi.js'
import { useCart } from '../context/cart-context.js'
import { useAuth } from '../context/auth-context.js'
import { usePortalPath } from '../hooks/usePortalPath.js'
import { formatPrice } from '../utils/format.js'
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
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setActiveImage(0)
    setActiveColor(null)
    setQuantity(1)
    setAdded(false)
  }, [slug])

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

  const handleSelectColor = (color) => {
    setActiveColor(color)
    setActiveImage(0)
  }

  const handleAdd = () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/dashboard/cart' } } })
      return
    }

    addItem(product, quantity)
    setAdded(true)
  }

  return (
    <div className="page">
      <Link to={to('/shop')} className={styles.back}>
        ← Back to shop
      </Link>

      <div className={styles.layout}>
        <div className={styles.gallery}>
          {colors.length > 0 && (
            <div className={styles.swatches}>
              <button
                type="button"
                onClick={() => handleSelectColor(null)}
                className={activeColor === null ? `${styles.swatch} ${styles.swatchActive}` : styles.swatch}
              >
                All
              </button>
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleSelectColor(color)}
                  aria-label={color}
                  title={color}
                  className={activeColor === color ? `${styles.swatch} ${styles.swatchActive}` : styles.swatch}
                >
                  {swatchHex(color) && (
                    <span className={styles.swatchDot} style={{ background: swatchHex(color) }} />
                  )}
                  {color}
                </button>
              ))}
            </div>
          )}

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
