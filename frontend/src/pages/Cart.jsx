import { Link } from 'react-router-dom'
import { useCart } from '../context/cart-context.js'
import { formatPrice } from '../utils/format.js'
import CartItem from '../components/CartItem.jsx'
import Empty from '../components/Empty.jsx'
import styles from './Cart.module.css'

export default function Cart() {
  const { items, count, total, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="page">
        <Empty
          title="Your cart is empty"
          message="Browse the shop and add something you like. It will still be here when you come back."
        >
          <Link to="/dashboard/shop" className="btn">
            Go to shop
          </Link>
        </Empty>
      </div>
    )
  }

  return (
    <div className="page">
      <header className={styles.header}>
        <h1 className={styles.title}>Your cart</h1>
        <button type="button" className={styles.clear} onClick={clearCart}>
          Clear cart
        </button>
      </header>

      <div className={styles.layout}>
        <section className={styles.items}>
          {items.map((item) => (
            <CartItem key={item.key} item={item} />
          ))}
        </section>

        <aside className={styles.summary}>
          <h2 className={styles.summaryTitle}>Summary</h2>
          <div className={styles.line}>
            <span>Items</span>
            <span>{count}</span>
          </div>
          <div className={styles.line}>
            <span>Delivery</span>
            <span>Arranged after ordering</span>
          </div>
          <div className={styles.total}>
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <Link className={`btn ${styles.checkout}`} to="/dashboard/checkout">
            Checkout
          </Link>
          <p className={styles.note}>We confirm every order by phone before dispatch.</p>
        </aside>
      </div>
    </div>
  )
}
