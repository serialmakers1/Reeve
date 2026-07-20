import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// D-P4-014: fire-and-forget view tracking. RPC handles owner exclusion, 30s
// cooldown, and daily dedup server-side — this hook is a silent trigger.

const VISITOR_ID_KEY = "reeve_visitor_id";

// Module-level fallback for Safari private mode / storage-disabled contexts.
let inMemoryVisitorId: string | null = null;

function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    if (!inMemoryVisitorId) {
      inMemoryVisitorId = crypto.randomUUID();
    }
    return inMemoryVisitorId;
  }
}

export function useTrackPropertyView(
  propertyId: string | null | undefined,
  _ownerId: string | null | undefined,
): void {
  const firedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!propertyId) return;
    // Ref-keyed to propertyId — fires again when the user navigates between
    // properties without unmounting. StrictMode double-invoke is absorbed.
    if (firedForRef.current === propertyId) return;
    firedForRef.current = propertyId;

    const visitorId = getOrCreateVisitorId();

    // Fire-and-forget. Errors swallowed — never surface to UI.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .rpc("track_property_view", {
        p_property_id: propertyId,
        p_visitor_id: visitorId,
      })
      .then(() => { /* silent */ })
      .catch(() => { /* silent */ });
  }, [propertyId]);
}
