// ─────────────────────────────────────────────
// AUTH SESSION MANAGEMENT
// Free Plan: refresh tokens never expire.
// Users stay logged in on same browser indefinitely.
// Silent auto-refresh every ~1 hour — user never notices.
// On upgrade to Pro: add inactivity timeout in Supabase Dashboard
// → Authentication → Settings → Session timebox
// ─────────────────────────────────────────────

import { useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthSessionState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Set up listener BEFORE getSession to avoid race conditions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    loading,
    isAuthenticated: !!session,
  };
}
