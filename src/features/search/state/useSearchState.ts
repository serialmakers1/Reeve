import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { SearchMode } from "../domain/searchMode";
import type {
  SearchState,
  SearchContext,
  SearchCursor,
  RentFilters,
  BuyFilters,
  SearchSortKey,
  SearchViewMode,
  MapBounds,
} from "../domain/searchTypes";
import { getDefaultSearchState } from "../domain/searchDefaults";
import { parseSearchUrl } from "./parseSearchUrl";
import { serializeSearchState } from "./serializeSearchState";
import {
  changeSearchMode,
  hasValidSearchContext,
} from "./searchStateUtils";

/**
 * URL-first search state hook. The URL is the single source of truth.
 * Browser Back/Forward naturally restores prior search state.
 *
 * IMPORTANT — Setters write to the URL immediately (replace: true).
 * UI draft state (filter panel open, not yet Applied) must NOT call any
 * setter — use local useState in the filter panel and call setFilters
 * only on Apply.
 *
 * returnTo construction for auth flows:
 *   const returnTo = location.pathname + location.search
 * Always pass through buildReturnUrl() — it enforces the "/" prefix.
 */
export function useSearchState() {
  const [params, setSearchParams] = useSearchParams();
  const state = parseSearchUrl(params);

  const push = useCallback(
    (next: SearchState) => {
      setSearchParams(serializeSearchState(next), { replace: true });
    },
    [setSearchParams],
  );

  const setMode = useCallback(
    (mode: SearchMode) => {
      push(changeSearchMode(state, mode));
    },
    [state, push],
  );

  const setContext = useCallback(
    (partial: Partial<SearchContext>) => {
      push({ ...state, context: { ...state.context, ...partial }, cursor: null });
    },
    [state, push],
  );

  const setFilters = useCallback(
    (partial: Partial<RentFilters> | Partial<BuyFilters>) => {
      push({
        ...state,
        filters: { ...state.filters, ...partial } as RentFilters | BuyFilters,
        cursor: null,
      });
    },
    [state, push],
  );

  const setSort = useCallback(
    (sort: SearchSortKey) => {
      push({ ...state, sort, cursor: null });
    },
    [state, push],
  );

  const setView = useCallback(
    (view: SearchViewMode) => {
      push({ ...state, view });
    },
    [state, push],
  );

  const setCursor = useCallback(
    (cursor: SearchCursor | null) => {
      push({ ...state, cursor });
    },
    [state, push],
  );

  const setMapBounds = useCallback(
    (mapBounds: MapBounds | null) => {
      push({ ...state, mapBounds });
    },
    [state, push],
  );

  const setSelectedPropertyId = useCallback(
    (selectedPropertyId: string | null) => {
      push({ ...state, selectedPropertyId });
    },
    [state, push],
  );

  const resetFilters = useCallback(() => {
    const fresh = getDefaultSearchState(state.context.mode);
    push({ ...fresh, context: state.context });
  }, [state, push]);

  return {
    state,
    setMode,
    setContext,
    setFilters,
    setSort,
    setView,
    setCursor,
    setMapBounds,
    setSelectedPropertyId,
    resetFilters,
    hasValidContext: hasValidSearchContext(state),
  };
}
