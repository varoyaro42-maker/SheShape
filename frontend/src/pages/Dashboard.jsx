import { Link } from 'react-router-dom'
import { Package, Wallet, Dumbbell, ShoppingCart, ShoppingBag, ArrowRight, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/auth-context.js'
import { useCart } from '../context/cart-context.js'
import { useApi } from '../hooks/useApi.js'
import { formatPrice } from '../utils/format.js'
import { ORDER_STATUS_LABELS, formatOrderDate } from '../utils/order.js'
import Loading from '../components/Loading.jsx'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { user } = useAuth()
  const { count: cartCount } = useCart()
  const { data: orders, loading: ordersLoading } = useApi('/orders/my')
  const { data: programs, loading: programsLoading } = useApi('/programs')

  const totalOrders = orders?.length ?? 0
  const totalSpent = orders?.reduce((sum, order) => sum + order.total, 0) ?? 0
  const recentOrders = orders?.slice(0, 4) ?? []
  const openPrograms = programs?.filter((program) => program.status === 'open').length ?? 0

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
        </h1>
        <p className={styles.heroSubtitle}>Here's what's happening with your She Shape account.</p>

        <div className={styles.heroStats}>
          <span>
            <strong>{totalOrders}</strong> order{totalOrders === 1 ? '' : 's'} placed
          </span>
          <span>
            <strong>{formatPrice(totalSpent)}</strong> spent
          </span>
          <span>
            <strong>{cartCount}</strong> in your cart
          </span>
        </div>
      </section>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <div>
            <span className={styles.statLabel}>Orders placed</span>
            <span className={styles.statValue}>{totalOrders}</span>
          </div>
          <span className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <Package size={20} />
          </span>
        </div>
        <div className={styles.statCard}>
          <div>
            <span className={styles.statLabel}>Total spent</span>
            <span className={styles.statValue}>{formatPrice(totalSpent)}</span>
          </div>
          <span className={`${styles.statIcon} ${styles.statIconAmber}`}>
            <Wallet size={20} />
          </span>
        </div>
        <div className={styles.statCard}>
          <div>
            <span className={styles.statLabel}>Programs open now</span>
            <span className={styles.statValue}>{openPrograms}</span>
          </div>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <Dumbbell size={20} />
          </span>
        </div>
        <div className={styles.statCard}>
          <div>
            <span className={styles.statLabel}>Items in cart</span>
            <span className={styles.statValue}>{cartCount}</span>
          </div>
          <span className={`${styles.statIcon} ${styles.statIconPurple}`}>
            <ShoppingCart size={20} />
          </span>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Programs</h2>
            <p className={styles.sectionSubtitle}>Browse our training programs and their videos.</p>
          </div>
          <Link to="/dashboard/programs" className={styles.sectionLink}>
            View all
            <ChevronRight size={15} />
          </Link>
        </div>

        {programsLoading && <Loading />}

        {!programsLoading && programs?.length === 0 && (
          <div className={styles.empty}>
            <Dumbbell size={32} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No programs available</p>
            <p className={styles.emptyText}>Check back later for new programs.</p>
            <Link to="/dashboard/programs" className="btn">
              Browse programs
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {!programsLoading && programs?.length > 0 && (
          <div className={styles.programGrid}>
            {programs.slice(0, 4).map((program) => (
              <Link key={program.id} to={`/dashboard/programs/${program.slug}`} className={styles.programCard}>
                {program.coverImage ? (
                  <img src={program.coverImage} alt="" className={styles.programImage} />
                ) : (
                  <div className={styles.programImagePlaceholder} />
                )}
                <div className={styles.programBody}>
                  <span
                    className={
                      program.status === 'open'
                        ? `${styles.programStatus} ${styles.programStatusOpen}`
                        : styles.programStatus
                    }
                  >
                    {program.status === 'open' ? 'Open' : 'Coming soon'}
                  </span>
                  <span className={styles.programName}>{program.name}</span>
                  <span className={styles.programTagline}>{program.tagline}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Recent orders</h2>
            <p className={styles.sectionSubtitle}>Your most recent purchases.</p>
          </div>
          <Link to="/dashboard/orders" className={styles.sectionLink}>
            View all
            <ChevronRight size={15} />
          </Link>
        </div>

        {ordersLoading && <Loading />}

        {!ordersLoading && recentOrders.length === 0 && (
          <div className={styles.empty}>
            <ShoppingBag size={32} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>You haven't ordered anything yet</p>
            <Link to="/dashboard/shop" className="btn">
              Start shopping
              <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {!ordersLoading &&
          recentOrders.map((order) => (
            <Link key={order.id} to={`/dashboard/order/${order.orderNumber}`} className={styles.orderRow}>
              <div>
                <span className={styles.orderNumber}>{order.orderNumber}</span>
                <span className={styles.orderDate}>{formatOrderDate(order.createdAt)}</span>
              </div>
              <span className={styles.orderStatus}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
              <span className={styles.orderTotal}>{formatPrice(order.total)}</span>
            </Link>
          ))}
      </section>
    </div>
  )
}
