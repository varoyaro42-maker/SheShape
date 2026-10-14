import { Link } from 'react-router-dom'
import { useCart } from '../context/cart-context.js'
import { formatPrice } from '../utils/format.js'
import QuantityStepper from './QuantityStepper.jsx'
import styles from './CartItem.module.css'

export default function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCart()

  return (
    <article className={styles.row}>
      <div className={styles.media}>
        {item.image && <img src={item.image} alt={item.name} width="192" height="192" />}
      </div>

      <div className={styles.info}>
        <Link to={`/dashboard/product/${item.slug}`} className={styles.name}>
          {item.name}
        </Link>
        <span className={styles.unit}>{formatPrice(item.price)} each</span>
        <div className={styles.controls}>
          <QuantityStepper
            value={item.quantity}
            max={item.stock}
            onChange={(quantity) => updateQuantity(item.id, quantity)}
            label={`Quantity for ${item.name}`}
          />
          <button type="button" className={styles.remove} onClick={() => removeItem(item.id)}>
            Remove
          </button>
        </div>
      </div>

      <span className={styles.subtotal}>{formatPrice(item.price * item.quantity)}</span>
    </article>
  )
}
