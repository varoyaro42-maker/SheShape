import { Fragment, useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, ListFilter, LogIn, LogOut, Pencil, Plus, ShieldAlert, Trash2, User } from 'lucide-react'
import { adminActivity } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useDebounced } from '../../hooks/useDebounced.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import FilterSelect from '../../components/FilterSelect.jsx'
import styles from './Orders.module.css'
import formStyles from './ProductForm.module.css'

const LIMIT = 50
const KINDS = [
  { value: '', label: 'Everything' },
  { value: 'changes', label: 'Changes' },
  { value: 'logins', label: 'Sign-ins and sign-outs' },
  { value: 'failed', label: 'Failed sign-ins' }
]
const ICONS = { login: LogIn, logout: LogOut, login_failed: ShieldAlert, create: Plus, update: Pencil, delete: Trash2 }
const BADGE = { login_failed: 'cancelled', delete: 'cancelled', create: 'delivered', update: 'shipped', login: 'paid', logout: 'pending' }
const OP_LABELS = { create: 'Added', update: 'Changed', delete: 'Deleted' }

// "payoutNote" -> "payout note", "price" stays "price".
const fieldLabel = (field) => field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase()

const formatWhen = (value) =>
  new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** "Chrome on iPhone" from a user agent, good enough to recognise a device. */
function device(ua) {
  if (!ua) return ''
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : ''
  const browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : ''
  return [browser, os].filter(Boolean).join(' on ')
}

function Changes({ changes }) {
  return (
    <ul style={{ margin: 0, padding: '0.25rem 0 0.25rem 1.1rem', display: 'grid', gap: '0.6rem' }}>
      {changes.map((change, index) => (
        <li key={index}>
          <strong>
            {OP_LABELS[change.op] ?? change.op} {change.many ? `several ${change.label}s` : change.label}
          </strong>
          {change.name && <> “{change.name}”</>}
          {change.fields && Object.keys(change.fields).length > 0 && (
            <table style={{ marginTop: '0.35rem', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <tbody>
                {Object.entries(change.fields).map(([field, value]) => (
                  <tr key={field}>
                    <td style={{ padding: '0.15rem 0.75rem 0.15rem 0', color: 'var(--admin-muted)', verticalAlign: 'top' }}>{fieldLabel(field)}</td>
                    <td style={{ padding: '0.15rem 0', wordBreak: 'break-word' }}>
                      {!change.many && (
                        <>
                          <s style={{ color: 'var(--admin-muted)' }}>{value.before ?? 'empty'}</s> →{' '}
                        </>
                      )}
                      {value.after ?? 'empty'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </li>
      ))}
    </ul>
  )
}

export default function AdminActivityPage() {
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState(null)
  const [people, setPeople] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)

  const [page, setPage] = useState(1)
  const [kind, setKind] = useState('')
  const [user, setUser] = useState('')
  const [area, setArea] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounced(search, 350)

  useEffect(() => {
    adminActivity
      .people()
      .then((data) => {
        setPeople(data.people)
        setAreas(data.areas)
      })
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: LIMIT }
      if (kind) params.kind = kind
      if (user) params.user = user
      if (area) params.area = area
      if (from) params.from = from
      if (to) params.to = to
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
      const result = await adminActivity.list(params)
      setRows(result.data)
      setMeta(result.meta)
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }, [page, kind, user, area, from, to, debouncedSearch])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [kind, user, area, from, to, debouncedSearch])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Activity log</h1>
        <p className={styles.subtitle}>
          Who signed in, failed sign-ins, and every change made in the admin: what changed, from what, to what.
          {meta ? ` ${meta.total} entr${meta.total === 1 ? 'y' : 'ies'}.` : ''}
        </p>
      </header>

      <div className={styles.filters} style={{ flexWrap: 'wrap' }}>
        <FilterSelect icon={ListFilter} value={kind} onChange={setKind} options={KINDS} />
        <FilterSelect
          icon={User}
          value={user}
          onChange={setUser}
          options={[
            { value: '', label: 'Everyone' },
            ...people.map((p) => ({ value: p.userId, label: `${p.userName || p.userEmail}${p.role === 'admin' ? ' (admin)' : ''}` }))
          ]}
        />
        <FilterSelect
          icon={ListFilter}
          value={area}
          onChange={setArea}
          options={[{ value: '', label: 'All areas' }, ...areas.map((a) => ({ value: a, label: a.charAt(0).toUpperCase() + a.slice(1) }))]}
        />
        <label className={styles.date} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          From
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={formStyles.input} style={{ width: 'auto' }} />
        </label>
        <label className={styles.date} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          To
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={formStyles.input} style={{ width: 'auto' }} />
        </label>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, what changed"
          className={styles.search}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {loading && <Loading />}
      {!loading && rows.length === 0 && <Empty message="Nothing recorded for these filters yet." />}

      {!loading && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>What happened</th>
                <th>From</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const Icon = ICONS[row.action] ?? Pencil
                const expandable = row.changes?.length > 0
                const isOpen = open === row.id
                return (
                  <Fragment key={row.id}>
                    <tr
                      onClick={expandable ? () => setOpen(isOpen ? null : row.id) : undefined}
                      style={expandable ? { cursor: 'pointer' } : undefined}
                    >
                      <td className={styles.date} style={{ whiteSpace: 'nowrap' }}>{formatWhen(row.createdAt)}</td>
                      <td>
                        <span className={styles.name}>{row.userName || row.userEmail || 'Unknown'}</span>
                        {row.role && (
                          <span className={styles.phone}> · {row.role === 'admin' ? 'Admin' : 'Customer'}</span>
                        )}
                        {row.userName && row.userEmail && <div className={styles.phone}>{row.userEmail}</div>}
                      </td>
                      <td>
                        <span className={`${styles.badge} ${styles[BADGE[row.action]] ?? ''}`} style={{ marginRight: '0.5rem' }}>
                          <Icon size={12} />
                        </span>
                        {row.summary}
                        {expandable && (
                          <span className={styles.phone} style={{ marginLeft: '0.4rem', whiteSpace: 'nowrap' }}>
                            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />} details
                          </span>
                        )}
                      </td>
                      <td className={styles.phone}>
                        {device(row.userAgent)}
                        {row.ip && <div>{row.ip}</div>}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td />
                        <td colSpan={3}>
                          <Changes changes={row.changes} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.pages > 1 && (
        <div className={styles.pager}>
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className={styles.ghost}>
            Previous
          </button>
          <span className={styles.pagerLabel}>
            Page {meta.page} of {meta.pages}
          </span>
          <button type="button" disabled={page >= meta.pages} onClick={() => setPage((current) => current + 1)} className={styles.ghost}>
            Next
          </button>
        </div>
      )}
    </div>
  )
}
