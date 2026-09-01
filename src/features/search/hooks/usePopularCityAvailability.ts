import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { suggestGeo, selectCanonicalCityCandidate, availableGeoIds } from "@/features/search/data/geoSuggestClient";
import type { CityToken } from "@/features/search/domain/searchTypes";
import type { SearchMode } from "@/features/search/domain/searchMode";

export type CityAvailabilityStatus = "loading" | "available" | "unavailable" | "error";

export interface CityAvailabilityEntry {
  status: CityAvailabilityStatus;
  token?: CityToken;
}

/** Resolve a curated Popular City name to its canonical root token (or null if it doesn't resolve). */
async function resolveCityToken(name: string): Promise<CityToken | null> {
  const rows = await suggestGeo(
    { query: name, kinds: ["settlement", "search_region"], limit: 5 },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase as any,
  );
  return selectCanonicalCityCandidate(name, rows);
}

interface Snapshot {
  key: string;
  entries: Record<string, CityAvailabilityEntry>;
}

/**
 * Popular City availability (Phase 3). "available" means BOTH the name resolves to canonical geography
 * AND that geography has public inventory for the selected mode — not merely that a token exists.
 * Tokens are resolved once and cached; availability is a single batched `availableGeoIds` call that
 * re-runs on Rent/Buy change.
 *
 * The returned map is derived synchronously from a snapshot stamped with a request key (mode + cities),
 * so on a mode/list change the callers immediately see "loading" rather than the previous mode's
 * statuses. The generation is bumped on every effect run and in retryCity, and results commit only
 * when the generation still matches — so an abandoned (rent→buy→rent) compute can never overwrite the
 * current statuses even when it resolves late.
 *
 * A name that doesn't resolve → `unavailable` (no canonical geography). A resolution FAILURE → `error`
 * (retryable). Availability-RPC error → FAIL OPEN (resolved cities `available`). `mode` null → resolved
 * cities `available` without calling `availableGeoIds`.
 */
export function usePopularCityAvailability(
  cities: readonly string[],
  mode: SearchMode | null,
): { availability: Record<string, CityAvailabilityEntry>; retryCity: (name: string) => void } {
  const citiesKey = cities.join("");
  const currentKey = `${mode ?? "null"}${citiesKey}`;

  const tokensRef = useRef<Map<string, CityToken | null>>(new Map());
  const genRef = useRef(0);
  const modeRef = useRef<SearchMode | null>(mode);
  modeRef.current = mode;
  const currentKeyRef = useRef(currentKey);
  currentKeyRef.current = currentKey;

  const loadingEntry = useCallback(
    (name: string): CityAvailabilityEntry => ({ status: "loading", token: tokensRef.current.get(name) ?? undefined }),
    [],
  );
  const allLoading = useCallback(
    (names: readonly string[]): Record<string, CityAvailabilityEntry> => {
      const m: Record<string, CityAvailabilityEntry> = {};
      for (const name of names) m[name] = loadingEntry(name);
      return m;
    },
    [loadingEntry],
  );

  const [snapshot, setSnapshot] = useState<Snapshot>(() => ({ key: currentKey, entries: allLoading(cities) }));

  // Adjust-state-during-render: on any key change (incl. a recurring mode like rent→buy→rent) discard
  // the prior snapshot so a previously-completed key can never resurface — it renders loading until a
  // NEW request for the current key commits.
  const [prevKey, setPrevKey] = useState<string>(currentKey);
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    setSnapshot({ key: currentKey, entries: allLoading(cities) });
  }

  const compute = useCallback(
    async (names: readonly string[], m: SearchMode | null, gen: number, key: string): Promise<void> => {
      // 1) Resolve any not-yet-cached tokens. A resolution FAILURE (network/RPC) is retryable and
      // distinct from a definitive "no canonical geography" (empty/ambiguous → cached null).
      const resolveErrored = new Set<string>();
      await Promise.allSettled(
        names.map(async (name) => {
          if (tokensRef.current.has(name)) return;
          try {
            tokensRef.current.set(name, await resolveCityToken(name));
          } catch {
            resolveErrored.add(name); // leave uncached so retry can resolve later
          }
        }),
      );
      if (gen !== genRef.current) return;

      const next: Record<string, CityAvailabilityEntry> = {};
      const withToken: Array<readonly [string, CityToken]> = [];
      for (const name of names) {
        if (resolveErrored.has(name)) { next[name] = { status: "error" }; continue; }
        const token = tokensRef.current.get(name) ?? null;
        if (!token) { next[name] = { status: "unavailable" }; continue; }
        withToken.push([name, token] as const);
      }

      const commit = (entries: Record<string, CityAvailabilityEntry>) => {
        if (gen !== genRef.current) return;
        setSnapshot((prev) => ({ key, entries: { ...(prev.key === key ? prev.entries : {}), ...entries } }));
      };

      // 2) mode NULL → cannot check inventory; a resolved token stays available.
      if (!m) {
        for (const [name, token] of withToken) next[name] = { status: "available", token };
        commit(next);
        return;
      }

      // 3) Batch inventory check; error → fail open.
      try {
        const ids = withToken.map(([, t]) => t.geoPlaceId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const set = await availableGeoIds(ids, m, supabase as any);
        if (gen !== genRef.current) return;
        for (const [name, token] of withToken) {
          next[name] = set.has(token.geoPlaceId)
            ? { status: "available", token }
            : { status: "unavailable", token };
        }
      } catch {
        if (gen !== genRef.current) return;
        for (const [name, token] of withToken) next[name] = { status: "available", token };
      }
      commit(next);
    },
    [],
  );

  // Re-check when the mode changes OR the city list changes (token cache avoids re-resolving names).
  useEffect(() => {
    const gen = ++genRef.current;
    void compute(cities, mode, gen, currentKey);
    // citiesKey/mode encode the request; compute is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, citiesKey]);

  const retryCity = useCallback(
    (name: string) => {
      const gen = ++genRef.current;
      const key = currentKeyRef.current;
      tokensRef.current.delete(name); // force fresh resolution
      setSnapshot((prev) => (prev.key === key ? { key, entries: { ...prev.entries, [name]: { status: "loading" } } } : prev));
      void compute([name], modeRef.current, gen, key);
    },
    [compute],
  );

  // Derived: reuse the snapshot only when it matches the current request key; else all-loading.
  const availability =
    snapshot.key === currentKey
      ? { ...allLoading(cities), ...snapshot.entries }
      : allLoading(cities);

  return { availability, retryCity };
}
