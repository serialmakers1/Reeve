/**
 * P4b — lightweight read-only status hook for the sticky CTA bar.
 *
 * Why a separate hook (not lifted from RequestContactPanel):
 *   RequestContactPanel owns `cr` alongside a realtime subscription and
 *   submit/withdraw/resend mutations — lifting would touch ~30-40 lines. This
 *   hook does one read and caches it via TanStack Query. Two consumers hitting
 *   the same key share the cached row at zero extra network cost.
 *
 * Attempt tracking: `contact_requests.attempt_number` is a direct integer
 * (1..3, CHECK-enforced) auto-set BEFORE INSERT by a trigger. We read the
 * latest row for (tenant, property) and interpret:
 *   - status pending/approved   → active state, attemptCount from that row
 *   - status declined/withdrawn/auto_cancelled → no active, attemptCount from that row
 *   - no rows                   → attemptCount = 0
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ActiveStatus = "pending" | "approved" | null;

export interface ContactRequestStatus {
  status: ActiveStatus;
  attemptCount: number;
  isLoading: boolean;
  error: Error | null;
}

interface CrRow {
  status: string;
  attempt_number: number | null;
}

export const contactRequestStatusKeys = {
  byProperty: (propertyId: string) => ["contactRequestStatus", propertyId] as const,
};

export function useContactRequestStatus(
  propertyId: string | undefined,
  isAuthenticated: boolean,
): ContactRequestStatus {
  const { user } = useAuth();
  const userId = user?.id;
  const enabled = isAuthenticated && !!propertyId && !!userId;

  const query = useQuery({
    queryKey: propertyId
      ? contactRequestStatusKeys.byProperty(propertyId)
      : ["contactRequestStatus", "disabled"],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<CrRow | null> => {
      // Supabase generic-inference noise on this table (see CLAUDE.md
      // "Types: … noise" note) — cast the builder rather than the response
      // so `.eq()` string args are accepted.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as unknown as { from: (t: string) => any };
      const { data, error } = await sb
        .from("contact_requests")
        .select("status, attempt_number")
        .eq("tenant_id", userId!)
        .eq("property_id", propertyId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as CrRow | null) ?? null;
    },
  });

  if (!enabled) {
    return { status: null, attemptCount: 0, isLoading: false, error: null };
  }

  const row = query.data ?? null;
  const rawStatus = row?.status ?? null;
  const status: ActiveStatus =
    rawStatus === "pending" || rawStatus === "approved" ? rawStatus : null;
  const attemptCount = row?.attempt_number ?? 0;

  return {
    status,
    attemptCount,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
  };
}
