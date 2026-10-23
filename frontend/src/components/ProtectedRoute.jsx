import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';
import Loading from './Loading.jsx';

export default function ProtectedRoute({ admin = false, denyAdmin = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (admin && !isAdmin) return <Navigate to="/" replace />;

  if (denyAdmin && isAdmin) return <Navigate to="/admin" replace />;

  return <Outlet />;
}
