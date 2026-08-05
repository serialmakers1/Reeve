import type { SearchState, RentFilters, BuyFilters } from "../domain/searchTypes";
import type { SearchPropertiesInput } from "../data/searchContracts";
import { SEARCH_PAGE_SIZE } from "../data/searchContracts";

/**
 * Translates canonical SearchState into the typed RPC input object.
 * Returns null when the search context is not yet valid (no mode or no city).
 */
export function buildSearchInput(state: SearchState): SearchPropertiesInput | null {
  const { mode, city, locations, propertyTypes } = state.context;
  if (!mode) return null;

  const f = state.filters as RentFilters & BuyFilters;

  return {
    mode,
    city: city ?? null,
    // Legacy placeId list no longer used for Area matching — send empty.
    locationIds: [],
    // Geographic Area filter: one box per selected area viewport (OR semantics server-side).
    areaBoxes: locations
      .filter((l) => l.viewport)
      .map((l) => ({
        swLat: l.viewport!.sw.lat,
        swLng: l.viewport!.sw.lng,
        neLat: l.viewport!.ne.lat,
        neLng: l.viewport!.ne.lng,
      })),
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
    minResponseRate: f.minResponseRate ?? null,
    hasExperienceFeedback: f.hasExperienceFeedback ?? null,

    sort: state.sort,
    cursor: state.cursor,
    limit: SEARCH_PAGE_SIZE,
  };
}
