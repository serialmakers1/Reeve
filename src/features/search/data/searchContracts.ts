import type { SearchMode } from "@/features/search/domain/searchMode";
import type {
  SearchSortKey,
  SearchCursor,
} from "@/features/search/domain/searchTypes";

/** Maximum number of results per page from the compact search RPC. */
export const SEARCH_PAGE_SIZE = 20;

/**
 * Logical input to the compact property search (LIST-only).
 * Constructed by the frontend from SearchState before calling `search_compact_properties_v3`.
 *
 * Filter semantics:
 * - geoPlaceIds: canonical membership (OR within group)
 * - bhk / furnishing / possessionStatus / petPolicy / khataType: OR within each array
 * - amenities: AND (must have all)
 * - All arrays are deduplicated and valid-value-filtered before being sent
 */
export interface SearchPropertiesInput {
  mode: SearchMode;
  /** Reeve canonical geo_place UUIDs (roots + details); [] = nationwide (Phase 4 · Prompt 3). */
  geoPlaceIds: string[];
  distanceKm: number | null;         // explicit radius (locality anchor only); null = Auto (canonical membership)
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
