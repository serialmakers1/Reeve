import { useEffect, useRef, useState } from "react";
import { useResolveCity, type CanonicalCity } from "@/features/search/hooks/useResolveCity";

/**
 * Fetches coarse Vercel IP geo once (India-only) and resolves it to a canonical
 * Search city via the shared Google resolve. Returns the approximate canonical city
 * (or null). All failures are swallowed — the caller falls back to nationwide.
 *
 * Does NOT apply anything to state; the caller decides whether/how to apply it,
 * guarding against overwriting a user selection.
 */
export function useVercelGeoCity(enabled: boolean): { approxCity: CanonicalCity | null } {
  const { resolveCityByName, isReady } = useResolveCity();
  const [approxCity, setApproxCity] = useState<CanonicalCity | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isReady || ranRef.current) return;
    ranRef.current = true;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/geo");
        if (!res.ok) return;
        const geo = (await res.json()) as { country?: string | null; city?: string | null };
        if (cancelled) return;
        if (geo?.country !== "IN" || !geo?.city) return;
        const canonical = await resolveCityByName(geo.city);
        if (!cancelled && canonical) setApproxCity(canonical);
      } catch {
        /* nationwide fallback */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isReady, resolveCityByName]);

  return { approxCity };
}
