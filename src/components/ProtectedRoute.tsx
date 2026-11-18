import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export function ProtectedRoute() {
  const { user, initializing } = useAuthStore();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-[#0A0A0A] flex items-center justify-center">
        <div className="space-y-3 w-64">
          <div className="h-3 w-32 bg-neutral-200 dark:bg-[#1E1E22] rounded animate-pulse mx-auto" />
          <div className="h-2 w-48 bg-neutral-200 dark:bg-[#1E1E22] rounded animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
