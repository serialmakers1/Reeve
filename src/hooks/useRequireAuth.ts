import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthSession } from '@/hooks/useAuthSession';

export function useRequireAuth() {
  const { session, user, loading, isAuthenticated } = useAuthSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(
        `/login?returnTo=${encodeURIComponent(location.pathname)}`,
        { replace: true }
      );
    }
  }, [isAuthenticated, loading, navigate, location]);

  return { session, user, loading, isAuthenticated };
}
