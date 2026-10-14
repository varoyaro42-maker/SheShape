import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Package, Dumbbell, ClipboardList, Newspaper, CreditCard, User, Home, Mail, Menu, X } from 'lucide-react'
import { useAuth } from '../context/auth-context.js'
import { useTheme } from '../hooks/useTheme.js'
import { useMobileMenu } from '../hooks/useMobileMenu.js'
import { getPageTitle } from '../utils/pageTitle.js'
import { adminMessages } from '../api/admin.js'
import TopbarIcons from './TopbarIcons.jsx'
import GlobalSearch from './GlobalSearch.jsx'
import styles from './AdminLayout.module.css'

const LINKS = [
  { to: '/admin', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/admin/users', label: 'Customers', icon: Users },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/programs', label: 'Programs', icon: Dumbbell },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/messages', label: 'Messages', icon: Mail },
  { to: '/admin/posts', label: 'Blog', icon: Newspaper },
  { to: '/admin/home', label: 'Home page', icon: Home },
  { to: '/admin/settings', label: 'Payment settings', icon: CreditCard },
  { to: '/admin/account', label: 'My account', icon: User }
]

const QUICK_LINKS = [
  { to: '/', label: 'View storefront' },
  { to: '/shop', label: 'Shop' },
  { to: '/programs', label: 'Programs' },
  { to: '/blog', label: 'Blog' }
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const menu = useMobileMenu()
  const [unreadMessages, setUnreadMessages] = useState(0)

  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? '?'
  const pageTitle = getPageTitle(location.pathname, LINKS, 'Dashboard')

  useEffect(() => {
    let active = true

    adminMessages
      .counts()
      .then((data) => active && setUnreadMessages(data.unread))
      .catch(() => {})

    return () => {
      active = false
    }
  }, [location.pathname])

  return (
    <div className={styles.shell} data-theme={theme}>
      <aside
        id="admin-sidebar"
        className={menu.open ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}
      >
        <div className={styles.sidebarHead}>
          <Link to="/" className={styles.brand}>
            <img src="/favicon.ico" alt="" className={styles.brandIcon} />
            She Shape
          </Link>
          <button type="button" className={styles.sidebarClose} onClick={menu.close} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {LINKS.map((link) => (
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
              {link.to === '/admin/messages' && unreadMessages > 0 && (
                <span className={styles.navBadge}>{unreadMessages}</span>
              )}
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
          <button type="button" onClick={logout} className={styles.quiet}>
            Log out
          </button>
        </div>
      </aside>

      {menu.open && (
        <button type="button" className={styles.backdrop} onClick={menu.close} aria-label="Close menu" />
      )}

      <div className={styles.body}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            onClick={menu.toggle}
            aria-expanded={menu.open}
            aria-controls="admin-sidebar"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <h1 className={styles.pageTitle}>{pageTitle}</h1>

          <div className={styles.searchSlot}>
            <GlobalSearch />
          </div>

          <TopbarIcons
            theme={theme}
            toggleTheme={toggleTheme}
            quickLinks={QUICK_LINKS}
            avatarTo="/admin/account"
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
