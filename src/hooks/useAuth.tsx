import { useState, useEffect, useCallback, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import posthog from "posthog-js";

type UserRole = "user" | "tenant" | "owner" | "admin" | "super_admin";

export interface AppUser {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: UserRole;
  phone_verified: boolean;
  email_verified: boolean;
  auth_provider: string | null;
}

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

async function fetchUserRow(userId: string): Promise<{ user: AppUser | null; error: unknown }> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, phone, role, phone_verified, email_verified, auth_provider")
    .eq("id", userId)
    .maybeSingle();

  if (error) return { user: null, error };
  if (!data) return { user: null, error: null };
  return {
    user: {
      id: data.id,
      email: data.email ?? null,
      full_name: data.full_name ?? "",
      phone: data.phone ?? null,
      role: data.role as UserRole,
      phone_verified: data.phone_verified ?? false,
      email_verified: data.email_verified ?? false,
      auth_provider: data.auth_provider ?? null,
    },
    error: null,
  };
}

// Retries up to 3 times with exponential backoff when the row doesn't exist yet
// (data null, error null — trigger lag). Stops immediately on a real error.
async function fetchUserWithRetry(userId: string): Promise<AppUser | null> {
  const delays = [0, 500, 1000];
  for (const delay of delays) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    const { user, error } = await fetchUserRow(userId);
    if (error) return null;
    if (user) return user;
    // null data + null error → row not yet created, retry
  }
  return null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const fetchingRef = useRef(false);

  const loadUser = useCallback(async (session: Session | null) => {
    if (!session?.user) {
      setState({ session: null, user: null, isLoading: false, isAuthenticated: false });
      return;
    }
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Immediately mark session + isAuthenticated so that if the DB query stalls
    // and the safety timeout fires, state.session is non-null and no /login redirect
    // occurs. isLoading stays true until the DB row is fetched.
    setState(prev => ({ ...prev, session, isAuthenticated: true }));

    try {
      const appUser = await fetchUserWithRetry(session.user.id);
      setState({
        session,
        user: appUser,
        isLoading: false,
        isAuthenticated: true,
      });
      if (appUser) {
        posthog.identify(appUser.id, {
          name: appUser.full_name ?? undefined,
          email: appUser.email ?? undefined,
          phone: appUser.phone ?? undefined,
          role: appUser.role ?? undefined,
        });
      }
    } catch {
      setState({ session, user: null, isLoading: false, isAuthenticated: true });
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Skip INITIAL_SESSION — getSession() handles bootstrap; processing it here
        // would race with getSession's loadUser call and leave isLoading hanging.
        if (event === "INITIAL_SESSION") return;

        // Defer all async work out of the callback — Supabase holds an internal lock
        // during onAuthStateChange; direct DB calls deadlock. 100ms gives getSession
        // a headstart so it wins the fetchingRef race on page load.
        setTimeout(async () => {
          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
            loadUser(session);
          } else if (event === "SIGNED_OUT") {
            setState({ session: null, user: null, isLoading: false, isAuthenticated: false });
          }
        }, 100);
      }
    );

    // Bootstrap from existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUser(session);
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    });

    // Safety timeout — if loading is still true after 5s (e.g. stalled DB
    // fetch after OAuth redirect), force it to false so the page can proceed.
    const safetyTimeout = setTimeout(() => {
      setState(prev => {
        if (prev.isLoading) {
          console.warn('useAuth: safety timeout triggered — forcing loading to false');
          return { ...prev, isLoading: false };
        }
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [loadUser]);

  const signOut = useCallback(async () => {
    posthog.reset();
    await supabase.auth.signOut();
  }, []);

  /** Force re-fetch user data (e.g. after name update) */
  const refreshUser = useCallback(async () => {
    if (state.session) {
      fetchingRef.current = false;
      await loadUser(state.session);
    }
  }, [state.session, loadUser]);

  return { ...state, signOut, refreshUser };
}
