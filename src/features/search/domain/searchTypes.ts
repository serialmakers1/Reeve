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
} from "./searchConstants";

// ─── Enum value types (derived from const arrays) ─────────────────────────────

export type BhkValue = (typeof BHK_VALUES)[number];
export type FurnishingValue = (typeof FURNISHING_VALUES)[number];
export type ParkingValue = (typeof PARKING_VALUES)[number];
export type PossessionValue = (typeof POSSESSION_VALUES)[number];
export type PetPolicyValue = (typeof PET_POLICY_VALUES)[number];
export type KhataValue = (typeof KHATA_VALUES)[number];

// ─── Location ─────────────────────────────────────────────────────────────────

/** The four FINAL Reeve canonical geography kinds surfaced to Search (Phase 4). */
export type SearchGeoKind = "search_region" | "settlement" | "locality" | "road";

/**
 * A selected DETAIL location (locality or road) identified by its Reeve canonical
 * `geo_place` UUID — never a Google Place ID.
 *
 * `id` is a deterministic alias of `geoPlaceId` (kept so the many id-keyed dedupe /
 * React-key / removal call-sites keep working); both always equal the canonical UUID.
 * `scopeRootId` is the owning root City's `geoPlaceId`.
 */
export interface LocationToken {
  /** Deterministic alias of `geoPlaceId` — the canonical UUID. */
  id: string;
  /** Reeve canonical geo_place UUID (detail). */
  geoPlaceId: string;
  kind: "locality" | "road";
  /** Owning root City's geoPlaceId. */
  scopeRootId: string;
  label: string;
  parentLabel?: string | null;
  searchRegionLabel?: string | null;
}

/**
 * A selected root City identified by its Reeve canonical `geo_place` UUID — a
 * `search_region` or `settlement`. `geoPlaceId` drives canonical membership.
 */
export interface CityToken {
  /** Reeve canonical geo_place UUID (root). */
  geoPlaceId: string;
  kind: "search_region" | "settlement";
  label: string;
  settlementSubtype?: "city" | "town" | "village" | null;
  searchRegionId?: string | null;
  searchRegionLabel?: string | null;
}

// ─── Search context (setup fields — persisted in URL) ─────────────────────────

export interface SearchContext {
  mode: SearchMode | null;
  /**
   * Normalized lowercase label of the first selected city. RETAINED (not map-only):
   * it is the SEO/H1 heading source (`formatSearchHeading`), the toolbar context
   * fallback, and the per-city key for confirmed-search memory + the IP-notice copy.
   */
  city: string | null;
  /** Selected root cities (canonical geo_place UUIDs) — source of truth for city filtering. */
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
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

export type RentSortKey = (typeof RENT_SORT_KEYS)[number];
export type BuySortKey = (typeof BUY_SORT_KEYS)[number];
export type SearchSortKey = RentSortKey | BuySortKey;

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
  cursor: SearchCursor | null;  // null = first page
  /** Return-scroll / card-highlight target (login-return, detail-return). LIST-only. */
  selectedPropertyId: string | null;
  /** Distance radius in km; null = Auto (canonical FINAL membership). Locality-only. */
  distanceKm: number | null;
}

// ─── Pending intent ───────────────────────────────────────────────────────────

export interface PendingSearchIntent {
  propertyId: string;
  action: "add";
  returnUrl: string;
  expiresAt: number;
}
