// ─── Enum value arrays ────────────────────────────────────────────────────────

export const BHK_VALUES = [
  "1BHK", "2BHK", "3BHK", "4BHK", "5BHK_plus", "studio",
] as const;

export const FURNISHING_VALUES = [
  "unfurnished", "semi_furnished", "fully_furnished",
] as const;

export const POSSESSION_VALUES = [
  "ready_to_move", "under_construction", "new_launch",
] as const;

export const PARKING_VALUES = [
  "none", "covered", "uncovered", "both",
] as const;

export const LISTER_ROLE_VALUES = [
  "owner", "broker", "property_manager", "builder",
] as const;

// Confirmed from src/config/property-form.ts
export const PROPERTY_TYPE_VALUES = [
  "apartment", "villa", "independent_house", "duplex_apartment", "plot",
] as const;

export const PET_POLICY_VALUES = [
  "allowed", "small_only", "case_by_case", "not_allowed",
] as const;

export const KHATA_VALUES = ["A", "B", "not_applicable"] as const;

// ─── Sort & view ──────────────────────────────────────────────────────────────

export const RENT_SORT_KEYS = [
  "newest", "availability_confirmed", "price_asc", "price_desc",
] as const;

export const BUY_SORT_KEYS = ["newest", "price_asc", "price_desc"] as const;

export const SEARCH_VIEW_MODES = ["list", "split", "map"] as const;

// ─── Scalar defaults ──────────────────────────────────────────────────────────

export const MAX_SELECTED_LOCATIONS = 5;
export const DEFAULT_SORT = "newest" as const;
export const DEFAULT_VIEW = "list" as const;

// ─── Aggregate display thresholds (locked from Prompt 1 diagnosis) ────────────

export const RESPONSE_RATE_MIN_HANDLED = 5;
export const VIEW_COUNT_MIN_DISPLAY = 10;
export const COMMENT_COUNT_MIN_DISPLAY = 1;
export const RATING_MIN_COUNT = 3;

// ─── Intent expiry ───────────────────────────────────────────────────────────

export const PENDING_INTENT_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// ─── Canonical URL param names ────────────────────────────────────────────────

export const URL_PARAMS = {
  // Context
  type: "type",
  city: "city",
  locations: "locations",
  locationsData: "locations_data",
  propertyType: "pt",
  // Price
  minPrice: "min",
  maxPrice: "max",
  // Shared filters
  bhk: "bhk",
  furnishing: "furn",
  // UI state
  sort: "sort",
  view: "view",
  cursor: "cursor",
  selectedPropertyId: "pid",
  // Map bounds
  boundsNeLat: "ne_lat",
  boundsNeLng: "ne_lng",
  boundsSwLat: "sw_lat",
  boundsSwLng: "sw_lng",
  // Rent-specific
  availableBy: "avail_by",
  listedWithin: "listed_within",
  availabilityConfirmedWithin: "avail_conf",
  maxBrokerage: "max_brok",
  maxDeposit: "max_dep",
  maxLockIn: "max_lock",
  maxNotice: "max_notice",
  maxAnnualIncrease: "max_incr",
  maxMoveInCharges: "max_movein",
  petPolicy: "pets",
  zeroRentBrokerage: "zero_brok",
  // Shared parking / amenities / trust
  parking4w: "park4w",
  parking2w: "park2w",
  amenities: "amenities",
  hasVideoWalkthrough: "video",
  minResponseRate: "min_resp",
  hasExperienceFeedback: "has_fb",
  // Buy-specific
  minCarpetArea: "min_carpet",
  maxCarpetArea: "max_carpet",
  minSuperBuiltUp: "min_sba",
  maxSuperBuiltUp: "max_sba",
  possessionStatus: "poss",
  possessionBefore: "poss_before",
  negotiable: "neg",
  maxBrokeragePct: "max_brok_pct",
  reraDisclosed: "rera",
  khataType: "khata",
  propertyTaxPaid: "tax_paid",
} as const;

// ─── Amenity options (free-form display strings, not a DB enum) ──────────────

export const AMENITY_OPTIONS = [
  { value: "gym", label: "Gym" },
  { value: "swimming_pool", label: "Swimming pool" },
  { value: "security", label: "24h security" },
  { value: "clubhouse", label: "Clubhouse" },
  { value: "power_backup", label: "Power backup" },
  { value: "lift", label: "Lift" },
  { value: "gas_pipeline", label: "Gas pipeline" },
  { value: "garden", label: "Garden / park" },
  { value: "play_area", label: "Children's play area" },
  { value: "visitor_parking", label: "Visitor parking" },
  { value: "cctv", label: "CCTV surveillance" },
  { value: "rainwater_harvesting", label: "Rainwater harvesting" },
] as const;
