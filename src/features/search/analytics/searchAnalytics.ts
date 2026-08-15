import type { SearchState, RentFilters, BuyFilters } from "@/features/search/domain/searchTypes";
import type { SearchMode } from "@/features/search/domain/searchMode";

// ─── Event name constants ─────────────────────────────────────────────────────

export const SEARCH_EVENTS = {
  CONTEXT_SUBMITTED: "search_context_submitted",
  RESULTS_LOADED: "search_results_loaded",
  LISTING_OPENED: "listing_opened",
  FAVOURITE_COMPLETED: "favourite_completed",
  CONTACT_REQUESTED: "contact_requested",
  NO_RESULTS_VIEWED: "no_results_viewed",
} as const;

// ─── Search session — sessionStorage, survives filter/sort/view/nav/login ─────

const SESSION_KEY = "reeve_search_session_id";

export function getSearchSessionId(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function newSearchSessionId(): string {
  const id = crypto.randomUUID();
  try {
    sessionStorage.setItem(SESSION_KEY, id);
  } catch { /* storage unavailable */ }
  return id;
}

export function getOrCreateSearchSessionId(): string {
  return getSearchSessionId() ?? newSearchSessionId();
}

// ─── Device class ─────────────────────────────────────────────────────────────

export function getDeviceClass(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "mobile";
  if (window.matchMedia("(min-width: 1200px)").matches) return "desktop";
  if (window.matchMedia("(min-width: 768px)").matches) return "tablet";
  return "mobile";
}

// ─── Result count bucket ──────────────────────────────────────────────────────
// Uses loaded-result count — no RPC total available

export function bucketResultCount(n: number): string {
  if (n === 0) return "0";
  if (n <= 5) return "1-5";
  if (n <= 20) return "6-20";
  return "21+";
}

// ─── Active filter group NAMES — never send filter values to PostHog ──────────
// Parallel to countActiveFilters in filterUtils.ts

export function getActiveFilterGroups(
  filters: RentFilters | BuyFilters,
  mode: SearchMode,
): string[] {
  const f = filters as RentFilters & BuyFilters;
  const groups: string[] = [];

  // Shared (both modes)
  if (f.minPrice || f.maxPrice) groups.push("budget");
  if (f.bhk?.length) groups.push("bhk");
  if (f.furnishing?.length) groups.push("furnishing");
  if (f.parking4w?.length || f.parking2w?.length) groups.push("parking");
  if (f.amenities?.length) groups.push("amenities");
  if (f.hasVideoWalkthrough) groups.push("video_walkthrough");
  if (f.minResponseRate) groups.push("response_rate");
  if (f.hasExperienceFeedback) groups.push("experience_feedback");

  if (mode === "rent") {
    const rf = filters as RentFilters;
    if (rf.availableBy) groups.push("availability");
    if (rf.listedWithin) groups.push("listed_within");
    if (rf.zeroRentBrokerage || rf.maxBrokerage) groups.push("brokerage");
    if (rf.maxDeposit) groups.push("deposit");
    if (rf.maxLockIn) groups.push("lock_in");
    if (rf.maxNotice) groups.push("notice_period");
    if (rf.maxAnnualIncrease) groups.push("annual_increase");
    if (rf.maxMoveInCharges) groups.push("move_in_charges");
    if (rf.petPolicy?.length) groups.push("pet_policy");
  } else {
    const bf = filters as BuyFilters;
    if (bf.minCarpetArea || bf.maxCarpetArea || bf.minSuperBuiltUp || bf.maxSuperBuiltUp)
      groups.push("area");
    if (bf.possessionStatus?.length || bf.possessionBefore) groups.push("possession");
    if (bf.negotiable) groups.push("negotiable");
    if (bf.maxBrokerage) groups.push("brokerage");
    if (bf.reraDisclosed) groups.push("rera");
    if (bf.khataType?.length) groups.push("khata");
    if (bf.propertyTaxPaid) groups.push("property_tax");
    if (bf.listedWithin) groups.push("listed_within");
  }

  return groups;
}

// ─── Common sanitized analytics context ──────────────────────────────────────
// NEVER sends: free text, coordinates, locality, address, full URL, raw values

export function buildSearchContext(
  state: SearchState,
  extra: { resultsCount: number },
): Record<string, unknown> {
  const mode = state.context.mode ?? "rent";

  return {
    search_session_id: getOrCreateSearchSessionId(),
    listing_mode: state.context.mode ?? null,
    city_id: null, // no canonical city ID in current search context
    selected_location_count: state.context.locations.length,
    // Normalized multi-select array + legacy scalar (single value when exactly one, else null).
    property_types: state.context.propertyTypes ?? [],
    property_type:
      (state.context.propertyTypes ?? []).length === 1 ? state.context.propertyTypes[0] : null,
    filter_groups: getActiveFilterGroups(state.filters, mode),
    result_count_bucket: bucketResultCount(extra.resultsCount),
    view_mode: "list", // Search is LIST-only
    device_class: getDeviceClass(),
  };
}
