import { useState, useEffect, useCallback, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import posthog from "posthog-js";
import * as Sentry from '@sentry/react';
import { consumeReplayPending } from "@/lib/posthogRuntime";

const posthogEnabled = import.meta.env.PROD && !!import.meta.env.VITE_POSTHOG_KEY;

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
      Sentry.setUser(null);
      setState({ session: null, user: null, isLoading: false, isAuthenticated: false });
      return;
    }
    Sentry.setUser({ id: session.user.id });
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
      if (appUser && posthogEnabled) {
        const analyticsRole =
          appUser.role === "user" || appUser.role === "admin"
            ? appUser.role
            : undefined;
        posthog.identify(
          appUser.id,
          analyticsRole ? { role: analyticsRole } : {}
        );
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
            // Fire-and-forget: SIGNED_IN only fires on genuine sign-in transitions
            // (INITIAL_SESSION is skipped above; TOKEN_REFRESHED/USER_UPDATED are
            // separate events). touch_last_login is a SECURITY DEFINER RPC that
            // updates public.users.last_login_at for the caller.
            if (event === "SIGNED_IN") {
              (supabase.rpc as unknown as (fn: string) => Promise<{ error: unknown }>)("touch_last_login")
                .then(({ error }) => {
                  if (error) console.warn("touch_last_login failed", error);
                })
                .catch((err) => console.warn("touch_last_login threw", err));
              if (posthogEnabled && consumeReplayPending()) {
                const url = new URL(window.location.href);
                if (url.searchParams.has("code")) {
                  url.searchParams.delete("code");
                  window.history.replaceState(window.history.state, "", url.toString());
                }
                posthog.startSessionRecording?.();
              }
            }
          } else if (event === "SIGNED_OUT") {
            Sentry.setUser(null);
            if (posthogEnabled) posthog.reset();
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
    // posthog.reset() fires via the SIGNED_OUT auth event — not called here.
    // Clear this user's search-location account cache before the session is torn down
    // (at SIGNED_OUT `user` is already null, so the id must be captured here).
    // Key format mirrors src/features/search/state/searchLocationStorage.ts.
    const priorUserId = state.user?.id;
    if (priorUserId) {
      try {
        window.localStorage.removeItem(`reeve_search_location_account_v1:${priorUserId}`);
      } catch {
        /* storage unavailable — ignore */
      }
    }
    await supabase.auth.signOut();
  }, [state.user?.id]);

  /** Force re-fetch user data (e.g. after name update) */
  const refreshUser = useCallback(async () => {
    if (state.session) {
      fetchingRef.current = false;
      await loadUser(state.session);
    }
  }, [state.session, loadUser]);

  const isFullyVerified = !!(state.user?.phone_verified && state.user?.email_verified);

  return { ...state, isFullyVerified, signOut, refreshUser };
}
