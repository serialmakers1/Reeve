import { useEffect, useRef, useState } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useSearchState } from "@/features/search/state/useSearchState";
import type { AreaViewport } from "@/features/search/domain/searchTypes";

/**
 * Ensures every selected Area token carries a `viewport` before an Area-filtered
 * query is treated as ready. Areas restored from an older URL may have a `placeId`
 * but no `viewport`; we resolve those from Google (Place.fetchFields(["viewport"]))
 * and write them back into Search state. A selected Area is NEVER silently dropped:
 * the query stays gated (`areaViewportsReady=false`) until all resolve, and a genuine
 * resolve failure surfaces via `areaViewportsError` (never a silent city-wide search).
 */
export function useAreaViewports(): { areaViewportsReady: boolean; areaViewportsError: boolean } {
  const { state, setContext } = useSearchState();
  const placesLib = useMapsLibrary("places");
  const locations = state.context.locations;
  const [error, setError] = useState(false);
  const attemptedRef = useRef<Set<string>>(new Set());

  const missing = locations.filter((l) => l.placeId && !l.viewport);
  const missingKey = missing.map((l) => l.id).join(",");
  const areaViewportsReady = missing.length === 0;

  useEffect(() => {
    if (!placesLib || missing.length === 0) return;
    const toResolve = missing.filter((l) => !attemptedRef.current.has(l.id));
    if (toResolve.length === 0) return;
    toResolve.forEach((l) => attemptedRef.current.add(l.id));

    let cancelled = false;
    (async () => {
      try {
        const resolved = await Promise.all(
          toResolve.map(async (l) => {
            try {
              const place = new (placesLib as any).Place({ id: l.placeId });
              await place.fetchFields({ fields: ["viewport"] });
              const vp = place.viewport;
              const viewport: AreaViewport | null = vp
                ? {
                    sw: { lat: vp.getSouthWest().lat(), lng: vp.getSouthWest().lng() },
                    ne: { lat: vp.getNorthEast().lat(), lng: vp.getNorthEast().lng() },
                  }
                : null;
              return { id: l.id, viewport };
            } catch {
              return { id: l.id, viewport: null };
            }
          }),
        );
        if (cancelled) return;
        const byId = new Map(resolved.map((r) => [r.id, r.viewport]));
        if (resolved.some((r) => r.viewport === null)) setError(true);
        const cur = state.context.locations;
        const updated = cur.map((l) => (byId.get(l.id) ? { ...l, viewport: byId.get(l.id)! } : l));
        if (updated.some((l, i) => l !== cur[i])) setContext({ locations: updated });
      } catch {
        if (!cancelled) setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLib, missingKey]);

  return { areaViewportsReady, areaViewportsError: error };
}
