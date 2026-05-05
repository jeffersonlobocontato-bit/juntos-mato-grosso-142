import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type AppRole = 'admin' | 'admin_master' | 'lider_tematico' | 'curador_municipal' | 'especialista';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Required roles to access this route. If omitted, only authentication is required.
   * Admin and admin_master always have access.
   */
  requiredRoles?: AppRole[];
}

const ProtectedRoute = ({ children, requiredRoles }: ProtectedRouteProps) => {
  const { user, roles, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-4xl" aria-label="Carregando">⏳</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const hasAccess =
      roles.includes('admin') ||
      roles.includes('admin_master') ||
      requiredRoles.some((r) => roles.includes(r));

    if (!hasAccess) {
      return <Navigate to="/admin" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;