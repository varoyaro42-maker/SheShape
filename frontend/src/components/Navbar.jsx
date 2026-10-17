import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/cart-context.js'
import { useAuth } from '../context/auth-context.js'
import { useMobileMenu } from '../hooks/useMobileMenu.js'
import styles from './Navbar.module.css'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/programs', label: 'Programs' },
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' }
]

export default function Navbar() {
  const { count } = useCart()
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const menu = useMobileMenu()

  const handleLogout = async () => {
    menu.close()
    await logout()
    navigate('/')
  }

  const portalPath = isAdmin ? '/admin' : '/dashboard'
  const cartTo = user ? '/dashboard/cart' : '/login'
  const cartState = user ? undefined : { from: { pathname: '/dashboard/cart' } }
  const cartLabel = count > 0 ? `Cart, ${count} items` : 'Cart'

  return (
    <header className={styles.header}>
      <div className={`page ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="She Shape Wellness home">
          <img src="/brand/logo-white.svg" alt="She Shape Wellness" className={styles.brandLogo} />
        </Link>

        {/* Phone-only controls: the cart stays one tap away, the rest folds into the menu. */}
        <div className={styles.mobileActions}>
          {!isAdmin && (
            <Link to={cartTo} state={cartState} className={styles.mobileCart} aria-label={cartLabel}>
              <ShoppingBag size={21} />
              {count > 0 && <span className={styles.badge}>{count}</span>}
            </Link>
          )}
          <button
            type="button"
            className={styles.menuButton}
            onClick={menu.toggle}
            aria-expanded={menu.open}
            aria-controls="site-menu"
            aria-label={menu.open ? 'Close menu' : 'Open menu'}
          >
            {menu.open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <nav id="site-menu" className={menu.open ? `${styles.nav} ${styles.navOpen}` : styles.nav}>
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.active}` : styles.link
              }
            >
              {link.label}
            </NavLink>
          ))}

          <div className={styles.tools}>
            {!isAdmin && (
              <Link to={cartTo} state={cartState} className={styles.cart}>
                Cart
                {count > 0 && (
                  <span className={styles.badge} aria-label={`${count} items in cart`}>
                    {count}
                  </span>
                )}
              </Link>
            )}
            {user ? (
              <div className={styles.account}>
                <Link className={styles.accountName} to={portalPath}>
                  {user.name.split(' ')[0]}
                </Link>
                <button className={styles.logout} type="button" onClick={handleLogout}>
                  Log out
                </button>
              </div>
            ) : (
              <Link className={styles.login} to="/login">
                Log in
              </Link>
            )}
          </div>
        </nav>
      </div>

      {menu.open && (
        <button type="button" className={styles.backdrop} aria-label="Close menu" onClick={menu.close} />
      )}
    </header>
  )
}
