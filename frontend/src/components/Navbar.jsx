import { NavLink, Link, useNavigate } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import { useCart } from '../context/cart-context.js'
import { useAuth } from '../context/auth-context.js'
import styles from './Navbar.module.css'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/programs', label: 'Programs' },
  { to: '/blog', label: 'Blog' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' }
]

export default function Navbar({ theme, toggleTheme }) {
  const { count } = useCart()
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const portalPath = isAdmin ? '/admin' : '/dashboard'
  const cartTo = user ? '/dashboard/cart' : '/login'
  const cartState = user ? undefined : { from: { pathname: '/dashboard/cart' } }

  return (
    <header className={styles.header}>
      <div className={`page ${styles.inner}`}>
        <Link to="/" className={styles.brand}>
          <img src="/logo.svg" alt="" className={styles.brandIcon} />
          She Shape
        </Link>
        <nav className={styles.nav}>
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
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeToggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
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
        </nav>
      </div>
    </header>
  )
}
