import { useState } from 'react'
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, ShoppingBag, Dumbbell, Newspaper, Package, Settings } from 'lucide-react'
import { useAuth } from '../context/auth-context.js'
import { useCart } from '../context/cart-context.js'
import { useTheme } from '../hooks/useTheme.js'
import { getPageTitle } from '../utils/pageTitle.js'
import TopbarIcons from './TopbarIcons.jsx'
import styles from './CustomerLayout.module.css'

const BROWSE_LINKS = [
  { to: '/dashboard', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/dashboard/shop', label: 'Shop', icon: ShoppingBag },
  { to: '/dashboard/programs', label: 'Programs', icon: Dumbbell },
  { to: '/dashboard/blog', label: 'Blog', icon: Newspaper }
]

const ACCOUNT_LINKS = [
  { to: '/dashboard/orders', label: 'My orders', icon: Package },
  { to: '/dashboard/account', label: 'Account settings', icon: Settings }
]

const QUICK_LINKS = [
  { to: '/dashboard/shop', label: 'Shop' },
  { to: '/dashboard/programs', label: 'Programs' },
  { to: '/dashboard/blog', label: 'Blog' },
  { to: '/dashboard/cart', label: 'Cart' }
]

const TITLE_LINKS = [
  ...BROWSE_LINKS,
  ...ACCOUNT_LINKS,
  { to: '/dashboard/product', label: 'Shop' },
  { to: '/dashboard/cart', label: 'Cart' },
  { to: '/dashboard/checkout', label: 'Checkout' },
  { to: '/dashboard/order', label: 'Order' }
]

export default function CustomerLayout() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [search, setSearch] = useState('')

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? '?'
  const pageTitle = getPageTitle(location.pathname, TITLE_LINKS, 'Dashboard')

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleSearch = (event) => {
    event.preventDefault()
    navigate(
      search.trim()
        ? `/dashboard/shop?search=${encodeURIComponent(search.trim())}`
        : '/dashboard/shop'
    )
  }

  return (
    <div className={styles.shell} data-theme={theme}>
      <aside className={styles.sidebar}>
        <Link to="/" className={styles.brand}>
          <img src="/favicon.ico" alt="" className={styles.brandIcon} />
          She Shape
        </Link>

        <nav className={styles.nav}>
          {BROWSE_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              <link.icon size={18} strokeWidth={2} />
              {link.label}
            </NavLink>
          ))}

          <span className={styles.divider}>Account</span>

          {ACCOUNT_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              <link.icon size={18} strokeWidth={2} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.account}>
          <div className={styles.avatar}>
            {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{initial}</span>}
          </div>
          <div className={styles.identity}>
            <span className={styles.name}>{user?.name}</span>
            <span className={styles.email}>{user?.email}</span>
          </div>
          <button type="button" onClick={handleLogout} className={styles.quiet}>
            Log out
          </button>
        </div>
      </aside>

      <div className={styles.body}>
        <header className={styles.topbar}>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>

          <form onSubmit={handleSearch} className={styles.search}>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
            />
          </form>

          <TopbarIcons
            theme={theme}
            toggleTheme={toggleTheme}
            quickLinks={QUICK_LINKS}
            cartCount={count}
            avatarTo="/dashboard/account"
            avatarUrl={user?.avatarUrl}
            avatarInitial={initial}
          />
        </header>

        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
