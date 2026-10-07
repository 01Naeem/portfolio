import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner } from '../components/ui/Primitives.jsx';

// UI-level gate only. Real protection is the server's protect/adminOnly middleware;
// this just stops a logged-out visitor from seeing an empty admin shell.
export default function ProtectedRoute() {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner label="Checking session" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
