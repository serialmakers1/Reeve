import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const REGULAR_USER_ROLES = new Set(['user', 'tenant', 'owner']);

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

    // Ensure user row exists in DB (idempotent)
    supabase.rpc('ensure_user_exists').catch(() => {});

    // Admin-only guard
    if (requireAdmin) {
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      if (!isAdmin) {
        navigate('/', { replace: true });
        return;
      }
    }

    // Don't redirect from onboarding — it would loop
    const currentPath = window.location.pathname;
    if (currentPath === '/onboarding') return;

    // Regular users who haven't completed onboarding → /onboarding
    const isRegularUser = user && REGULAR_USER_ROLES.has(user.role);
    if (isRegularUser && user && !user.onboarding_completed) {
      navigate('/onboarding?redirectTo=' + encodeURIComponent(currentPath), { replace: true });
    }
  }, [isAuthenticated, isLoading, user, navigate, location, requireAdmin]);

  return { session, user, loading: isLoading, isAuthenticated, signOut, refreshUser };
}
