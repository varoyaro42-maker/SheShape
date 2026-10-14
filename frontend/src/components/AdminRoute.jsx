import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context.js'
import Loading from './Loading.jsx'

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Loading />

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />

  if (user.role !== 'admin') return <Navigate to="/" replace />

  return children
}
