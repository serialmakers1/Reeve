// ─── Domain types ─────────────────────────────────────────────────────────────
export type { SearchMode, DbListingType, UnresolvedMode } from "./domain/searchMode";
export { listingTypeBySearchMode, VALID_MODES, parseSearchMode, serializeSearchMode, isValidMode } from "./domain/searchMode";

export type {
  SearchGeoKind,
  LocationToken,
  CityToken,
  SearchContext,
  SearchCursor,
  RentFilters,
  BuyFilters,
  BhkValue,
  FurnishingValue,
  ParkingValue,
  PossessionValue,
  PetPolicyValue,
  KhataValue,
  RentSortKey,
  BuySortKey,
  SearchSortKey,
  SearchState,
  PendingSearchIntent,
} from "./domain/searchTypes";

// ─── Constants ────────────────────────────────────────────────────────────────
export {
  BHK_VALUES,
  FURNISHING_VALUES,
  POSSESSION_VALUES,
  PARKING_VALUES,
  LISTER_ROLE_VALUES,
  PROPERTY_TYPE_VALUES,
  PET_POLICY_VALUES,
  KHATA_VALUES,
  RENT_SORT_KEYS,
  BUY_SORT_KEYS,
  MAX_SELECTED_LOCATIONS,
  DEFAULT_SORT,
  RESPONSE_RATE_MIN_HANDLED,
  VIEW_COUNT_MIN_DISPLAY,
  COMMENT_COUNT_MIN_DISPLAY,
  RATING_MIN_COUNT,
  PENDING_INTENT_EXPIRY_MS,
  URL_PARAMS,
} from "./domain/searchConstants";

// ─── Defaults ─────────────────────────────────────────────────────────────────
export {
  getDefaultRentFilters,
  getDefaultBuyFilters,
  getDefaultSearchContext,
  getDefaultSearchState,
} from "./domain/searchDefaults";

// ─── Currency ─────────────────────────────────────────────────────────────────
export { formatIndianRupee, formatPriceShort } from "./domain/formatCurrency";

// ─── URL state ────────────────────────────────────────────────────────────────
export { parseSearchUrl } from "./state/parseSearchUrl";
export { serializeSearchState } from "./state/serializeSearchState";
export {
  normalizeSearchState,
  changeSearchMode,
  clearIncompatibleFilters,
  hasValidSearchContext,
  buildReturnUrl,
} from "./state/searchStateUtils";

// ─── React hook ───────────────────────────────────────────────────────────────
export { useSearchState } from "./state/useSearchState";

// ─── Pending intent ───────────────────────────────────────────────────────────
export {
  writePendingIntent,
  readPendingIntent,
  clearPendingIntent,
  consumePendingIntent,
} from "./state/pendingSearchIntent";

// ─── Data contracts ───────────────────────────────────────────────────────────
export type {
  ExperienceFeedbackAggregate,
  ResolvedPrice,
  SearchPropertyResult,
  SearchPropertyRpcRow,
  ContextualSignalInputs,
} from "./data/searchResultContract";
export { mapRpcRowToResult } from "./data/searchResultContract";

export type {
  SearchPropertiesInput,
} from "./data/searchContracts";
export { SEARCH_PAGE_SIZE } from "./data/searchContracts";

// ─── Data client ─────────────────────────────────────────────────────────────
export type { SearchPropertiesResult } from "./data/searchDataClient";
export {
  searchProperties,
  overlayPropertyCounts,
  overlayFavourites,
  buildSearchCursor,
} from "./data/searchDataClient";

// ─── Search orchestration ─────────────────────────────────────────────────────
export type { UseSearchResultsReturn } from "./state/useSearchResults";
export { useSearchResults, mergeSearchPages } from "./state/useSearchResults";
export { buildSearchInput } from "./state/buildSearchInput";

// ─── Page shell ───────────────────────────────────────────────────────────────
export { default as SearchBrowsePage } from "./SearchBrowsePage";

// ─── Search setup panel ───────────────────────────────────────────────────────
export { SearchSetupPanel } from "./components/SearchSetupPanel";
export type { SearchSetupPanelProps } from "./components/SearchSetupPanel";
