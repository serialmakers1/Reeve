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
export type VercelGeoStatus = "idle" | "loading" | "done";

export function useVercelGeoCity(
  enabled: boolean,
): { approxCity: CanonicalCity | null; status: VercelGeoStatus } {
  const { resolveCityByName, isReady } = useResolveCity();
  const [approxCity, setApproxCity] = useState<CanonicalCity | null>(null);
  // "done" means the attempt finished (success or failure) — the bootstrap uses this
  // to fall through to the setup panel when no usable city was resolved.
  const [status, setStatus] = useState<VercelGeoStatus>("idle");
  const ranRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isReady || ranRef.current) return;
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
        const canonical = await resolveCityByName(geo.city);
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
  }, [enabled, isReady, resolveCityByName]);

  return { approxCity, status };
}
