import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { geoByIds, rowToCityToken, rowToLocationToken, type GeoSuggestRow } from "@/features/search/data/geoSuggestClient";
import { useSearchState } from "./useSearchState";
import type { CityToken, LocationToken, SearchContext } from "../domain/searchTypes";

/**
 * Deterministic signature of the geographic selection: ordered roots + ordered
 * details-with-scope. Ordered (not sorted) so a reorder also counts as a change.
 * Used to detect a newer user selection landing mid-hydration.
 */
function geoSignature(context: SearchContext): string {
  return JSON.stringify({
    roots: context.cities.map((c) => c.geoPlaceId),
    details: context.locations.map((l) => `${l.geoPlaceId}@${l.scopeRootId}`),
  });
}

/**
 * Authoritative canonical location hydration for URL/memory restore (Phase 4 · Prompt 3).
 *
 * When the restored Search state carries canonical geo IDs, the first-paint snapshot
 * tokens are treated as UNTRUSTED: this hook resolves every ID via
 * `reeve_search_geo_by_ids` and rebuilds tokens from the returned authoritative rows
 * (canonical kind/label/parent/searchRegion), enforcing slot-specific kinds
 * (root ↔ search_region/settlement, detail ↔ locality/road) and dropping any ID that
 * no longer resolves or whose owning root did not survive. Distance is reset to Auto
 * when no locality survives.
 *
 * `locationReady` gates the location-filtered LIST query so it never runs from the
 * unhydrated snapshot. A bare URL (no geo IDs) is ready immediately. Hydration runs
 * once for the initial restored signature; subsequent user selections come from the
 * suggest RPC and are already authoritative, so they are never re-gated. On failure
 * the geographic selection is dropped (Distance → Auto) and all other state preserved.
 *
 * Stale-guard covers BOTH component unmount AND a newer user selection: a geographic
 * signature is captured when the request starts and re-checked before applying either
 * the success or failure result. If the user changed City/Locality mid-flight, the late
 * response is discarded (no `replaceSearchSetup`) so it can never overwrite or clear the
 * newer, already-authoritative selection — the gate simply opens on the newer state.
 */
export function useCanonicalHydration(): { locationReady: boolean } {
  const { state, replaceSearchSetup } = useSearchState();
  const { cities, locations } = state.context;

  const initialIds = cities.map((c) => c.geoPlaceId).concat(locations.map((l) => l.geoPlaceId));
  const needsHydration = initialIds.length > 0;

  const doneRef = useRef(false);
  const runningRef = useRef(false);
  const [ready, setReady] = useState(!needsHydration);

  // Live refs so the one-shot effect never needs changing deps.
  const stateRef = useRef(state);
  stateRef.current = state;
  const replaceRef = useRef(replaceSearchSetup);
  replaceRef.current = replaceSearchSetup;

  useEffect(() => {
    if (doneRef.current || runningRef.current) return;
    const s = stateRef.current;
    const ids = s.context.cities
      .map((c) => c.geoPlaceId)
      .concat(s.context.locations.map((l) => l.geoPlaceId));
    if (ids.length === 0) {
      doneRef.current = true;
      setReady(true);
      return;
    }

    runningRef.current = true;
    let cancelled = false;
    // Snapshot the geographic signature this request is for (same `s` as `ids`).
    const startedSig = geoSignature(s.context);

    (async () => {
      let rows: GeoSuggestRow[] = [];
      let failed = false;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rows = await geoByIds([...new Set(ids)], supabase as any);
      } catch {
        failed = true;
      }
      if (cancelled) return;

      const cur = stateRef.current;
      // Newer user selection landed mid-flight → this response is stale. Discard it
      // (apply nothing) and open the gate on the newer, already-authoritative state.
      if (geoSignature(cur.context) !== startedSig) {
        doneRef.current = true;
        runningRef.current = false;
        setReady(true);
        return;
      }

      if (failed) {
        // Drop the whole geographic selection; preserve every other facet.
        replaceRef.current({
          mode: cur.context.mode ?? "rent",
          city: null,
          cities: [],
          locations: [],
          propertyTypes: cur.context.propertyTypes,
        });
        doneRef.current = true;
        runningRef.current = false;
        setReady(true);
        return;
      }

      const byId = new Map(rows.map((r) => [r.id, r]));

      // Roots: preserve order; keep only rows that resolve to a valid root kind.
      const nextCities: CityToken[] = [];
      for (const c of cur.context.cities) {
        const row = byId.get(c.geoPlaceId);
        const token = row ? rowToCityToken(row) : null;
        if (token) nextCities.push(token);
      }
      const survivingRoots = new Set(nextCities.map((c) => c.geoPlaceId));

      // Details: keep only rows that resolve to a valid detail kind AND whose owning
      // root survived. scopeRootId is taken from the snapshot (it references a root).
      const nextLocations: LocationToken[] = [];
      for (const l of cur.context.locations) {
        const row = byId.get(l.geoPlaceId);
        if (!row || !survivingRoots.has(l.scopeRootId)) continue;
        const token = rowToLocationToken(row, l.scopeRootId);
        if (token) nextLocations.push(token);
      }

      replaceRef.current({
        mode: cur.context.mode ?? "rent",
        city: nextCities[0]?.label.toLowerCase() ?? null,
        cities: nextCities,
        locations: nextLocations,
        propertyTypes: cur.context.propertyTypes,
      });
      doneRef.current = true;
      runningRef.current = false;
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { locationReady: ready };
}
