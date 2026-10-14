import { Link } from 'react-router-dom'
import { ShoppingCart, Bell, LayoutGrid } from 'lucide-react'
import styles from './TopbarIcons.module.css'

export default function TopbarIcons({
  quickLinks = [],
  cartCount,
  avatarTo,
  avatarUrl,
  avatarInitial = '?'
}) {
  return (
    <div className={styles.iconRow}>
      {typeof cartCount === 'number' && (
        <Link to="/dashboard/cart" className={styles.iconButton} aria-label={`Cart, ${cartCount} items`}>
          <ShoppingCart size={18} />
          {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
        </Link>
      )}

      <details className={`${styles.popover} ${styles.optional}`}>
        <summary className={styles.iconButton} aria-label="Notifications">
          <Bell size={18} />
        </summary>
        <div className={styles.panel}>
          <p className={styles.panelEmpty}>You're all caught up — no new notifications.</p>
        </div>
      </details>

      {quickLinks.length > 0 && (
        <details className={`${styles.popover} ${styles.optional}`}>
          <summary className={styles.iconButton} aria-label="Quick links">
            <LayoutGrid size={18} />
          </summary>
          <div className={styles.panel}>
            {quickLinks.map((link) => (
              <Link key={link.to} to={link.to} className={styles.panelLink}>
                {link.label}
              </Link>
            ))}
          </div>
        </details>
      )}

      <Link to={avatarTo} className={styles.avatarButton} aria-label="Account settings">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{avatarInitial}</span>}
      </Link>
    </div>
  )
}
