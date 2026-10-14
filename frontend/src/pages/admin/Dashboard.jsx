import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  ClipboardList,
  Dumbbell,
  Newspaper,
  CreditCard,
  User,
  ChevronRight,
  Users,
  Wallet,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  UserPlus,
  CheckCircle2,
  PackagePlus,
  AlertTriangle
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { adminDashboard } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useAuth } from '../../context/auth-context.js'
import { formatPrice, formatShortDate, formatRelativeTime } from '../../utils/format.js'
import { ORDER_STATUS_LABELS, formatOrderDate } from '../../utils/order.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import styles from './Dashboard.module.css'

const SECTIONS = [
  {
    to: '/admin/products',
    label: 'Products',
    icon: Package,
    description: 'Add products, upload images, tag colors, manage stock.',
    stat: (data) => `${data.products.published} / ${data.products.total} published`
  },
  {
    to: '/admin/programs',
    label: 'Programs',
    icon: Dumbbell,
    description: 'Manage programs and upload their video series.',
    stat: (data) => `${data.programs.open} / ${data.programs.total} open`
  },
  {
    to: '/admin/orders',
    label: 'Orders',
    icon: ClipboardList,
    description: 'Review orders, update status, track deliveries.',
    stat: (data) => `${data.orders.byStatus.pending} awaiting payment`
  },
  {
    to: '/admin/posts',
    label: 'Blog',
    icon: Newspaper,
    description: 'Write and publish blog posts.',
    stat: (data) => `${data.posts.published} / ${data.posts.total} published`
  },
  {
    to: '/admin/settings',
    label: 'Payment settings',
    icon: CreditCard,
    description: "Connect the Stripe account that receives payments.",
    stat: () => null
  },
  {
    to: '/admin/account',
    label: 'My account',
    icon: User,
    description: 'Update your photo and change your password.',
    stat: () => null
  }
]

const ACTIVITY_ICONS = {
  user: { icon: UserPlus, tone: styles.statIconGreen },
  order: { icon: CheckCircle2, tone: styles.statIconGreen },
  product: { icon: PackagePlus, tone: styles.statIconBlue },
  stock: { icon: AlertTriangle, tone: styles.statIconAmber }
}

function Trend({ pct }) {
  const isUp = pct >= 0
  const Icon = isUp ? TrendingUp : TrendingDown
  return (
    <span className={isUp ? styles.trendUp : styles.trendDown}>
      <Icon size={12} />
      {isUp ? '+' : ''}
      {pct}%
    </span>
  )
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    adminDashboard
      .overview()
      .then((result) => active && setData(result))
      .catch((err) => active && setError(readError(err)))
      .finally(() => active && setLoading(false))

    return () => {
      active = false
    }
  }, [])

  if (loading) return <Loading />

  const analytics = data?.analytics

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>
        <p className={styles.subtitle}>Here's what's happening across She Shape.</p>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {analytics && (
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statValue}>{analytics.customers.total}</span>
              <span className={styles.statLabel}>Total customers</span>
              <Trend pct={analytics.customers.changePct} />
            </div>
            <span className={`${styles.statIcon} ${styles.statIconGreen}`}>
              <Users size={20} />
            </span>
          </div>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statValue}>{formatPrice(analytics.revenue.total)}</span>
              <span className={styles.statLabel}>Revenue (30 days)</span>
              <Trend pct={analytics.revenue.changePct} />
            </div>
            <span className={`${styles.statIcon} ${styles.statIconAmber}`}>
              <Wallet size={20} />
            </span>
          </div>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statValue}>{analytics.orders.total}</span>
              <span className={styles.statLabel}>Orders (30 days)</span>
              <Trend pct={analytics.orders.changePct} />
            </div>
            <span className={`${styles.statIcon} ${styles.statIconBlue}`}>
              <ShoppingBag size={20} />
            </span>
          </div>
          <div className={styles.statCard}>
            <div>
              <span className={styles.statValue}>{analytics.conversionRate.value}%</span>
              <span className={styles.statLabel}>Customer conversion</span>
              <Trend pct={analytics.conversionRate.changePct} />
            </div>
            <span className={`${styles.statIcon} ${styles.statIconPurple}`}>
              <TrendingUp size={20} />
            </span>
          </div>
        </div>
      )}

      {analytics && (
        <div className={styles.analyticsGrid}>
          <section className={styles.chartCard}>
            <h2 className={styles.recentTitle}>Revenue</h2>
            <p className={styles.chartSubtitle}>Revenue for the past {analytics.periodDays} days</p>

            {analytics.revenueSeries.length === 0 ? (
              <Empty message="No revenue yet in this period." />
            ) : (
              <div className={styles.chartWrap}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={analytics.revenueSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--admin-primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--admin-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-line)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatShortDate}
                      tick={{ fontSize: 11, fill: 'var(--admin-muted)' }}
                      axisLine={{ stroke: 'var(--admin-line)' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--admin-muted)' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      formatter={(value) => [formatPrice(value), 'Revenue']}
                      labelFormatter={formatShortDate}
                      contentStyle={{
                        background: 'var(--admin-surface)',
                        border: '1px solid var(--admin-line)',
                        borderRadius: 8,
                        fontSize: 12
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="var(--admin-primary)"
                      strokeWidth={2}
                      fill="url(#revenueFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className={styles.activityCard}>
            <h2 className={styles.recentTitle}>Recent activity</h2>
            <p className={styles.chartSubtitle}>Recent system activity</p>

            {analytics.activity.length === 0 ? (
              <Empty message="Nothing has happened yet." />
            ) : (
              <ul className={styles.activityList}>
                {analytics.activity.map((entry, index) => {
                  const meta = ACTIVITY_ICONS[entry.type] ?? ACTIVITY_ICONS.product
                  const Icon = meta.icon
                  return (
                    <li key={`${entry.type}-${index}`} className={styles.activityItem}>
                      <span className={`${styles.statIcon} ${meta.tone} ${styles.activityIcon}`}>
                        <Icon size={16} />
                      </span>
                      <span>
                        <span className={styles.activityMessage}>{entry.message}</span>
                        <span className={styles.activityDetail}>{entry.detail}</span>
                        <span className={styles.activityTime}>{formatRelativeTime(entry.at)}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      <div className={styles.grid}>
        {SECTIONS.map((section) => (
          <Link key={section.to} to={section.to} className={styles.card}>
            <span className={styles.cardIcon}>
              <section.icon size={18} />
            </span>
            <span className={styles.cardTitle}>{section.label}</span>
            <span className={styles.cardDescription}>{section.description}</span>
            {data && section.stat(data) && <span className={styles.cardStat}>{section.stat(data)}</span>}
            <ChevronRight size={16} className={styles.cardArrow} />
          </Link>
        ))}
      </div>

      {data && data.recentOrders.length > 0 && (
        <section className={styles.recent}>
          <h2 className={styles.recentTitle}>Recent orders</h2>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th className={styles.numCol}>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/admin/orders/${order.id}`} className={styles.orderLink}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>{order.customerName}</td>
                    <td>{formatOrderDate(order.createdAt)}</td>
                    <td className={styles.numCol}>{formatPrice(order.total)}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[order.status]}`}>
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Link to="/admin/orders" className={styles.viewAll}>
            View all orders
            <ChevronRight size={15} />
          </Link>
        </section>
      )}
    </div>
  )
}
