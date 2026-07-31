import { useState, useEffect, useCallback, useMemo } from "react";
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
import { useAreaViewports } from "../hooks/useAreaViewports";

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
    city: state.context.city,
    locationIds: state.context.locations.map((l) => l.id),
    propertyType: state.context.propertyType,
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
}

export function useSearchResults(): UseSearchResultsReturn {
  const { state, hasValidContext, setCursor } = useSearchState();
  const { isFavourited } = useFavourites();
  const { areaViewportsReady, areaViewportsError } = useAreaViewports();

  const searchKey = useMemo(() => computeSearchKey(state), [state]);
  const input = useMemo(() => buildSearchInput(state), [state]);
  // Area boxes are not part of computeSearchKey; include them so hydration → refetch.
  const areaBoxesKey = useMemo(() => JSON.stringify(input?.areaBoxes ?? []), [input]);
  // Gating: areas selected but viewports not yet hydrated → hold the query (loading),
  // never fire it without the area (which would masquerade as a broader search).
  const gatingAreas =
    hasValidContext && state.context.locations.length > 0 && !areaViewportsReady && !areaViewportsError;

  // Accumulated pages across load-more calls for the same searchKey
  const [accumulated, setAccumulated] = useState<PageAccumulation>({
    key: "",
    results: [],
  });

  const query = useQuery<SearchPropertiesResult, Error>({
    // Include cursorKey so each "load more" fires a new query
    queryKey: ["searchResults", searchKey, areaBoxesKey, cursorKey(state.cursor)],
    enabled: hasValidContext && input !== null && areaViewportsReady,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
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

  // While area viewports hydrate, present a loading state (never empty/city-wide).
  const isInitialLoading = gatingAreas || (!hasPages && query.isFetching && hasValidContext);
  const isLoadingMore = hasPages && query.isFetching && state.cursor !== null;
  const isRefreshing = hasPages && query.isFetching && state.cursor === null;
  const isEmpty =
    !gatingAreas &&
    !areaViewportsError &&
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

  // ── Area → city fallback recovery ──────────────────────────────────────────
  // Trigger ONLY when the primary query genuinely succeeded with zero rows AND
  // areas are selected. Never on loading/error (those surface as-is).
  const shouldRecover = shouldRecoverAreas(
    query.isSuccess,
    query.data?.results.length ?? 0,
    state.context.locations.length,
  );

  const recoveryInput = useMemo(
    // City-wide recovery clears BOTH area filters (boxes + legacy ids); all else preserved.
    () => (input ? { ...input, areaBoxes: [], locationIds: [], cursor: null } : null),
    [input],
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
    hasNextPage: query.data?.hasNextPage ?? false,
    nextCursor: query.data?.nextCursor ?? null,
    isInitialLoading,
    isLoadingMore,
    isRefreshing,
    isEmpty,
    error: areaViewportsError
      ? new Error("We couldn't load your selected areas. Please try again.")
      : (query.error ?? null),
    loadMore,
    areaFallback,
  };
}
