import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveCanonicalCityByName } from "@/features/search/data/geoSuggestClient";
import type { CityToken } from "@/features/search/domain/searchTypes";

/**
 * Fetches coarse Vercel IP geo once (India-only) and resolves the city NAME to a
 * Reeve canonical root CityToken via `reeve_search_geo_suggest` (Phase 4 · Prompt 3).
 * No Google. All failures are swallowed — the caller falls back to setup/nationwide.
 *
 * Does NOT apply anything to state; the caller decides whether/how to apply it,
 * guarding against overwriting a user selection.
 */
export type VercelGeoStatus = "idle" | "loading" | "done";

export function useVercelGeoCity(
  enabled: boolean,
): { approxCity: CityToken | null; status: VercelGeoStatus } {
  const [approxCity, setApproxCity] = useState<CityToken | null>(null);
  const [status, setStatus] = useState<VercelGeoStatus>("idle");
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled || ranRef.current) return;
    ranRef.current = true;
    let cancelled = false;
    setStatus("loading");

    (async () => {
      try {
        const res = await fetch("/api/geo");
        if (!res.ok) return;
        const geo = (await res.json()) as { country?: string | null; city?: string | null };
        if (cancelled) return;
        if (geo?.country !== "IN" || !geo?.city) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const canonical = await resolveCanonicalCityByName(geo.city, supabase as any);
        if (!cancelled && canonical) setApproxCity(canonical);
      } catch {
        /* nationwide fallback */
      } finally {
        if (!cancelled) setStatus("done");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { approxCity, status };
}
