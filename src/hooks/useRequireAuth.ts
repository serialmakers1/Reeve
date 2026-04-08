import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function useRequireAuth({ requireAdmin = false }: { requireAdmin?: boolean } = {}) {
  const { session, user, isLoading, isAuthenticated, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isLoading) return;

    // Not logged in → redirect to login
    if (!isAuthenticated) {
      navigate(
        `/login?returnTo=${encodeURIComponent(location.pathname)}`,
        { replace: true }
      );
      return;
    }

    // Admin-only guard
    if (requireAdmin) {
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      if (!isAdmin) {
        navigate('/', { replace: true });
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, navigate, location, requireAdmin]);

  return { session, user, loading: isLoading, isAuthenticated, signOut, refreshUser };
}
