import { useState, useEffect, useCallback, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "user" | "tenant" | "owner" | "admin" | "super_admin";

export interface AppUser {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role: UserRole;
  onboarding_completed: boolean;
}

interface AuthState {
  session: Session | null;
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

async function fetchUserRow(userId: string): Promise<AppUser | null> {
  const { data } = await supabase
    .from("users")
    .select("id, email, full_name, phone, role, onboarding_completed")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    email: data.email ?? null,
    full_name: data.full_name ?? "",
    phone: data.phone ?? null,
    role: data.role as UserRole,
    onboarding_completed: data.onboarding_completed ?? false,
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
    } catch {
      setState({ session, user: null, isLoading: false, isAuthenticated: true });
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
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
