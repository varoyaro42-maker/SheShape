import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import { useTheme } from '../hooks/useTheme.js'
import styles from './Layout.module.css'

export default function Layout() {
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()

  return (
    <div className={styles.shell} data-theme={theme}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <main key={pathname} className="route-enter">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
