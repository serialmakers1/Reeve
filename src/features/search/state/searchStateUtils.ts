import type { SearchMode } from "../domain/searchMode";
import type { SearchState, SearchContext, RentFilters, BuyFilters, LocationToken, CityToken } from "../domain/searchTypes";
import { RENT_SORT_KEYS, MAX_SELECTED_LOCATIONS, DEFAULT_SORT } from "../domain/searchConstants";
import { getDefaultRentFilters, getDefaultBuyFilters } from "../domain/searchDefaults";

// ─── Area↔City ownership (single source of truth — Prompt 3A) ─────────────────
// Used by BOTH URL hydration (parseSearchUrl) and the setup panel's city-removal
// pruning, so case handling can never diverge.

/** True when a detail (locality/road) token belongs to the given selected root
 *  City — canonical ownership by the root's geo_place UUID (Phase 4 · Prompt 3). */
export function areaBelongsToCity(location: LocationToken, city: CityToken): boolean {
  return !!location.scopeRootId && location.scopeRootId === city.geoPlaceId;
}

/** True when the selection carries at least one locality detail — the sole
 *  eligibility for an explicit distance radius. */
export function hasLocalityAnchor(cities: CityToken[], locations: LocationToken[]): boolean {
  void cities; // only details can be localities
  return locations.some((l) => l.kind === "locality");
}

/** Coerce distance to Auto (null) unless a selected locality anchors it. */
export function resetDistanceIfNoLocality(state: SearchState): SearchState {
  if (state.distanceKm === null) return state;
  return hasLocalityAnchor(state.context.cities, state.context.locations)
    ? state
    : { ...state, distanceKm: null };
}

/**
 * Enforces the locked frontend invariant: every Area/Road must belong to a
 * currently selected canonical City. With NO city selected there are NO area
 * filters (area-only Search state is not permitted on the frontend, even though
 * the backend could technically anchor on it). With ≥1 city, keep only areas
 * owned by one of those cities (orphans whose parent city is gone are dropped).
 */
export function pruneOrphanAreas(cities: CityToken[], locations: LocationToken[]): LocationToken[] {
  if (cities.length === 0) return [];
  return locations.filter((l) => cities.some((c) => areaBelongsToCity(l, c)));
}

/** Remove only the areas owned by `removedCity`; keep every other city's areas. */
export function pruneAreasForRemovedCity(
  removedCity: CityToken,
  locations: LocationToken[],
): LocationToken[] {
  return locations.filter((l) => !areaBelongsToCity(l, removedCity));
}

/** User-visible multi-city label: "Bengaluru" / "Bengaluru +1" / "Bengaluru +2". */
export function formatCitiesLabel(cities: CityToken[]): string | null {
  if (cities.length === 0) return null;
  const first = cities[0].label;
  return cities.length > 1 ? `${first} +${cities.length - 1}` : first;
}

// ─── normalizeSearchState ────────────────────────────────────────────────────

/**
 * Returns a new state with:
 * - page clamped to ≥ 1
 * - locations deduplicated by id and trimmed to MAX_SELECTED_LOCATIONS
 * - locations with cityId not matching context.city removed (when city is set)
 * - minPrice / maxPrice swapped if min > max
 */
export function normalizeSearchState(state: SearchState): SearchState {
  const filters = state.filters as RentFilters & BuyFilters;

  // Swap reversed price
  let minPrice = filters.minPrice;
  let maxPrice = filters.maxPrice;
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  // Deduplicate (by canonical UUID id) + trim locations
  const seen = new Set<string>();
  let locations = state.context.locations
    .filter((l) => {
      if (seen.has(l.id)) return false;
      seen.add(l.id);
      return true;
    })
    .slice(0, MAX_SELECTED_LOCATIONS);

  // Canonical ownership: every detail must belong to a selected root City.
  locations = pruneOrphanAreas(state.context.cities, locations);

  const normalizedFilters = { ...filters, minPrice, maxPrice };
  // Remove undefined price keys to keep output clean
  if (minPrice === undefined) delete normalizedFilters.minPrice;
  if (maxPrice === undefined) delete normalizedFilters.maxPrice;

  // availability_confirmed sort is rent-only; clear cursor if mode is buy
  let normalizedCursor = state.cursor;
  if (state.context.mode === "buy" && normalizedCursor?.sort === "availability_confirmed") {
    normalizedCursor = null;
  }

  return {
    ...state,
    context: { ...state.context, locations },
    filters: normalizedFilters,
    cursor: normalizedCursor,
  };
}

// ─── changeSearchMode ────────────────────────────────────────────────────────

/**
 * Switches the mode while preserving compatible state.
 * Drops filters that only apply to the old mode.
 * Resets sort if the current sort is incompatible with nextMode.
 */
export function changeSearchMode(
  state: SearchState,
  nextMode: SearchMode,
): SearchState {
  const f = state.filters as RentFilters & BuyFilters;

  // Shared fields preserved across modes.
  // Budget (minPrice/maxPrice) intentionally excluded — ₹50k rent ≠ ₹50k sale price.
  // listedWithin is mode-agnostic (user's freshness preference) so it is preserved.
  const sharedFilters = {
    bhk: f.bhk,
    furnishing: f.furnishing,
    parking4w: f.parking4w,
    parking2w: f.parking2w,
    amenities: f.amenities,
    hasVideoWalkthrough: f.hasVideoWalkthrough,
    minResponseRate: f.minResponseRate,
    hasExperienceFeedback: f.hasExperienceFeedback,
    listedWithin: f.listedWithin,
  };

  // Remove undefined keys
  const cleanShared = Object.fromEntries(
    Object.entries(sharedFilters).filter(([, v]) => v !== undefined),
  );

  let nextFilters: RentFilters | BuyFilters;
  if (nextMode === "buy") {
    nextFilters = { ...getDefaultBuyFilters(), ...cleanShared };
  } else {
    nextFilters = { ...getDefaultRentFilters(), ...cleanShared };
  }

  // Reset sort if incompatible with next mode
  const validSortKeys: readonly string[] =
    nextMode === "buy"
      ? ["newest", "price_asc", "price_desc"]
      : RENT_SORT_KEYS;
  const nextSort = validSortKeys.includes(state.sort)
    ? state.sort
    : DEFAULT_SORT;

  return {
    ...state,
    context: { ...state.context, mode: nextMode },
    filters: nextFilters,
    sort: nextSort,
    cursor: null,
  };
}

// ─── clearIncompatibleFilters ────────────────────────────────────────────────

// Fields that only exist in rent mode (must not appear on buy states)
const RENT_ONLY_KEYS: Array<keyof RentFilters> = [
  "availableBy",
  "availabilityConfirmedWithin",
  "maxDeposit",
  "maxLockIn",
  "maxNotice",
  "maxAnnualIncrease",
  "maxMoveInCharges",
  "petPolicy",
];

// Fields that only exist in buy mode (must not appear on rent states)
const BUY_ONLY_KEYS: Array<keyof BuyFilters> = [
  "minCarpetArea",
  "maxCarpetArea",
  "minSuperBuiltUp",
  "maxSuperBuiltUp",
  "possessionStatus",
  "possessionBefore",
  "negotiable",
  "reraDisclosed",
  "khataType",
  "propertyTaxPaid",
];

/**
 * Strips filters that belong to the OTHER mode, preserving all fields
 * valid for the current mode. Does not reset page or sort.
 */
export function clearIncompatibleFilters(state: SearchState): SearchState {
  if (state.context.mode === null) return state;
  const filters = { ...state.filters } as Record<string, unknown>;
  const keysToRemove =
    state.context.mode === "buy"
      ? (RENT_ONLY_KEYS as string[])
      : (BUY_ONLY_KEYS as string[]);
  for (const key of keysToRemove) delete filters[key];
  return { ...state, filters };
}

// ─── hasValidSearchContext ────────────────────────────────────────────────────

/**
 * Returns true when mode (rent/buy) is chosen. City is optional — a mode alone
 * loads default/nationwide results; city only narrows them.
 */
export function hasValidSearchContext(state: SearchState): boolean {
  return state.context.mode !== null;
}

// ─── buildReturnUrl ───────────────────────────────────────────────────────────

/**
 * Combines pathname + search into a return URL string.
 * Throws if pathname is external (starts with "http", "//", or not "/").
 */
export function buildReturnUrl(pathname: string, search: string): string {
  if (
    pathname.startsWith("http") ||
    pathname.startsWith("//") ||
    !pathname.startsWith("/")
  ) {
    throw new Error("Invalid return path: must be a relative URL starting with /");
  }
  return pathname + search;
}
