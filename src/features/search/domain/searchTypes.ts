import type { SearchMode } from "./searchMode";
import type {
  BHK_VALUES,
  FURNISHING_VALUES,
  PARKING_VALUES,
  POSSESSION_VALUES,
  PET_POLICY_VALUES,
  KHATA_VALUES,
  RENT_SORT_KEYS,
  BUY_SORT_KEYS,
  SEARCH_VIEW_MODES,
} from "./searchConstants";

// ─── Enum value types (derived from const arrays) ─────────────────────────────

export type BhkValue = (typeof BHK_VALUES)[number];
export type FurnishingValue = (typeof FURNISHING_VALUES)[number];
export type ParkingValue = (typeof PARKING_VALUES)[number];
export type PossessionValue = (typeof POSSESSION_VALUES)[number];
export type PetPolicyValue = (typeof PET_POLICY_VALUES)[number];
export type KhataValue = (typeof KHATA_VALUES)[number];

// ─── Location ─────────────────────────────────────────────────────────────────

export type LocationTokenType =
  | "area"
  | "sublocality"
  | "neighbourhood"
  | "building"
  | "project"
  | "pincode"
  | "landmark";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapBounds {
  ne: LatLng;
  sw: LatLng;
}

/** Google viewport for an area, used for geographic Area filtering (p_area_boxes). */
export interface AreaViewport {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

export interface LocationToken {
  id: string;
  label: string;
  type: LocationTokenType;
  cityId: string | null;
  placeId: string | null;
  /** Google Place center captured at selection; null for older URLs. Used as the
   *  area anchor for Auto safety-net + explicit-distance circles (Prompt 3). */
  lat: number | null;
  lng: number | null;
  /** Area viewport bounds; null until hydrated (older URLs). Retained for
   *  area-autocomplete scoping (locationRestriction), NOT for match filtering. */
  viewport: AreaViewport | null;
}

/**
 * A selected City with its canonical Google Place identity + coordinates.
 * placeId drives canonical city-association membership (Auto); lat/lng anchor
 * explicit-distance circles when no area is selected. viewport scopes the
 * area autocomplete to this city. (Prompt 3 — canonical Search location.)
 */
export interface CityToken {
  placeId: string;
  label: string;
  lat: number;
  lng: number;
  viewport: AreaViewport | null;
}

// ─── Search context (setup fields — persisted in URL) ─────────────────────────

export interface SearchContext {
  mode: SearchMode | null;
  /**
   * Normalized lowercase city identifier (e.g. "bengaluru", "mumbai").
   * Plain string — no Place ID stored here. Google Place ID for the city
   * is deferred to Phase 4 (Search Setup).
   */
  city: string | null;
  /**
   * Selected cities as canonical Place anchors (Prompt 3). Source of truth for
   * city location filtering. `city` above is a derived lowercase label of the
   * first city, retained for display + legacy URL back-compat.
   */
  cities: CityToken[];
  locations: LocationToken[]; // max 5
  /**
   * Selected property types (multi-select). Empty array = all property types.
   * Normalized: valid-only, deduped, ordered by canonical PROPERTY_TYPE_VALUES order.
   */
  propertyTypes: string[];
}

// ─── Filters ──────────────────────────────────────────────────────────────────

export interface RentFilters {
  minPrice?: number;
  maxPrice?: number;
  bhk?: BhkValue[];
  furnishing?: FurnishingValue[];
  availableBy?: string;
  listedWithin?: number;
  availabilityConfirmedWithin?: number;
  maxBrokerage?: number;
  maxDeposit?: number;
  maxLockIn?: number;
  maxNotice?: number;
  maxAnnualIncrease?: number;
  maxMoveInCharges?: number;
  petPolicy?: PetPolicyValue[];
  zeroRentBrokerage?: boolean;
  parking4w?: ParkingValue[];
  parking2w?: ParkingValue[];
  amenities?: string[];
  hasVideoWalkthrough?: boolean;
  minResponseRate?: number;
  hasExperienceFeedback?: boolean;
}

export interface BuyFilters {
  minPrice?: number;
  maxPrice?: number;
  bhk?: BhkValue[];
  furnishing?: FurnishingValue[];
  minCarpetArea?: number;
  maxCarpetArea?: number;
  minSuperBuiltUp?: number;
  maxSuperBuiltUp?: number;
  possessionStatus?: PossessionValue[];
  possessionBefore?: string;
  negotiable?: boolean;
  maxBrokerage?: number;
  listedWithin?: number;
  reraDisclosed?: boolean;
  khataType?: KhataValue[];
  propertyTaxPaid?: boolean;
  parking4w?: ParkingValue[];
  parking2w?: ParkingValue[];
  amenities?: string[];
  hasVideoWalkthrough?: boolean;
  minResponseRate?: number;
  hasExperienceFeedback?: boolean;
}

// ─── Sort & view ──────────────────────────────────────────────────────────────

export type RentSortKey = (typeof RENT_SORT_KEYS)[number];
export type BuySortKey = (typeof BUY_SORT_KEYS)[number];
export type SearchSortKey = RentSortKey | BuySortKey;
export type SearchViewMode = (typeof SEARCH_VIEW_MODES)[number];

// ─── Cursor pagination ────────────────────────────────────────────────────────

export type SearchCursor =
  | {
      sort: "newest";
      listedAt: string | null;
      id: string;
    }
  | {
      sort: "availability_confirmed";
      availabilityConfirmedAt: string | null;
      listedAt: string | null;
      id: string;
    }
  | {
      sort: "price_asc" | "price_desc";
      priceAmount: number | null;
      listedAt: string | null;
      id: string;
    };

// ─── Full search state (URL-serializable) ─────────────────────────────────────

export interface SearchState {
  context: SearchContext;
  filters: RentFilters | BuyFilters;
  sort: SearchSortKey;
  view: SearchViewMode;
  cursor: SearchCursor | null;  // null = first page
  mapBounds: MapBounds | null;
  selectedPropertyId: string | null;
  /** Distance radius in km; null = Auto (association + safety-net). Prompt 3. */
  distanceKm: number | null;
}

// ─── Pending intent ───────────────────────────────────────────────────────────

export interface PendingSearchIntent {
  propertyId: string;
  action: "add";
  returnUrl: string;
  expiresAt: number;
}
