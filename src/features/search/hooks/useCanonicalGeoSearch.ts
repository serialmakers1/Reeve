import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { suggestGeo, type GeoSuggestRow } from "@/features/search/data/geoSuggestClient";

/**
 * Debounced canonical geography suggestion hook (Phase 4 · Prompt 3).
 * Replaces the Google Places autocomplete hook for the LIST Search UI. Blank input
 * clears; a request-id stale-guard drops out-of-order responses; rows are deduped by
 * canonical `geo_place` UUID. No Google Places / Geocoding.
 */
export interface UseCanonicalGeoSearchReturn {
  suggestions: GeoSuggestRow[];
  isLoading: boolean;
  error: Error | null;
  fetchSuggestions: (input: string, opts?: FetchOpts) => void;
  clearSuggestions: () => void;
}

interface FetchOpts {
  kinds?: GeoSuggestRow["kind"][];
  parentGeoPlaceId?: string | null;
  searchRegionId?: string | null;
  limit?: number;
}

const DEBOUNCE_MS = 250;

export function useCanonicalGeoSearch(): UseCanonicalGeoSearchReturn {
  const [suggestions, setSuggestions] = useState<GeoSuggestRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationRef = useRef(0);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      generationRef.current++;
    },
    [],
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    setIsLoading(false);
  }, []);

  const fetchSuggestions = useCallback((input: string, opts?: FetchOpts) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const gen = ++generationRef.current;
    if (!input.trim()) {
      setSuggestions([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await suggestGeo(
          {
            query: input,
            kinds: opts?.kinds,
            parentGeoPlaceId: opts?.parentGeoPlaceId ?? null,
            searchRegionId: opts?.searchRegionId ?? null,
            limit: opts?.limit,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          supabase as any,
        );
        if (gen !== generationRef.current) return;
        // Dedupe by canonical UUID, preserve backend ranking.
        const seen = new Set<string>();
        setSuggestions(rows.filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true))));
      } catch (e) {
        if (gen !== generationRef.current) return;
        setSuggestions([]);
        setError(e instanceof Error ? e : new Error("Geo suggestion failed"));
      } finally {
        if (gen === generationRef.current) setIsLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  return { suggestions, isLoading, error, fetchSuggestions, clearSuggestions };
}
