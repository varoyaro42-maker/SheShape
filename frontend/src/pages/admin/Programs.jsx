import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { adminPrograms } from '../../api/admin.js'
import { readError } from '../../api/client.js'
import { useToast } from '../../context/toast-context.js'
import Loading from '../../components/Loading.jsx'
import Empty from '../../components/Empty.jsx'
import styles from './Products.module.css'

export default function AdminProgramsPage() {
  const { showToast } = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      setRows(await adminPrograms.list())
    } catch (err) {
      setError(readError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function destroy(program) {
    setBusyId(program.id)
    setError('')

    try {
      await adminPrograms.remove(program.id)
      setConfirmId(null)
      showToast(`${program.name} was deleted.`)
      load()
    } catch (err) {
      setConfirmId(null)
      setError(readError(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Programs</h1>
          <p className={styles.subtitle}>{rows.length} program{rows.length === 1 ? '' : 's'}</p>
        </div>

        <Link to="/admin/programs/new" className={styles.primary}>
          <Plus size={16} />
          New program
        </Link>
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {loading && <Loading />}

      {!loading && rows.length === 0 && <Empty message="No programs yet." />}

      {!loading && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thumbCol} />
                <th>Name</th>
                <th>Status</th>
                <th className={styles.numCol}>Videos</th>
                <th className={styles.actionCol} />
              </tr>
            </thead>

            <tbody>
              {rows.map((program) => {
                const busy = busyId === program.id

                return (
                  <tr key={program.id} className={busy ? styles.busy : undefined}>
                    <td>
                      {program.coverImage ? (
                        <img src={program.coverImage} alt="" className={styles.thumb} />
                      ) : (
                        <span className={styles.thumbEmpty} />
                      )}
                    </td>

                    <td>
                      <Link to={`/admin/programs/${program.id}`} className={styles.name}>
                        {program.name}
                      </Link>
                      <span className={styles.slug}>{program.slug}</span>
                    </td>

                    <td>{program.status === 'open' ? 'Open' : 'Coming soon'}</td>
                    <td className={styles.numCol}>{program.videos?.length ?? 0}</td>

                    <td className={styles.actionCol}>
                      {confirmId === program.id ? (
                        <span className={styles.confirm}>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => destroy(program)}
                            className={styles.danger}
                          >
                            Delete
                          </button>
                          <button type="button" onClick={() => setConfirmId(null)} className={styles.ghost}>
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <span className={styles.confirm}>
                          <Link to={`/admin/programs/${program.id}`} className={styles.ghost}>
                            Edit
                          </Link>
                          <button type="button" onClick={() => setConfirmId(program.id)} className={styles.ghost}>
                            Delete
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
