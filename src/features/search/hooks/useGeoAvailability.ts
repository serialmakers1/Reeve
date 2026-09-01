import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { availableGeoIds } from "@/features/search/data/geoSuggestClient";
import type { SearchMode } from "@/features/search/domain/searchMode";

export type AvailState = "idle" | "loading" | "success" | "error";

export interface GeoAvailability {
  /** idle = no mode / no candidates (do not filter); loading = check in flight (do not expose rows);
   *  success = availableIds is authoritative; error = fail open (show canonical). */
  availState: AvailState;
  /** Meaningful only when availState === "success". */
  availableIds: Set<string>;
}

const EMPTY: Set<string> = new Set();
const SEP = "";

interface Committed {
  key: string;
  availState: "success" | "error";
  availableIds: Set<string>;
}

/**
 * Inventory-/mode-aware availability for a candidate id set (Phase 3). The result is stamped with a
 * request key (candidates + mode + root) and derived synchronously, so a change to any of them
 * reports "loading" on the SAME render — a previous request's result is never reused. The generation
 * is bumped on every effect run (including → null and rapid A→B→A), so a late/abandoned response can
 * never commit, even when the key returns to a previous value.
 *
 * `mode` null ⇒ idle (no filtering). RPC error ⇒ "error" (callers fail open). Reuses the single
 * `availableGeoIds` primitive (→ reeve_geo_ids_with_inventory).
 */
export function useGeoAvailability(
  candidateIds: string[],
  mode: SearchMode | null | undefined,
  rootGeoPlaceId?: string | null,
): GeoAvailability {
  const currentKey =
    mode && candidateIds.length > 0
      ? `${mode}${SEP}${rootGeoPlaceId ?? ""}${SEP}${candidateIds.join(SEP)}`
      : null;

  const [committed, setCommitted] = useState<Committed | null>(null);
  const genRef = useRef(0);

  // Adjust-state-during-render: the instant the request key changes, discard any stored result —
  // it belongs to a previous occupancy of the key. This keeps a recurring key (A→B→A) at "loading"
  // until a NEW request for it commits, with no one-frame reuse of a previously-completed A.
  const [prevKey, setPrevKey] = useState<string | null>(currentKey);
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setCommitted(null);
  }

  useEffect(() => {
    const gen = ++genRef.current; // ALWAYS first — invalidates any in-flight request.
    if (currentKey === null) {
      setCommitted(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const set = await availableGeoIds(candidateIds, mode as SearchMode, supabase as any, rootGeoPlaceId);
        if (cancelled || gen !== genRef.current) return;
        setCommitted({ key: currentKey, availState: "success", availableIds: set });
      } catch {
        if (cancelled || gen !== genRef.current) return;
        setCommitted({ key: currentKey, availState: "error", availableIds: EMPTY });
      }
    })();
    return () => {
      cancelled = true;
    };
    // currentKey encodes candidates + mode + root; supabase is a stable singleton.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  if (currentKey === null) return { availState: "idle", availableIds: EMPTY };
  if (committed && committed.key === currentKey) {
    return { availState: committed.availState, availableIds: committed.availableIds };
  }
  return { availState: "loading", availableIds: EMPTY };
}
