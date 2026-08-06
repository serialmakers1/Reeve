import { useCallback, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * useResendReveal — shared resend-contact behaviour for the resend-reveal Edge
 * Function. The function is caller-role aware server-side: it emails only the
 * authenticated caller (owner OR tenant) with the OTHER party's details, and
 * enforces authorization, 15-day expiry, 1/hr and 5/IST-day limits. The client
 * sends only `{ contact_request_id }` — never an email address or role.
 *
 * Owns per-id in-flight state and tracks `resend_expired` responses so callers
 * can disable the affordance without re-parsing errors. Call once per list and
 * pass the returned booleans down to each row.
 */
export function useResendReveal() {
  const [resending, setResending] = useState<Record<string, boolean>>({});
  const [serverExpired, setServerExpired] = useState<Set<string>>(new Set());

  const resend = useCallback(async (id: string) => {
    // In-flight duplicate-click protection.
    let already = false;
    setResending((s) => {
      if (s[id]) { already = true; return s; }
      return { ...s, [id]: true };
    });
    if (already) return;

    try {
      const { data, error } = await supabase.functions.invoke("resend-reveal", {
        body: { contact_request_id: id },
      });
      const status = (error as { context?: { status?: number } } | null)?.context?.status;
      const body = (data ?? (error as { context?: unknown } | null)?.context) as
        | { sent?: boolean; error?: string; retry_after_seconds?: number }
        | null;

      if (!error && body?.sent) {
        toast.success("Sent — check your inbox.");
      } else if (body?.error === "resend_expired") {
        setServerExpired((prev) => new Set(prev).add(id));
        toast.error("The resend window for this request has closed.");
      } else if (status === 429 && body?.error === "daily_resend_limit") {
        toast.error("Daily resend limit reached.");
      } else if (status === 429 || body?.error === "cooldown_active") {
        toast.error("Please wait before resending.");
      } else {
        toast.error("Could not resend right now. Please try again.");
      }
    } catch {
      toast.error("Could not resend right now. Please try again.");
    } finally {
      setResending((s) => ({ ...s, [id]: false }));
    }
  }, []);

  const isResending = useCallback((id: string) => !!resending[id], [resending]);
  const isServerExpired = useCallback((id: string) => serverExpired.has(id), [serverExpired]);

  return { resend, isResending, isServerExpired };
}
