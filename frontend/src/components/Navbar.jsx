import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/cart-context.js'
import { useAuth } from '../context/auth-context.js'
import { useMobileMenu } from '../hooks/useMobileMenu.js'
import MegaMenu from './MegaMenu.jsx'
import { MEGA_SECTIONS } from './megaSections.js'
import styles from './Navbar.module.css'
import { returnPathFor } from '../utils/afterLogin.js'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/programs', label: 'Programs' },
  { to: '/events', label: 'Events' },
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' }
]

export default function Navbar() {
  const { count } = useCart()
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const menu = useMobileMenu()

  // Desktop hover menu: opens after a short delay, closes shortly after the pointer leaves.
  const [megaOpen, setMegaOpen] = useState(null)
  const openTimer = useRef(null)
  const closeTimer = useRef(null)

  const clearTimers = useCallback(() => {
    clearTimeout(openTimer.current)
    clearTimeout(closeTimer.current)
  }, [])

  const showMega = useCallback(
    (key) => {
      if (!window.matchMedia('(min-width: 901px) and (hover: hover)').matches) return
      clearTimers()
      openTimer.current = setTimeout(() => setMegaOpen(key), megaOpen ? 0 : 120)
    },
    [clearTimers, megaOpen]
  )

  const hideMega = useCallback(() => {
    clearTimers()
    closeTimer.current = setTimeout(() => setMegaOpen(null), 220)
  }, [clearTimers])

  const keepMega = useCallback(() => clearTimeout(closeTimer.current), [])

  useEffect(() => {
    clearTimers()
    setMegaOpen(null)
  }, [location.pathname, clearTimers])

  useEffect(() => {
    if (!megaOpen) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMegaOpen(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [megaOpen])

  useEffect(() => clearTimers, [clearTimers])

  const handleLogout = async () => {
    menu.close()
    await logout()
    navigate('/')
  }

  const portalPath = isAdmin ? '/admin' : '/dashboard'
  const cartTo = user ? '/dashboard/cart' : '/login'
  const cartState = user ? undefined : { from: { pathname: '/dashboard/cart' } }
  // Back to this page after signing in.
  const loginState = returnPathFor(location.pathname) ? { from: { pathname: returnPathFor(location.pathname) } } : undefined
  const cartLabel = count > 0 ? `Cart, ${count} items` : 'Cart'

  return (
    <header className={styles.header} onMouseLeave={hideMega}>
      <div className={`page ${styles.inner}`}>
        <Link to="/" className={styles.brand} aria-label="She Shape Wellness home">
          <img src="/brand/logo-tree.svg" alt="She Shape Wellness" className={styles.brandLogo} />
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
              onMouseEnter={() => (MEGA_SECTIONS[link.to] ? showMega(link.to) : hideMega())}
              onFocus={() => (MEGA_SECTIONS[link.to] ? showMega(link.to) : hideMega())}
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
              <Link className={styles.login} to="/login" state={loginState}>
                Log in
              </Link>
            )}
          </div>
        </nav>
      </div>

      {megaOpen && <MegaMenu section={megaOpen} onEnter={keepMega} onNavigate={() => setMegaOpen(null)} />}

      {menu.open && (
        <button type="button" className={styles.backdrop} aria-label="Close menu" onClick={menu.close} />
      )}
    </header>
  )
}
