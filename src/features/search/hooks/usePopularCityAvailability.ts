import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { suggestGeo, selectCanonicalCityCandidate } from "@/features/search/data/geoSuggestClient";
import type { CityToken } from "@/features/search/domain/searchTypes";

export type CityAvailabilityStatus = "loading" | "available" | "unavailable" | "error";

export interface CityAvailabilityEntry {
  status: CityAvailabilityStatus;
  token?: CityToken;
}

async function resolveCity(name: string): Promise<CityAvailabilityEntry> {
  try {
    const rows = await suggestGeo(
      { query: name, kinds: ["settlement", "search_region"], limit: 5 },
      supabase as any,
    );
    const token = selectCanonicalCityCandidate(name, rows);
    if (token) return { status: "available", token };
    return { status: "unavailable" };
  } catch {
    return { status: "error" };
  }
}

export function usePopularCityAvailability(
  cities: readonly string[],
): { availability: Record<string, CityAvailabilityEntry>; retryCity: (name: string) => void } {
  const [availability, setAvailability] = useState<Record<string, CityAvailabilityEntry>>(() => {
    const init: Record<string, CityAvailabilityEntry> = {};
    for (const name of cities) init[name] = { status: "loading" };
    return init;
  });

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled(
      cities.map(async (name) => {
        const entry = await resolveCity(name);
        if (!cancelled) setAvailability((prev) => ({ ...prev, [name]: entry }));
      }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // cities is POPULAR_CITIES — a stable module-level constant; resolve once on mount

  const retryCity = useCallback((name: string) => {
    setAvailability((prev) => ({ ...prev, [name]: { status: "loading" } }));
    void resolveCity(name).then((entry) => {
      setAvailability((prev) => ({ ...prev, [name]: entry }));
    });
  }, []);

  return { availability, retryCity };
}
