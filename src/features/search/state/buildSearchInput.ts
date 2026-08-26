import type { SearchState, RentFilters, BuyFilters } from "../domain/searchTypes";
import type { SearchPropertiesInput } from "../data/searchContracts";
import { SEARCH_PAGE_SIZE } from "../data/searchContracts";

/**
 * Translates canonical SearchState into the typed RPC input object.
 * Returns null when the search context is not yet valid (no mode or no city).
 */
export function buildSearchInput(state: SearchState): SearchPropertiesInput | null {
  const { mode, cities, locations, propertyTypes } = state.context;
  if (!mode) return null;

  const f = state.filters as RentFilters & BuyFilters;

  // Canonical geo identity: roots (cities) + details (localities/roads), deduped
  // Reeve geo_place UUIDs. Empty ⇒ nationwide. No Google Place IDs, no coordinates.
  const geoPlaceIds = [
    ...(cities ?? []).map((c) => c.geoPlaceId),
    ...(locations ?? []).map((l) => l.geoPlaceId),
  ].filter((id): id is string => typeof id === "string" && id.length > 0);
  const dedupedGeoPlaceIds = [...new Set(geoPlaceIds)];

  // Explicit distance is only meaningful with a locality anchor; otherwise Auto.
  const hasLocality = (locations ?? []).some((l) => l.kind === "locality");
  const distanceKm = hasLocality ? (state.distanceKm ?? null) : null;

  return {
    mode,
    geoPlaceIds: dedupedGeoPlaceIds,
    distanceKm,
    propertyTypes: propertyTypes ?? [],

    minPrice: f.minPrice ?? null,
    maxPrice: f.maxPrice ?? null,

    bhk: f.bhk ?? [],
    furnishing: f.furnishing ?? [],

    // Rent-only
    availableBy: (f as RentFilters).availableBy ?? null,
    listedWithin: f.listedWithin ?? null,
    availabilityConfirmedWithin: (f as RentFilters).availabilityConfirmedWithin ?? null,
    maxDeposit: (f as RentFilters).maxDeposit ?? null,
    maxLockIn: (f as RentFilters).maxLockIn ?? null,
    maxNotice: (f as RentFilters).maxNotice ?? null,
    maxAnnualIncrease: (f as RentFilters).maxAnnualIncrease ?? null,
    maxMoveInCharges: (f as RentFilters).maxMoveInCharges ?? null,
    petPolicy: (f as RentFilters).petPolicy ?? [],
    maxBrokerage: f.maxBrokerage ?? null,
    rentBrokerageMaxFixed: (f as RentFilters).maxBrokerage ?? null,
    rentBrokerageMaxMonths: null,
    zeroRentBrokerage: (f as RentFilters).zeroRentBrokerage ?? null,

    // Buy-only
    possessionStatus: (f as BuyFilters).possessionStatus ?? [],
    possessionBefore: (f as BuyFilters).possessionBefore ?? null,
    negotiable: (f as BuyFilters).negotiable ?? null,
    buyBrokerageMaxPct: (f as BuyFilters).maxBrokerage ?? null,
    reraDisclosed: (f as BuyFilters).reraDisclosed ?? null,
    khataType: (f as BuyFilters).khataType ?? [],
    propertyTaxPaid: (f as BuyFilters).propertyTaxPaid ?? null,
    minCarpetArea: (f as BuyFilters).minCarpetArea ?? null,
    maxCarpetArea: (f as BuyFilters).maxCarpetArea ?? null,
    minSuperBuiltUp: (f as BuyFilters).minSuperBuiltUp ?? null,
    maxSuperBuiltUp: (f as BuyFilters).maxSuperBuiltUp ?? null,

    // Shared
    parking4w: f.parking4w ?? [],
    parking2w: f.parking2w ?? [],
    amenities: f.amenities ?? [],
    hasVideoWalkthrough: f.hasVideoWalkthrough ?? null,

    sort: state.sort,
    cursor: state.cursor,
    limit: SEARCH_PAGE_SIZE,
  };
}
