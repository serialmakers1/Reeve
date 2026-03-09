import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function useRequireAuth() {
  const { session, user, isLoading, isAuthenticated, signOut, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(
        `/login?returnTo=${encodeURIComponent(location.pathname)}`,
        { replace: true }
      );
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  return { session, user, loading: isLoading, isAuthenticated, signOut, refreshUser };
}
