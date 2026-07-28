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

export interface LocationToken {
  id: string;
  label: string;
  type: LocationTokenType;
  cityId: string | null;
  placeId: string | null;
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
  locations: LocationToken[]; // max 5
  propertyType: string | null;
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
}

// ─── Pending intent ───────────────────────────────────────────────────────────

export interface PendingSearchIntent {
  propertyId: string;
  action: "add";
  returnUrl: string;
  expiresAt: number;
}
