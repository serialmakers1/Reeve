/**
 * RejectionPanel — H1 per D-140, with H2 (D-141) ack scoping via activity_log_id.
 *
 * Fetches the most recent property_activity_log row for the given property_id
 * where action IN ('listing_rejected', 'edit_rejected'). Renders an amber panel
 * with the reason (payload.reason canned label + optional italic reason_text
 * freeform "Other" line) and a support-email link.
 *
 * H2 acceptance test (D-141): the ack row lives at
 *   owner_action_acknowledgments (user_id, target_type, target_id, activity_log_id)
 * with NULLS NOT DISTINCT unique index. A "Got it" click UPSERTs the row for
 * the specific activity_log_id — hiding the panel for that rejection only.
 * A subsequent admin rejection writes a NEW log entry → new activity_log_id
 * → no ack exists → panel reappears. This resolves the second-rejection bug.
 *
 * Not gated on `status = 'changes_requested'` — the same panel renders for
 * `edit_rejected` outcomes where status stays `listed`.
 *
 * Support line uses `support@reeve.in` (D-139).
 */

import { useCallback, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  propertyId: string;
  userId: string;
}

interface RejectionRow {
  id: string;
  action: string;
  payload: {
    reason?: string;
    reason_text?: string;
    summary?: string;
    [k: string]: unknown;
  };
  created_at: string;
}

const REJECT_ACTIONS = ["listing_rejected", "edit_rejected"] as const;

export default function RejectionPanel({ propertyId, userId }: Props) {
  const [row, setRow] = useState<RejectionRow | null>(null);
  const [acked, setAcked] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLatestRejection = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logs } = await (supabase as any)
      .from("property_activity_log")
      .select("id, action, payload, created_at")
      .eq("property_id", propertyId)
      .in("action", REJECT_ACTIONS as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = (logs?.[0] ?? null) as RejectionRow | null;
    setRow(latest);
    if (latest) {
      // H2 (D-141): ack scoped to the specific activity_log_id.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ack } = await (supabase as any)
        .from("owner_action_acknowledgments")
        .select("id")
        .eq("user_id", userId)
        .eq("target_type", "property")
        .eq("target_id", propertyId)
        .eq("activity_log_id", latest.id)
        .maybeSingle();
      setAcked(!!ack);
    } else {
      setAcked(false);
    }
    setLoading(false);
  }, [propertyId, userId]);

  useEffect(() => {
    void fetchLatestRejection();
  }, [fetchLatestRejection]);

  const acknowledge = useCallback(async () => {
    if (!row) return;
    // NULLS NOT DISTINCT lets `upsert` on the 4-tuple be safely idempotent.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("owner_action_acknowledgments")
      .upsert(
        {
          user_id: userId,
          target_type: "property",
          target_id: propertyId,
          activity_log_id: row.id,
        },
        { onConflict: "user_id,target_type,target_id,activity_log_id" },
      );
    setAcked(true);
  }, [propertyId, userId, row]);

  if (loading || !row || acked) return null;

  const heading =
    row.action === "edit_rejected" ? "Your edit was rejected" : "Admin requested changes";
  const reasonLabel = row.payload.reason;
  const reasonText = row.payload.reason_text;

  return (
    <section
      className="rounded-lg border border-amber-200 bg-amber-50 p-4"
      aria-label={heading}
    >
      <div className="flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">{heading}</p>
          {reasonLabel && (
            <p className="text-sm text-amber-800 mt-1 whitespace-pre-line">{reasonLabel}</p>
          )}
          {reasonText && (
            <p className="text-sm italic text-amber-800/80 mt-1 whitespace-pre-line">
              {reasonText}
            </p>
          )}
          <p className="text-xs text-amber-700 mt-2">
            Questions?{" "}
            <a
              href="mailto:support@reeve.in"
              className="underline underline-offset-2 hover:text-amber-900"
            >
              Email support@reeve.in
            </a>
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={acknowledge}
          className="shrink-0 h-8 text-xs text-amber-900 hover:bg-amber-100"
        >
          Got it
        </Button>
      </div>
    </section>
  );
}
