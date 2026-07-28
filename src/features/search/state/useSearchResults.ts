import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFavourites } from "@/hooks/useFavourites";
import type { SearchPropertyResult } from "../data/searchResultContract";
import {
  searchProperties,
  overlayPropertyCounts,
  overlayFavourites,
} from "../data/searchDataClient";
import type { SearchPropertiesResult } from "../data/searchDataClient";
import { useSearchState } from "./useSearchState";
import { buildSearchInput } from "./buildSearchInput";

// ─── Pure utility: merge two pages by ID, preserving server order ─────────────

export function mergeSearchPages(
  existing: SearchPropertyResult[],
  incoming: SearchPropertyResult[],
): SearchPropertyResult[] {
  const seen = new Set(existing.map((r) => r.id));
  const deduped = incoming.filter((r) => !seen.has(r.id));
  return [...existing, ...deduped];
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

export interface UseSearchResultsReturn {
  results: SearchPropertyResult[];
  hasNextPage: boolean;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;
  error: Error | null;
  loadMore: () => void;
}

export function useSearchResults(): UseSearchResultsReturn {
  const { state, hasValidContext, setCursor } = useSearchState();
  const { isFavourited } = useFavourites();

  const searchKey = useMemo(() => computeSearchKey(state), [state]);
  const input = useMemo(() => buildSearchInput(state), [state]);

  // Accumulated pages across load-more calls for the same searchKey
  const [accumulated, setAccumulated] = useState<PageAccumulation>({
    key: "",
    results: [],
  });

  const query = useQuery<SearchPropertiesResult, Error>({
    // Include cursorKey so each "load more" fires a new query
    queryKey: ["searchResults", searchKey, cursorKey(state.cursor)],
    enabled: hasValidContext && input !== null,
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

  const isInitialLoading = !hasPages && query.isFetching && hasValidContext;
  const isLoadingMore = hasPages && query.isFetching && state.cursor !== null;
  const isRefreshing = hasPages && query.isFetching && state.cursor === null;
  const isEmpty =
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

  return {
    results,
    hasNextPage: query.data?.hasNextPage ?? false,
    isInitialLoading,
    isLoadingMore,
    isRefreshing,
    isEmpty,
    error: query.error ?? null,
    loadMore,
  };
}
