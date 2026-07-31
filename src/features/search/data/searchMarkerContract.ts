import type { SearchMode } from "@/features/search/domain/searchMode";
import type { MapBounds } from "@/features/search/domain/searchTypes";

export type LocationPrecision = "exact" | "approximate";

// Numeric price for map markers — formatted by the frontend (formatPriceShort).
// Separate from ResolvedPrice: marker concerns are independent of the result contract.
export type ResolvedMarkerPrice =
  | { kind: "rent_total";   amount: number; currency: "INR" }
  | { kind: "rent_monthly"; amount: number; currency: "INR" }
  | { kind: "sale";         amount: number; currency: "INR" };

/**
 * V1: Supabase returns individual property markers only (propertyCount = 1 always).
 * Visual clustering is handled by @googlemaps/markerclusterer on the frontend.
 * Server-side building groups are not implemented in V1.
 *
 * markerId = property UUID (same as singlePropertyId)
 * previewId = markerId (always in V1)
 */
export interface SearchMapMarker {
  // ── Identity ───────────────────────────────────────────────────────────────
  markerId: string;                   // property UUID (V1: always a single property)

  // ── Coordinates ────────────────────────────────────────────────────────────
  latitude: number;
  longitude: number;
  precision: LocationPrecision;       // drives marker style: solid vs dashed border

  // ── Price ──────────────────────────────────────────────────────────────────
  price: ResolvedMarkerPrice;         // numeric — formatted by frontend
  listingMode: SearchMode;            // "rent" | "buy"

  // ── Grouping (V1: always single) ───────────────────────────────────────────
  propertyCount: number;              // always 1 in V1
  singlePropertyId: string | null;    // = markerId in V1

  // ── Preview reference ──────────────────────────────────────────────────────
  previewId: string;                  // = markerId in V1
  buildingName: string | null;
  locality: string | null;
}

export type MarkerTapResult =
  | { type: "single"; propertyId: string }
  | { type: "group"; markerIds: string[]; buildingName: string | null };

/**
 * Minimal payload returned by the get_map_markers RPC (Phase 9).
 * Mapped to SearchMapMarker by mapRpcRowToMarker.
 */
export interface SearchMapMarkerRpcRow {
  property_id: string;
  latitude: number;
  longitude: number;
  location_mode: "exact" | "approximate" | null;
  price_kind: "rent_total" | "rent_monthly" | "sale" | null;
  price_amount: number | null;
  listing_type: "rent" | "sale";
  building_name: string | null;
  match_count: number;   // V1 = 1; kept for forward-compat
}

export interface MapMarkersInput {
  // ── Core (required) ────────────────────────────────────────────────────────
  listingType: "rent" | "sale";
  city: string;
  bounds: MapBounds;
  limit?: number;

  // ── Shared membership filters ───────────────────────────────────────────────
  locationIds?: string[]; // legacy placeId list (kept for RPC compat; sent as [])
  areaBoxes?: { swLat: number; swLng: number; neLat: number; neLng: number }[]; // geographic Area filter (OR)
  propertyType?: string | null;
  bhk?: string[];
  furnishing?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  parking4w?: string[];
  parking2w?: string[];
  amenities?: string[];
  hasVideoWalkthrough?: boolean | null;
  minResponseRate?: number | null;
  hasExperienceFeedback?: boolean | null;

  // ── Rent-only ───────────────────────────────────────────────────────────────
  availableBy?: string | null;                      // YYYY-MM-DD
  listedWithinDays?: number | null;
  availabilityConfirmedWithinDays?: number | null;
  maxDeposit?: number | null;
  maxLockInMonths?: number | null;
  maxNoticeDays?: number | null;
  maxAnnualIncrease?: number | null;
  maxMoveInCharges?: number | null;
  petPolicy?: string[];
  zeroRentBrokerage?: boolean | null;
  maxRentBrokerageFixed?: number | null;

  // ── Buy-only ────────────────────────────────────────────────────────────────
  possessionStatus?: string[];
  possessionBefore?: string | null;                 // YYYY-MM-DD
  negotiable?: boolean | null;
  minCarpetArea?: number | null;
  maxCarpetArea?: number | null;
  minSuperBuiltUp?: number | null;
  maxSuperBuiltUp?: number | null;
  maxSaleBrokeragePct?: number | null;
  reraDisclosed?: boolean | null;
  khataType?: string[];
  propertyTaxPaid?: boolean | null;
}

export function mapRpcRowToMarker(row: SearchMapMarkerRpcRow): SearchMapMarker {
  const price: ResolvedMarkerPrice | null =
    row.price_kind != null && row.price_amount != null
      ? { kind: row.price_kind, amount: Number(row.price_amount), currency: "INR" }
      : null;

  const precision: LocationPrecision = row.location_mode === "exact" ? "exact" : "approximate";

  return {
    markerId: row.property_id,
    latitude: row.latitude,
    longitude: row.longitude,
    precision,
    price: price as ResolvedMarkerPrice,
    listingMode: row.listing_type === "sale" ? "buy" : "rent",
    propertyCount: row.match_count,
    singlePropertyId: row.property_id,
    previewId: row.property_id,
    buildingName: row.building_name ?? null,
    locality: null,
  };
}
