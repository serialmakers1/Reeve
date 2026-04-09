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

async function fetchUserRow(userId: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, full_name, phone, role, phone_verified, email_verified, auth_provider")
    .eq("id", userId)
    .maybeSingle();
  // DIAGNOSTIC — remove after investigation
  console.log("LOAD_USER_RESULT", { data: JSON.stringify(data), error: JSON.stringify(error) });

  if (!data) return null;
  return {
    id: data.id,
    email: data.email ?? null,
    full_name: data.full_name ?? "",
    phone: data.phone ?? null,
    role: data.role as UserRole,
    phone_verified: data.phone_verified ?? false,
    email_verified: data.email_verified ?? false,
    auth_provider: data.auth_provider ?? null,
  };
}

async function fetchUserWithRetry(userId: string): Promise<AppUser | null> {
  const user = await fetchUserRow(userId);
  if (user) return user;
  // Trigger may have a tiny delay — retry once after 1s
  await new Promise((r) => setTimeout(r, 1000));
  return fetchUserRow(userId);
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
        // DIAGNOSTIC — remove after investigation
        console.log("AUTH_STATE_CHANGE", event, session?.user?.id);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          loadUser(session);
        } else if (event === "SIGNED_OUT") {
          setState({ session: null, user: null, isLoading: false, isAuthenticated: false });
        }
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

    return () => subscription.unsubscribe();
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
