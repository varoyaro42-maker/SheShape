import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import Footer from './Footer.jsx'
import styles from './Layout.module.css'

export default function Layout() {
  const { pathname } = useLocation()

  return (
    <div className={styles.shell}>
      <Navbar />
      <main key={pathname} className={`route-enter ${pathname === '/' ? styles.flush : styles.main}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
