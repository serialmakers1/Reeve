import type { SearchMode } from "./searchMode";
import type {
  SearchState,
  SearchContext,
  RentFilters,
  BuyFilters,
} from "./searchTypes";
import { DEFAULT_SORT, DEFAULT_VIEW } from "./searchConstants";

export function getDefaultRentFilters(): RentFilters {
  return {};
}

export function getDefaultBuyFilters(): BuyFilters {
  return {};
}

export function getDefaultSearchContext(): SearchContext {
  return { mode: null, city: null, locations: [], propertyType: null };
}

export function getDefaultSearchState(mode: SearchMode | null): SearchState {
  return {
    context: { ...getDefaultSearchContext(), mode },
    filters: mode === "buy" ? getDefaultBuyFilters() : getDefaultRentFilters(),
    sort: DEFAULT_SORT,
    view: DEFAULT_VIEW,
    cursor: null,
    mapBounds: null,
    selectedPropertyId: null,
  };
}
