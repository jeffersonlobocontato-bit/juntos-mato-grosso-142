import { ReactNode, useEffect } from 'react';
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
  const { user, roles, isLoading, rolesLoading } = useAuth();
  const location = useLocation();

  // Injeta noindex/nofollow + remove og:image em rotas administrativas para
  // impedir indexação e preview social de áreas internas.
  useEffect(() => {
    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      const prev = el.getAttribute('content');
      el.setAttribute('content', content);
      return () => {
        if (prev !== null) el!.setAttribute('content', prev);
        else el!.remove();
      };
    };
    const restoreRobots = ensureMeta('robots', 'noindex, nofollow, noarchive');
    const og = document.querySelector('meta[property="og:image"]');
    const tw = document.querySelector('meta[name="twitter:image"]');
    const ogPrev = og?.getAttribute('content') ?? null;
    const twPrev = tw?.getAttribute('content') ?? null;
    og?.setAttribute('content', '');
    tw?.setAttribute('content', '');
    return () => {
      restoreRobots();
      if (ogPrev !== null) og?.setAttribute('content', ogPrev);
      if (twPrev !== null) tw?.setAttribute('content', twPrev);
    };
  }, []);

  if (isLoading || (user && rolesLoading)) {
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