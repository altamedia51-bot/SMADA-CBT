import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, UserRole } from '../store/auth.store';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role is required and profile is loaded but role doesn't match
  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    // Redirect based on their role
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
    if (profile.role === 'guru') return <Navigate to="/guru" replace />;
    if (profile.role === 'siswa') return <Navigate to="/siswa" replace />;
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
