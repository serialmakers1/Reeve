import type { SearchMode } from "@/features/search/domain/searchMode";

// Resolved from get_user_rating_summary when status === "active"
export interface ExperienceFeedbackAggregate {
  totalRatings: number;
  dealAgainPct: number;   // 0–100, maps to as_owner.deal_again_pct
  reviewCount: number;    // count of written experience reviews
}

// Resolved pricing — discriminated union computed by the mapper from price_kind + price_amount.
// Guard: listed_rent = 0 on a rent listing → price = null.
export type ResolvedPrice =
  | { kind: "rent_total";   amount: number; currency: "INR" }
  | { kind: "rent_monthly"; amount: number; currency: "INR" }
  | { kind: "sale";         amount: number; currency: "INR" };

export interface SearchPropertyResult {
  // ── Identification ─────────────────────────────────────────────────────────
  id: string;
  detailUrl: string;              // `/property/${id}` — constructed by the data layer
  listingMode: SearchMode;        // "rent" | "buy" — never "sale"
  propertyType: string | null;

  // ── BHK ────────────────────────────────────────────────────────────────────
  bhk: string | null;

  // ── Image ──────────────────────────────────────────────────────────────────
  primaryImageUrl: string | null;
  photoCount: number;             // 0 when no images — never null

  // ── Price ──────────────────────────────────────────────────────────────────
  price: ResolvedPrice | null;    // null when neither rent nor sale price is available

  // ── Location ───────────────────────────────────────────────────────────────
  buildingName: string;
  locality: string | null;
  city: string | null;
  locationMode: "exact" | "approximate" | null;
  latitude: number | null;
  longitude: number | null;

  // ── Comparison facts ───────────────────────────────────────────────────────
  carpetAreaSqft: number | null;        // aliases square_footage
  superBuiltUpSqft: number | null;      // aliases super_built_up_area
  furnishing: string | null;
  bathrooms: number | null;
  floorNumber: number | null;
  totalFloors: number | null;
  parking4w: string | null;
  parking2w: string | null;
  parking4wCount: number | null;
  parking2wCount: number | null;
  buildingAgeYears: number | null;

  // ── Possession (Buy) ───────────────────────────────────────────────────────
  possessionStatus: string | null;
  possessionDate: string | null;

  // ── Lister activity ────────────────────────────────────────────────────────
  listerRole: string;                   // "owner" | "broker" | "property_manager" | "builder"
  responseHandledCount: number;         // all_time_handled
  responseRatePct: number | null;       // null below threshold; 0–100 when eligible
  isNewOnReeve: boolean;                // responseHandledCount < RESPONSE_RATE_MIN_HANDLED

  // ── Public activity ────────────────────────────────────────────────────────
  viewCount: number;                    // 0 when none — never null
  commentCount: number;                 // 0 when none — never null
  experienceFeedback: ExperienceFeedbackAggregate | null;  // null when < RATING_MIN_COUNT

  // ── Freshness ──────────────────────────────────────────────────────────────
  listedAt: string | null;
  availabilityConfirmedAt: string | null;  // null until Phase 3A adds column

  // ── User-specific state ────────────────────────────────────────────────────
  isFavourited: boolean;                // false for anon

  // ── Contextual signal inputs ───────────────────────────────────────────────
  rentBrokerageType: string | null;
  rentBrokerageFixed: number | null;
  rentBrokerageMonths: number | null;
  saleBrokeragePct: number | null;
  securityDepositAmount: number | null;
  lockInMonths: number | null;
  noticePeriodDays: number | null;
  petPolicy: string | null;
  hasVideoWalkthrough: boolean;
  priceNegotiable: boolean | null;
  youtubeWalkthroughUrl: string | null;
}

/**
 * Raw row returned by the Phase 3 compact search RPC.
 * NOT the public result type — mapped to SearchPropertyResult by mapRpcRowToResult().
 *
 * Derivations performed by the mapper (not present in this row):
 * - isFavourited: frontend overlay via useFavourites
 * - detailUrl: constructed as `/property/${property_id}`
 * - isNewOnReeve: response_handled_count < RESPONSE_RATE_MIN_HANDLED
 * - viewCount / commentCount: from get_property_counts batch RPC
 * owner_id is internal and excluded from SearchPropertyResult.
 */
export interface SearchPropertyRpcRow {
  // Identity
  property_id: string;
  listing_type: "rent" | "sale";
  property_type: string | null;
  bhk: string | null;
  owner_id: string;              // internal — excluded from SearchPropertyResult

  // Image (inline subquery, is_floor_plan = false)
  primary_image_url: string | null;
  photo_count: number;

  // Price (CASE expressions — mapper resolves to ResolvedPrice)
  // CASE WHEN listed_rent > 0 THEN 'rent_total'/'rent_monthly' ELSE 'sale' END
  // Guard: listed_rent = 0 on rent listing → price_kind = null → price = null
  price_kind: "rent_total" | "rent_monthly" | "sale" | null;
  price_amount: number | null;   // doubles as cursor field for price sorts

  // Location
  // location_mode: CASE WHEN address_mode='google_place' THEN 'exact'
  //                     WHEN address_mode='manual' THEN 'approximate' ELSE NULL END
  building_name: string;
  locality: string | null;
  city: string | null;
  location_mode: "exact" | "approximate" | null;
  latitude: number | null;
  longitude: number | null;

  // Area
  carpet_area_sqft: number | null;       // aliases square_footage
  super_built_up_sqft: number | null;    // aliases super_built_up_area

  // Comparison facts
  furnishing: string | null;
  bathrooms: number | null;
  floor_number: number | null;
  total_floors: number | null;
  parking_4w: string | null;
  parking_2w: string | null;
  parking_4w_count: number | null;
  parking_2w_count: number | null;
  building_age_years: number | null;

  // Possession (Buy)
  possession_status: string | null;
  possession_date: string | null;

  // Lister activity (inline correlated subqueries into contact_requests)
  lister_role: string;
  response_handled_count: number;
  response_rate_pct: number | null;

  // Experience feedback (inline lateral subquery — Option A: inline)
  experience_feedback: ExperienceFeedbackAggregate | null;

  // Freshness
  listed_at: string | null;
  availability_confirmed_at: string | null;  // Phase 3A — null until column added

  // Contextual signal inputs (raw DB values — frontend resolver runs on these)
  rent_brokerage_type: string | null;
  rent_brokerage_fixed_amount: number | null;
  rent_brokerage_months: number | null;
  sale_brokerage_pct: number | null;
  security_deposit_amount: number | null;
  lock_in_months: number | null;
  notice_period_days: number | null;
  pet_policy: string | null;
  youtube_walkthrough_url: string | null;
  price_negotiable: boolean | null;
}

const RESPONSE_RATE_MIN_HANDLED = 5;

/**
 * Maps a raw SearchPropertyRpcRow to SearchPropertyResult.
 * Called after:
 *   1. The search RPC returns rows
 *   2. get_property_counts supplies view_count and comment_count
 *   3. useFavourites supplies the user's favourite set
 */
export function mapRpcRowToResult(
  row: SearchPropertyRpcRow,
  viewCount: number,
  commentCount: number,
  isFavourited: boolean,
): SearchPropertyResult {
  let listingMode: SearchMode;
  if (row.listing_type === "rent") {
    listingMode = "rent";
  } else if (row.listing_type === "sale") {
    listingMode = "buy";
  } else {
    console.warn(`mapRpcRowToResult: unexpected listing_type "${row.listing_type}", defaulting to rent`);
    listingMode = "rent";
  }

  let price: ResolvedPrice | null = null;
  if (row.price_kind != null && row.price_amount != null) {
    price = { kind: row.price_kind, amount: Number(row.price_amount), currency: "INR" };
  }

  return {
    id: row.property_id,
    detailUrl: `/property/${row.property_id}`,
    listingMode,
    propertyType: row.property_type,
    bhk: row.bhk,
    primaryImageUrl: row.primary_image_url,
    photoCount: row.photo_count,
    price,
    buildingName: row.building_name,
    locality: row.locality,
    city: row.city,
    locationMode: row.location_mode,
    latitude: row.latitude,
    longitude: row.longitude,
    carpetAreaSqft: row.carpet_area_sqft,
    superBuiltUpSqft: row.super_built_up_sqft,
    furnishing: row.furnishing,
    bathrooms: row.bathrooms,
    floorNumber: row.floor_number,
    totalFloors: row.total_floors,
    parking4w: row.parking_4w,
    parking2w: row.parking_2w,
    parking4wCount: row.parking_4w_count,
    parking2wCount: row.parking_2w_count,
    buildingAgeYears: row.building_age_years,
    possessionStatus: row.possession_status,
    possessionDate: row.possession_date,
    listerRole: row.lister_role,
    responseHandledCount: row.response_handled_count,
    responseRatePct: row.response_rate_pct,
    isNewOnReeve: row.response_handled_count < RESPONSE_RATE_MIN_HANDLED,
    viewCount,
    commentCount,
    experienceFeedback: row.experience_feedback,
    listedAt: row.listed_at,
    availabilityConfirmedAt: row.availability_confirmed_at,
    isFavourited,
    rentBrokerageType: row.rent_brokerage_type,
    rentBrokerageFixed: row.rent_brokerage_fixed_amount,
    rentBrokerageMonths: row.rent_brokerage_months,
    saleBrokeragePct: row.sale_brokerage_pct,
    securityDepositAmount: row.security_deposit_amount,
    lockInMonths: row.lock_in_months,
    noticePeriodDays: row.notice_period_days,
    petPolicy: row.pet_policy,
    hasVideoWalkthrough: !!row.youtube_walkthrough_url,
    priceNegotiable: row.price_negotiable,
    youtubeWalkthroughUrl: row.youtube_walkthrough_url,
  };
}

// Subset used by the contextual signal resolver (later prompt)
export type ContextualSignalInputs = Pick<
  SearchPropertyResult,
  | "rentBrokerageType"
  | "rentBrokerageFixed"
  | "rentBrokerageMonths"
  | "saleBrokeragePct"
  | "securityDepositAmount"
  | "lockInMonths"
  | "noticePeriodDays"
  | "petPolicy"
  | "hasVideoWalkthrough"
  | "priceNegotiable"
  | "commentCount"
  | "experienceFeedback"
>;
