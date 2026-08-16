import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFavourites } from "@/hooks/useFavourites";
import type { SearchPropertyResult } from "../data/searchResultContract";
import type { SearchCursor } from "../domain/searchTypes";
import {
  searchProperties,
  overlayPropertyCounts,
  overlayFavourites,
} from "../data/searchDataClient";
import type { SearchPropertiesResult } from "../data/searchDataClient";
import { useSearchState } from "./useSearchState";
import { buildSearchInput } from "./buildSearchInput";
import { useCanonicalHydration } from "./useCanonicalHydration";

// Deployed radius-eligibility failures are raised via PostgreSQL RAISE, so they
// surface in error.message (error.code = 'P0001'), NOT a dedicated code. Match text.
const RADIUS_FAILURE_RE =
  /locality_no_representative_point|radius_requires_locality|invalid_radius/;

function extractErrMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err != null && typeof (err as Record<string, unknown>).message === "string")
    return (err as { message: string }).message;
  return "";
}

export function isRadiusFailure(err: unknown): boolean {
  return RADIUS_FAILURE_RE.test(extractErrMsg(err));
}

// Narrow discriminator — only the live "no representative point" case gets the
// 5-second timer lifecycle; other radius failures use the clear-on-success path.
function isLocalityNoRepPoint(err: unknown): boolean {
  return extractErrMsg(err).includes("locality_no_representative_point");
}

// ─── Pure utility: merge two pages by ID, preserving server order ─────────────

export function mergeSearchPages(
  existing: SearchPropertyResult[],
  incoming: SearchPropertyResult[],
): SearchPropertyResult[] {
  const seen = new Set(existing.map((r) => r.id));
  const deduped = incoming.filter((r) => !seen.has(r.id));
  return [...existing, ...deduped];
}

// ─── Pure: area→city fallback trigger ────────────────────────────────────────
// Fires ONLY when the primary query genuinely succeeded with zero rows AND areas
// are selected. Loading/error must never trigger it (so failures aren't disguised
// as "no homes found").
export function shouldRecoverAreas(
  primarySucceeded: boolean,
  primaryResultCount: number,
  selectedAreaCount: number,
): boolean {
  return primarySucceeded && primaryResultCount === 0 && selectedAreaCount > 0;
}

// ─── Stable search key (everything except cursor) ─────────────────────────────

function computeSearchKey(state: ReturnType<typeof useSearchState>["state"]): string {
  return JSON.stringify({
    mode: state.context.mode,
    // Canonical geo_place UUIDs (never labels) so two same-name places differ.
    cities: state.context.cities.map((c) => c.geoPlaceId),
    locationIds: state.context.locations.map((l) => l.geoPlaceId),
    distanceKm: state.distanceKm,
    propertyTypes: state.context.propertyTypes,
    sort: state.sort,
    filters: state.filters,
  });
}

function cursorKey(cursor: ReturnType<typeof useSearchState>["state"]["cursor"]): string {
  return cursor ? JSON.stringify(cursor) : "null";
}

// ─── Accumulated page state ────────────────────────────────────────────────────

interface PageAccumulation {
  /** searchKey this accumulation belongs to — used to detect resets */
  key: string;
  results: SearchPropertyResult[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface AreaFallback {
  /** Recovery query state — only "success" with results shows city-wide listings. */
  status: "loading" | "success" | "error";
  hasResults: boolean;
  results: SearchPropertyResult[];
  areaLabels: string[];
  cityLabel: string;
}

export interface UseSearchResultsReturn {
  results: SearchPropertyResult[];
  /** Exact total over the filtered pre-cursor relation (Prompt 3 v2). */
  totalCount: number;
  hasNextPage: boolean;
  nextCursor: SearchCursor | null;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;
  error: Error | null;
  loadMore: () => void;
  /** Set only when primary succeeded with 0 rows AND areas are selected. */
  areaFallback: AreaFallback | null;
  /** One-shot notice when an explicit distance was auto-reset (radius ineligible). */
  distanceNotice: string | null;
  /** Whether canonical geo hydration has completed (gates location-filtered queries). */
  locationReady: boolean;
  /** Outcome of the most recent URL hydration attempt (null if not needed). */
  hydrationOutcome: import("./useCanonicalHydration").HydrationOutcome;
}

export function useSearchResults(): UseSearchResultsReturn {
  const { state, hasValidContext, setCursor, setDistanceKm } = useSearchState();
  const { isFavourited } = useFavourites();
  // Authoritative canonical hydration gate — the location-filtered query must not run
  // from an unhydrated URL/memory snapshot.
  const { locationReady, hydrationOutcome } = useCanonicalHydration();

  const searchKey = useMemo(() => computeSearchKey(state), [state]);
  const input = useMemo(() => buildSearchInput(state), [state]);
  // Key on the canonical geo_place UUIDs so a change to the selection refetches.
  const geoPlaceIdsKey = useMemo(() => JSON.stringify(input?.geoPlaceIds ?? []), [input]);
  const gatingAreas = false;
  // Gate only when the selection carries geo IDs (a bare/nationwide URL runs at once).
  const hasGeoSelection =
    state.context.cities.length > 0 || state.context.locations.length > 0;
  const locationGateOpen = !hasGeoSelection || locationReady;
  void gatingAreas;
  const [distanceNotice, setDistanceNotice] = useState<string | null>(null);

  // Accumulated pages across load-more calls for the same searchKey
  const [accumulated, setAccumulated] = useState<PageAccumulation>({
    key: "",
    results: [],
  });

  const query = useQuery<SearchPropertiesResult, Error>({
    // Include cursorKey so each "load more" fires a new query
    queryKey: ["searchResults", searchKey, geoPlaceIdsKey, cursorKey(state.cursor)],
    enabled: hasValidContext && input !== null && locationGateOpen,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    // Never retry deterministic Radius eligibility errors (400s that will not resolve
    // without a state change). Preserve the app-global retry policy (1) for all others.
    retry: (failureCount, error) => !isRadiusFailure(error) && failureCount < 1,
    queryFn: async (): Promise<SearchPropertiesResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = await searchProperties(input!, supabase as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withCounts = await overlayPropertyCounts(page.results, supabase as any);
      return { ...page, results: withCounts };
    },
  });

  // Merge successful query results into accumulated pages
  useEffect(() => {
    if (!query.data) return;
    const currentKey = searchKey;
    const incoming = query.data.results;

    setAccumulated((prev) => {
      if (prev.key !== currentKey) {
        // New search — start fresh (reset)
        return { key: currentKey, results: incoming };
      }
      // Load-more — merge deduped
      return { key: currentKey, results: mergeSearchPages(prev.results, incoming) };
    });
  }, [query.data, searchKey]);

  // Apply favourite overlay at render time (stays fresh without re-fetching)
  const results = useMemo(
    () =>
      accumulated.key === searchKey
        ? accumulated.results.map((r) => ({ ...r, isFavourited: isFavourited(r.id) }))
        : [],
    [accumulated, searchKey, isFavourited],
  );

  const hasPages = accumulated.key === searchKey && accumulated.results.length > 0;

  // While canonical hydration is pending, present a loading state (never empty).
  const isInitialLoading =
    (!locationGateOpen && hasValidContext) ||
    (!hasPages && query.isFetching && hasValidContext);
  const isLoadingMore = hasPages && query.isFetching && state.cursor !== null;
  const isRefreshing = hasPages && query.isFetching && state.cursor === null;
  const isEmpty =
    locationGateOpen &&
    !query.isFetching &&
    !query.error &&
    hasValidContext &&
    accumulated.key === searchKey &&
    accumulated.results.length === 0 &&
    query.isSuccess;

  const loadMore = useCallback(() => {
    const nextCursor = query.data?.nextCursor ?? null;
    if (nextCursor) setCursor(nextCursor);
  }, [query.data?.nextCursor, setCursor]);

  // Stale-cursor recovery: a cursor page that comes back empty while the true
  // total is > 0 means the bookmarked/deep cursor no longer resolves — clear it
  // and fall back to page 1 (once; total_count guards against a genuine empty set).
  useEffect(() => {
    if (
      query.isSuccess &&
      state.cursor !== null &&
      (query.data?.results.length ?? 0) === 0 &&
      (query.data?.totalCount ?? 0) > 0
    ) {
      setCursor(null);
    }
  }, [query.isSuccess, query.data, state.cursor, setCursor]);

  // Radius-eligibility failure recovery (one-shot). The deployed helper RAISEs when a
  // selected locality has no representative_point / a radius lacks a locality anchor.
  // Reset Distance to Auto ONCE (guarded per searchKey so it can't loop) and show a
  // single notice; never remove the locality itself.
  const radiusResetRef = useRef<Set<string>>(new Set());
  // Timer ref for the 5-second locality_no_representative_point notice.
  // When non-null, the timer owns the notice and success-clear must not fire.
  const noticeDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (noticeDismissRef.current) clearTimeout(noticeDismissRef.current); }, []);

  useEffect(() => {
    if (isRadiusFailure(query.error) && state.distanceKm !== null) {
      if (!radiusResetRef.current.has(searchKey)) {
        radiusResetRef.current.add(searchKey);
        setDistanceKm(null);
        if (isLocalityNoRepPoint(query.error)) {
          // 5-second timer-owned notice; do NOT rely on the success-clear effect.
          if (noticeDismissRef.current) clearTimeout(noticeDismissRef.current);
          setDistanceNotice(
            "Distance reset to Auto because radius search isn't available for this locality.",
          );
          noticeDismissRef.current = setTimeout(() => {
            setDistanceNotice(null);
            noticeDismissRef.current = null;
          }, 5000);
        } else {
          // Other radius failures (radius_requires_locality, invalid_radius): return
          // notice ownership to the success-clear effect below.
          if (noticeDismissRef.current) {
            clearTimeout(noticeDismissRef.current);
            noticeDismissRef.current = null;
          }
          setDistanceNotice(
            "Distance search isn't available for one of these localities yet — showing exact-location matches instead.",
          );
        }
      }
    }
  }, [query.error, state.distanceKm, searchKey, setDistanceKm]);

  // Clear radiusResetRef when distanceKm returns to null so a later user-initiated
  // km selection for the same locality can be handled again (not silently skipped).
  useEffect(() => {
    if (state.distanceKm === null) {
      radiusResetRef.current.clear();
    }
  }, [state.distanceKm]);

  // Clear the notice once a search without a distance failure succeeds — only when
  // no timer currently owns the notice (locality_no_representative_point path).
  useEffect(() => {
    if (query.isSuccess && distanceNotice && noticeDismissRef.current === null) {
      setDistanceNotice(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.isSuccess, searchKey]);

  // True total over the filtered pre-cursor relation (exact; independent of page).
  const totalCount = query.data?.totalCount ?? results.length;

  // ── Area → city fallback recovery ──────────────────────────────────────────
  // Trigger ONLY when the primary query genuinely succeeded with zero rows AND
  // areas are selected. Never on loading/error (those surface as-is).
  const shouldRecover = shouldRecoverAreas(
    query.isSuccess,
    query.data?.results.length ?? 0,
    state.context.locations.length,
  );

  const recoveryInput = useMemo(
    // City-wide recovery drops the detail (locality/road) UUIDs + radius, keeping only
    // the root (city) UUIDs. Explicitly labelled to the user — not a hidden expansion.
    () =>
      input
        ? {
            ...input,
            geoPlaceIds: [...new Set(state.context.cities.map((c) => c.geoPlaceId))],
            distanceKm: null,
            cursor: null,
          }
        : null,
    [input, state.context.cities],
  );

  const recoveryQuery = useQuery<SearchPropertiesResult, Error>({
    queryKey: ["searchResultsRecovery", searchKey],
    enabled: shouldRecover && recoveryInput !== null,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SearchPropertiesResult> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = await searchProperties(recoveryInput!, supabase as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withCounts = await overlayPropertyCounts(page.results, supabase as any);
      return { ...page, results: withCounts };
    },
  });

  const recoveryResults = useMemo(
    () => (recoveryQuery.data?.results ?? []).map((r) => ({ ...r, isFavourited: isFavourited(r.id) })),
    [recoveryQuery.data, isFavourited],
  );

  const cityLabel = state.context.city
    ? state.context.city.charAt(0).toUpperCase() + state.context.city.slice(1)
    : "";

  const areaFallback: AreaFallback | null = shouldRecover
    ? {
        status: recoveryQuery.isSuccess ? "success" : recoveryQuery.isError ? "error" : "loading",
        hasResults: (recoveryQuery.data?.results.length ?? 0) > 0,
        results: recoveryResults,
        areaLabels: state.context.locations.map((l) => l.label),
        cityLabel,
      }
    : null;

  return {
    results,
    totalCount,
    hasNextPage: query.data?.hasNextPage ?? false,
    nextCursor: query.data?.nextCursor ?? null,
    isInitialLoading,
    isLoadingMore,
    isRefreshing,
    isEmpty,
    // A radius-eligibility failure is auto-recovered (Distance→Auto), so it must not
    // surface as a hard error — the re-run without distance produces the real result.
    error: isRadiusFailure(query.error) ? null : (query.error ?? null),
    loadMore,
    areaFallback,
    distanceNotice,
    locationReady,
    hydrationOutcome,
  };
}
