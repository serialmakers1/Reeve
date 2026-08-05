import type { SearchMode } from "@/features/search/domain/searchMode";
import type {
  SearchSortKey,
  MapBounds,
  SearchCursor,
} from "@/features/search/domain/searchTypes";

/** Maximum number of results per page from the compact search RPC. */
export const SEARCH_PAGE_SIZE = 20;

/** Maximum number of map markers returned per viewport query. */
export const MAP_MARKERS_LIMIT = 200;

/**
 * Logical input to the compact property search.
 * Constructed by the frontend from SearchState before calling the RPC.
 *
 * Filter semantics:
 * - locationIds: OR within city
 * - bhk / furnishing / possessionStatus / petPolicy / khataType: OR within each array
 * - amenities: AND (must have all)
 * - All arrays are deduplicated and valid-value-filtered before being sent
 */
export interface SearchPropertiesInput {
  mode: SearchMode;
  city: string | null;               // normalized lowercase city identifier; null = no city filter (nationwide)
  locationIds: string[];             // legacy placeId list (kept for RPC compat; sent as [])
  areaBoxes: { swLat: number; swLng: number; neLat: number; neLng: number }[]; // geographic Area filter (OR)
  propertyTypes: string[]; // multi-select; sent to the RPC as a deterministic CSV string ('' filter cleared)

  // Price
  minPrice: number | null;
  maxPrice: number | null;

  // Frequent refinements
  bhk: string[];
  furnishing: string[];
  possessionStatus: string[];        // OR within; Buy only

  // Secondary filters — Rent
  availableBy: string | null;        // ISO date; Rent only
  listedWithin: number | null;       // days; shared
  availabilityConfirmedWithin: number | null;  // days; Rent only — Phase 3A
  maxDeposit: number | null;         // Rent only
  maxLockIn: number | null;          // months; Rent only
  maxNotice: number | null;          // days; Rent only
  maxAnnualIncrease: number | null;  // percent; Rent only
  maxMoveInCharges: number | null;   // Rent only
  petPolicy: string[];               // OR within; Rent only
  maxBrokerage: number | null;       // Rent: fixed ₹ amount
  rentBrokerageMaxFixed: number | null;   // Rent only; ₹
  rentBrokerageMaxMonths: number | null;  // Rent only; months
  zeroRentBrokerage: boolean | null;

  // Secondary filters — Buy
  minCarpetArea: number | null;
  maxCarpetArea: number | null;
  minSuperBuiltUp: number | null;
  maxSuperBuiltUp: number | null;
  possessionBefore: string | null;   // ISO date; Buy only
  negotiable: boolean | null;
  buyBrokerageMaxPct: number | null; // Buy only; percent
  reraDisclosed: boolean | null;
  khataType: string[];               // OR within; Buy only
  propertyTaxPaid: boolean | null;

  // Shared secondary filters
  parking4w: string[];
  parking2w: string[];
  amenities: string[];               // AND semantics
  hasVideoWalkthrough: boolean | null;
  minResponseRate: number | null;
  hasExperienceFeedback: boolean | null;

  // Pagination
  sort: SearchSortKey;
  cursor: SearchCursor | null;       // null = first page
  limit: number;                     // max SEARCH_PAGE_SIZE
}

/**
 * Logical input to the Map markers query.
 * Returns a minimal payload for rendering markers within a viewport.
 */
export interface SearchMapMarkersInput {
  mode: SearchMode;
  city: string;
  bounds: MapBounds;                 // required — no bounds = no map query

  // Active filters (same semantics as SearchPropertiesInput)
  minPrice: number | null;
  maxPrice: number | null;
  bhk: string[];
  furnishing: string[];
  possessionStatus: string[];
  amenities: string[];
  hasVideoWalkthrough: boolean | null;
  petPolicy: string[];
  parking4w: string[];
  parking2w: string[];
  minResponseRate: number | null;
  hasExperienceFeedback: boolean | null;
  listedWithin: number | null;

  limit: number;                     // max MAP_MARKERS_LIMIT
}
