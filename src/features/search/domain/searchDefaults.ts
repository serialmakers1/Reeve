import type { SearchMode } from "./searchMode";
import type {
  SearchState,
  SearchContext,
  RentFilters,
  BuyFilters,
} from "./searchTypes";
import { DEFAULT_SORT } from "./searchConstants";

export function getDefaultRentFilters(): RentFilters {
  return {};
}

export function getDefaultBuyFilters(): BuyFilters {
  return {};
}

export function getDefaultSearchContext(): SearchContext {
  return { mode: null, city: null, cities: [], locations: [], propertyTypes: [] };
}

export function getDefaultSearchState(mode: SearchMode | null): SearchState {
  return {
    context: { ...getDefaultSearchContext(), mode },
    filters: mode === "buy" ? getDefaultBuyFilters() : getDefaultRentFilters(),
    sort: DEFAULT_SORT,
    cursor: null,
    selectedPropertyId: null,
    distanceKm: null,
  };
}
