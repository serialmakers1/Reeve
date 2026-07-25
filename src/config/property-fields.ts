/**
 * Property Field Specification
 *
 * Single source of truth for all property fields across:
 * - Owner listing form (`src/pages/ListProperty.tsx`)          → Prompt 3 refactor
 * - Admin PropertyEdit form (`src/pages/admin/PropertyEdit.tsx`) → Prompt 4 refactor
 * - Public PropertyDetail page (`src/pages/PropertyDetail.tsx`)  → Prompt 5 refactor
 *
 * Adding or modifying a field: change this file ONLY. All 3 surfaces adapt.
 *
 * NOT wired into consumers yet — Prompt 2 is foundation-only. The old
 * constants in `src/config/property-form.ts` remain in use until the
 * consumer refactors in Prompts 3–5 replace them.
 *
 * References:
 *   - commons-decisions.md D-128 (spec architecture), D-129 (audiences),
 *     D-130 (validation), D-135 (rent vs sale labels)
 *   - commons-status-flow.md (Tier 1 locked fields, Tier 2 review-required)
 *   - commons-schema.md §17 (spec module note), §18 (this module's shape)
 *   - CLAUDE.md — pre-draft buffering invariant (D-153): consumers must not
 *     gate patch() on propertyId when they wire this spec in.
 */

import {
  BHK_OPTIONS,
  BUILDING_AMENITIES,
  FACING_OPTIONS,
  FURNISHING_ITEM_OPTIONS,
  FURNISHING_OPTIONS,
  GAS_TYPE_OPTIONS,
  INDIAN_STATES,
  PARKING_OPTIONS,
  PET_POLICY_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
} from "./property-form";

// ─── Types ───────────────────────────────────────────────────────────────

export type PropertyFieldSurface = "owner_form" | "admin_form" | "public_detail";
export type PropertyFieldRole = "owner" | "admin";

export type PropertyFieldInputType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "checkbox"
  | "switch"
  | "date"
  | "radio"
  | "json"; // JSONB composite fields (furnishing_detail, amenities) — consumer owns UI

export type PropertyFieldOption = { value: string; label: string };

/**
 * Section grouping for the owner form accordion.
 * The `sale` section is defined ahead of Prompt 9 so consumers can already
 * type against it — no fields target it in this prompt.
 */
export type OwnerFormSection =
  | "location"
  | "basics"
  | "rent_deposit"
  | "sale"
  | "inside"
  | "building_society"
  | "rules_preferences"
  | "photos"
  | "description"
  | "final_checks";

export type PropertyFieldSpec = {
  /** DB column name (source of truth for storage) */
  key: string;
  /** Owner-facing label (default label if no surface-specific override) */
  label: string;
  /** Admin-facing label (defaults to label if omitted) */
  adminLabel?: string;
  /** Public-facing label on property detail (defaults to label if omitted) */
  publicLabel?: string;
  /** Placeholder for input fields */
  placeholder?: string;
  /** Explanatory helper text below the input */
  helper?: string;
  /** Input type for the form */
  input: PropertyFieldInputType;
  /** Options for select / multiselect / radio */
  options?: PropertyFieldOption[];
  /** Surfaces on which this field appears (D-129) */
  audiences: PropertyFieldSurface[];
  /** Which role can edit (D-054 Tier system) */
  editableBy: PropertyFieldRole[];
  /** Owner form section grouping */
  ownerSection?: OwnerFormSection;
  /** Owner form required flag */
  requiredOwner?: boolean;
  /** Admin form required flag (rare) */
  requiredAdmin?: boolean;
  /** Numeric min for number inputs */
  min?: number;
  /** Numeric max for number inputs */
  max?: number;
  /** Regex pattern for text validation */
  pattern?: RegExp;
  /** Character max for text/textarea */
  maxLength?: number;
  /**
   * Visibility predicate. Field is rendered only when it returns true.
   * Runs against the current form values map.
   */
  visibleWhen?: (values: Record<string, unknown>) => boolean;
  /**
   * Display formatter for public detail and admin queue.
   * Default: enum → option label, else String(value).
   */
  display?: (value: unknown) => string;
  /** Icon key or class name for public detail rendering (optional) */
  displayIcon?: string;
  /**
   * Date-picker options (D-168). Only consulted for `input: 'date'`.
   *   - warnOnPast: amber warning text shown when selected date < today.
   *   - maxDaysFromNow: disable calendar dates beyond today + N days.
   * Empty object marks a field as date-picker with no special constraints.
   */
  datePickerOptions?: {
    warnOnPast?: string;
    maxDaysFromNow?: number;
  };
  /**
   * Field tier per commons-status-flow.md.
   * 'locked' = Tier 1 (locked for owner post-listing; admin can edit)
   * 'review_required' = Tier 2 (owner edit triggers edit_pending_review flow)
   * Undefined = same as review_required.
   */
  tier?: "locked" | "review_required";
};

// ─── Section metadata ─────────────────────────────────────────────────────

export const OWNER_FORM_SECTIONS: Record<
  OwnerFormSection,
  { label: string; helper?: string; required?: boolean }
> = {
  location: { label: "Where is your property?", required: true },
  basics: { label: "The basics", required: true },
  rent_deposit: { label: "Rent & Deposit", required: true },
  // Placeholder — no fields target this section until Prompt 9 (rent/sale)
  sale: { label: "Sale details", required: true },
  inside: { label: "What's inside the home?" },
  building_society: { label: "Building & Society" },
  rules_preferences: { label: "Rules & preferences" },
  photos: { label: "Photos", required: true },
  description: { label: "Description" },
  final_checks: { label: "Final checks", required: true },
};

// ─── Option adapters (constants → PropertyFieldOption[]) ─────────────────

const asOptions = <T extends { value: string; label: string }>(
  arr: readonly T[],
): PropertyFieldOption[] => arr.map(({ value, label }) => ({ value, label }));

const facingOptions: PropertyFieldOption[] = FACING_OPTIONS.map((f) => ({ value: f, label: f }));
const stateOptions: PropertyFieldOption[] = INDIAN_STATES.map((s) => ({ value: s, label: s }));

// ─── The spec ─────────────────────────────────────────────────────────────

export const PROPERTY_FIELDS: PropertyFieldSpec[] = [
  // ── Listing type (Prompt 10a, D-161) ─────────────────────────────────
  // Tier-1 locked for owner post-draft; admin can change any time. Public
  // display is a card badge (Prompt 10b) rather than a details-grid row,
  // but public_detail audience kept for spec-knob completeness.
  {
    key: "listing_type",
    label: "Listing type",
    input: "select",
    options: [
      { value: "rent", label: "For Rent" },
      { value: "sale", label: "For Sale" },
    ],
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
    requiredOwner: true,
    tier: "locked",
  },
  // F3-C9: lister_role — who is listing this property (owner / broker / property
  // manager / builder). Applies to BOTH rent and sale. Locked for owner after
  // publish (readOnly at call site); admin can always edit. Rendered as a
  // colour-coded badge in the header chip row and OwnerCard.
  {
    key: "lister_role",
    label: "Your role",
    publicLabel: "Listed by",
    input: "select",
    options: [
      { value: "owner",            label: "I am the owner" },
      { value: "broker",           label: "I am a broker / agent" },
      { value: "property_manager", label: "I manage this property" },
      { value: "builder",          label: "I am the builder / developer" },
    ],
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
    requiredOwner: true,
  },

  // ── Location (Tier 1) ────────────────────────────────────────────────
  {
    key: "building_name",
    label: "Building name",
    input: "text",
    placeholder: "e.g. Prestige Lakeside",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
    requiredOwner: true,
    tier: "locked",
  },
  {
    key: "street_address",
    label: "Full address",
    publicLabel: "Address",
    input: "text",
    placeholder: "Street, block, unit",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
    requiredOwner: true,
    tier: "locked",
  },
  {
    key: "locality",
    label: "Locality",
    input: "text",
    placeholder: "e.g. Koramangala",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
    requiredOwner: true,
    tier: "locked",
  },
  {
    key: "city",
    label: "City",
    input: "text",
    placeholder: "e.g. Bangalore",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
    requiredOwner: true,
    tier: "locked",
  },
  // TODO(P2): re-add 'public_detail' if state/pincode become search filters or address-line renders
  {
    key: "state",
    label: "State",
    input: "select",
    options: stateOptions,
    audiences: ["owner_form", "admin_form"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
    requiredOwner: true,
    tier: "locked",
  },
  // TODO(P2): re-add 'public_detail' if state/pincode become search filters or address-line renders
  {
    key: "pincode",
    label: "Pincode",
    input: "text",
    placeholder: "560095",
    pattern: /^\d{6}$/,
    maxLength: 6,
    audiences: ["owner_form", "admin_form"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
    tier: "locked",
  },
  // Added in Prompt 8 (D-159). Renders as a bespoke subtitle in PropertyDetail's
  // Location block ("Near {landmark}") — not through the details grid.
  {
    key: "landmark",
    label: "Nearby landmark",
    adminLabel: "Landmark",
    publicLabel: "Landmark",
    input: "text",
    placeholder: "e.g. Near XYZ mall, Behind ABC hospital",
    helper: "e.g., Near XYZ mall, Behind ABC hospital",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
  },

  // ── Google Maps Phase 1 — location fields ───────────────────────────
  {
    key: "formatted_address",
    label: "Full address",
    adminLabel: "Formatted address",
    helper: "Auto-filled from your building or area selection.",
    input: "text",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["admin"],
    ownerSection: "location",
    tier: "locked",
  },
  {
    key: "sublocality_1",
    label: "Neighbourhood",
    publicLabel: "Neighbourhood",
    input: "text",
    audiences: ["public_detail"],
    editableBy: [],
  },
  {
    key: "location_verified_by_owner",
    label: "I have verified the location pin is correctly placed on the map",
    input: "switch",
    helper: "Required before you can submit your listing. Rendered by PropertyAddressInput as a shadcn Checkbox — not via SpecField.",
    audiences: ["owner_form"],
    editableBy: ["owner"],
    ownerSection: "location",
  },
  {
    key: "streetview_show_in_listing",
    label: "Show Street View link in listing",
    input: "switch",
    helper: "When available, a Street View link helps tenants see the street. Enabled by default.",
    audiences: ["owner_form", "admin_form"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
  },
  {
    key: "streetview_available",
    label: "Street View availability",
    input: "text",
    helper: "Rendered by PropertyAddressInput as a status badge — not via SpecField.",
    audiences: ["owner_form", "admin_form"],
    editableBy: [],
    ownerSection: "location",
  },

  // ── Basics (some Tier 1) ─────────────────────────────────────────────
  {
    key: "bhk",
    label: "BHK",
    publicLabel: "BHK Type",
    input: "select",
    options: asOptions(BHK_OPTIONS),
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "basics",
    requiredOwner: true,
    tier: "locked",
    displayIcon: "home",
  },
  {
    key: "property_type",
    label: "Property type",
    input: "select",
    options: asOptions(PROPERTY_TYPE_OPTIONS),
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "basics",
    requiredOwner: true,
    tier: "locked",
  },
  {
    key: "floor_number",
    label: "Floor number",
    publicLabel: "Floor",
    input: "number",
    min: 0,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "basics",
    displayIcon: "building",
  },
  {
    key: "total_floors",
    label: "Total floors",
    publicLabel: "Total Floors",
    input: "number",
    min: 0,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "basics",
    displayIcon: "layers",
  },
  {
    key: "square_footage",
    label: "Carpet area (sqft)",
    publicLabel: "Carpet area",
    input: "number",
    min: 1,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "basics",
    display: (v) => (typeof v === "number" ? `${v} sqft` : "—"),
    displayIcon: "maximize",
  },
  {
    key: "super_built_up_area",
    label: "Super built-up area (sqft)",
    publicLabel: "Super built-up",
    input: "number",
    min: 1,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "basics",
    display: (v) => (typeof v === "number" ? `${v} sqft` : "—"),
    displayIcon: "maximize",
  },
  {
    key: "facing",
    label: "Facing",
    input: "select",
    options: facingOptions,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "basics",
    displayIcon: "compass",
  },
  {
    key: "building_age_years",
    label: "Building age (years)",
    publicLabel: "Building Age",
    input: "number",
    min: 0,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "basics",
    // Public-detail formatter matches PropertyDetail's current output ("~5 yrs").
    display: (v) => (typeof v === "number" ? `~${v} yrs` : "—"),
    displayIcon: "calendar-days",
  },

  // ── Rent & Deposit ───────────────────────────────────────────────────
  {
    key: "listed_rent",
    label: "Monthly rent (₹)",
    publicLabel: "Rent",
    input: "number",
    placeholder: "35000",
    min: 0,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    requiredOwner: true,
    display: (v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}/mo` : "—"),
  },
  {
    key: "security_deposit_amount",
    label: "Security deposit (₹)",
    publicLabel: "Deposit",
    input: "number",
    placeholder: "70000",
    min: 0,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    requiredOwner: true,
    display: (v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : "—"),
  },
  {
    key: "society_maintenance_approx",
    label: "Society maintenance (₹)",
    publicLabel: "Society maintenance",
    input: "number",
    min: 0,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    display: (v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}/mo` : "—"),
  },
  {
    key: "maintenance_included_in_rent",
    label: "Maintenance included in rent",
    helper: 'Tenants see "Included" instead of a separate amount',
    input: "switch",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    display: (v) => (v ? "Included in rent" : "Separate"),
  },
  {
    key: "available_from",
    label: "Available from",
    input: "date",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    requiredOwner: true,
    datePickerOptions: {
      warnOnPast: "Available from is in the past — is this correct?",
      maxDaysFromNow: 90,
    },
  },
  // P3: lock-in period. Rent-only. Optional. Placed before notice_period_days
  // in the rent_deposit grid.
  {
    key: "lock_in_months",
    label: "Lock-in period (months)",
    publicLabel: "Lock-in",
    input: "number",
    min: 0,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    display: (v) => (typeof v === "number" ? `${v} month${v === 1 ? "" : "s"}` : "—"),
    visibleWhen: (v) => v.listing_type !== "sale",
  },
  // P3: notice period in days. Rent-only. Replaces notice_period_months on
  // owner-facing surfaces. `notice_period_months` retained admin-only for legacy.
  {
    key: "notice_period_days",
    label: "Notice period",
    publicLabel: "Notice period",
    input: "select",
    options: [
      { value: "15", label: "15 days" },
      { value: "30", label: "30 days" },
      { value: "45", label: "45 days" },
      { value: "60", label: "60 days" },
      { value: "90", label: "90 days" },
    ],
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    display: (v) => (typeof v === "number" ? `${v} days` : "—"),
    visibleWhen: (v) => v.listing_type !== "sale",
  },
  // Legacy months field — retained admin-only. Owner-facing input replaced by
  // `notice_period_days`. Column kept in DB per D-P3-*; not dropped.
  {
    key: "notice_period_months",
    label: "Notice period (months, legacy)",
    input: "number",
    min: 0,
    audiences: [],
    editableBy: ["admin"],
    display: (v) => (typeof v === "number" ? `${v} month${v === 1 ? "" : "s"}` : "—"),
    visibleWhen: (v) => v.listing_type !== "sale",
  },
  // Added in Prompt 8 (D-159). Always public per D-136 (no owner opt-out on
  // visibility) — but structurally rent-only, so visibleWhen gates it out of
  // sale listings entirely. Activated in Prompt 10a (D-161).
  {
    key: "annual_rent_increase_pct",
    label: "Annual rent increase (%)",
    input: "number",
    min: 0,
    max: 100,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    display: (v) => (v === null || v === undefined || v === "" ? "" : `${v}% annually`),
    visibleWhen: (v) => v.listing_type !== "sale",
  },
  // ── Phase 1.5 addendum (D-166) — move-in charges + brokerage ─────────
  {
    key: "move_in_charges_amount",
    label: "Move-in charges (₹)",
    input: "number",
    min: 0,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    display: (v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : ""),
    visibleWhen: (v) => v.listing_type !== "sale",
  },
  // F2-D1: collapsed to a single flat amount. `rent_brokerage_type` and
  // `rent_brokerage_months` spec entries removed; DB columns retained but no
  // longer surfaced. Owner enters an amount (0 = zero brokerage, null = unknown).
  {
    key: "rent_brokerage_fixed_amount",
    label: "Brokerage amount (₹)",
    input: "number",
    min: 0,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
    placeholder: "e.g. 25000",
    visibleWhen: (v) => v.listing_type !== "sale",
  },

  // ── Inside the home ──────────────────────────────────────────────────
  {
    key: "furnishing",
    label: "Furnishing",
    input: "select",
    options: asOptions(FURNISHING_OPTIONS),
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "inside",
    requiredOwner: true,
    displayIcon: "armchair",
  },
  {
    key: "furnishing_detail",
    // JSONB — consumer owns the UI (FURNISHING_ITEM_OPTIONS drives it).
    // Marked here so the spec is aware of the column and can flag missing coverage.
    label: "Furnishing items",
    input: "json",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "inside",
    helper: `Options: ${FURNISHING_ITEM_OPTIONS.length} items available`,
  },
  {
    key: "bathrooms",
    label: "Bathrooms",
    input: "number",
    min: 1,
    max: 10,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "inside",
    displayIcon: "droplets",
  },
  {
    key: "balconies",
    label: "Balconies",
    input: "number",
    min: 0,
    max: 10,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "inside",
    displayIcon: "wind",
  },

  // ── Building & Society ───────────────────────────────────────────────
  {
    key: "amenities",
    // JSONB composite — consumer renders BUILDING_AMENITIES + custom items.
    label: "Building amenities",
    input: "json",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
    helper: `Options: ${BUILDING_AMENITIES.length} amenities available`,
  },
  {
    key: "parking_2w",
    label: "2-wheeler parking",
    publicLabel: "2-Wheeler Parking",
    input: "select",
    options: asOptions(PARKING_OPTIONS),
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
    displayIcon: "bike",
  },
  {
    key: "parking_4w",
    label: "4-wheeler parking",
    publicLabel: "4-Wheeler Parking",
    input: "select",
    options: asOptions(PARKING_OPTIONS),
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
    displayIcon: "car",
  },
  {
    key: "utility_water_included",
    label: "Water included",
    input: "switch",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
    display: (v) => (v ? "Included" : "Separate"),
  },
  {
    key: "utility_gas_included",
    label: "Gas included",
    input: "switch",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
    display: (v) => (v ? "Included" : "Separate"),
  },
  {
    key: "gas_type",
    label: "Gas type",
    input: "select",
    // D-169: 'none' option maps to NULL on save (caller-side transform in onChange).
    // CHECK constraint on the DB stays pipeline | cylinder | NULL.
    // F1-B3c: independent of utility_gas_included — describes property infrastructure,
    // not billing arrangement.
    // F3-C6: gas_type now applies to both rent and sale — visibleWhen removed.
    options: [{ value: "none", label: "None" }, ...asOptions(GAS_TYPE_OPTIONS)],
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
  },
  {
    key: "utility_electricity_included",
    label: "Electricity included",
    input: "switch",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
    display: (v) => (v ? "Included" : "Separate"),
  },
  // Added in Prompt 8 (D-159). CHECK-enforced enum-string on the DB side; no
  // Postgres ENUM type. Options match commons-schema.md §19.
  {
    key: "water_storage",
    label: "Water storage",
    input: "select",
    options: [
      { value: "sump_only", label: "Sump only" },
      { value: "overhead_only", label: "Overhead only" },
      { value: "both", label: "Both (sump + overhead)" },
      { value: "none", label: "None" },
    ],
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
  },
  // P3: multi-select array. Rendered by bespoke inline checkbox grid in both
  // forms (SpecField does not support multi-select). Spec entry kept for
  // audience metadata + potential future public-detail integration.
  {
    key: "water_source",
    label: "Water source",
    publicLabel: "Water source",
    input: "text",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
  },
  // Added in Prompt 8 (D-159). Public displays these via a bespoke compound
  // formatter in PropertyDetail — enum-availability + count on one row —
  // so they're intentionally excluded from public audiences.
  {
    key: "parking_2w_count",
    label: "2W spots",
    helper: "Number of two-wheeler spots",
    input: "number",
    min: 0,
    audiences: ["owner_form", "admin_form"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
  },
  {
    key: "parking_4w_count",
    label: "4W spots",
    helper: "Number of four-wheeler spots",
    input: "number",
    min: 0,
    audiences: ["owner_form", "admin_form"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
  },
  {
    key: "parking_notes",
    label: "Parking notes",
    helper: "e.g., shared parking, visitor slots included",
    input: "textarea",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
  },

  // ── Rules & Preferences ──────────────────────────────────────────────
  {
    key: "pet_policy",
    label: "Pet policy",
    publicLabel: "Pet Policy",
    input: "select",
    options: asOptions(PET_POLICY_OPTIONS),
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rules_preferences",
    displayIcon: "paw-print",
  },
  {
    key: "building_rules",
    label: "House rules",
    adminLabel: "Building rules",
    input: "textarea",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rules_preferences",
  },
  {
    key: "building_notes",
    label: "About the Property",
    publicLabel: "About the Property",
    adminLabel: "About the Property",
    input: "textarea",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rules_preferences",
  },

  // ── Photos section (only youtube URL is a properties column) ─────────
  {
    key: "youtube_walkthrough_url",
    label: "YouTube walkthrough URL",
    input: "text",
    placeholder: "https://youtube.com/watch?v=...",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "photos",
  },

  // P3: converted from freetext to enum-select. CHECK constraint enforced in
  // migration `20260721120000_property_detail_additions.sql`.
  {
    key: "main_door_lock_type",
    label: "Lock type",
    publicLabel: "Lock Type",
    adminLabel: "Main Door Lock Type",
    placeholder: "Select lock type",
    input: "select",
    options: [
      { value: "standard", label: "Standard lock" },
      { value: "godrej_manual", label: "Branded manual lock" },
      { value: "digital_keypad", label: "Digital keypad" },
      { value: "smart_lock", label: "Smart lock" },
    ],
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "building_society",
    displayIcon: "key-round",
  },

  // ── Sale-only columns (Prompt 10a, D-161) ────────────────────────────
  // All render in the owner form's "sale" section, which the Section 3 slot
  // switches to when `listing_type === 'sale'`. Trigger enforces required
  // fields server-side per D-160.
  {
    key: "sale_price",
    label: "Sale price (₹)",
    input: "number",
    min: 0,
    placeholder: "e.g. 15000000",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "sale",
    requiredOwner: true,
    display: (v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : "—"),
  },
  {
    key: "price_negotiable",
    label: "Price negotiable",
    input: "switch",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "sale",
    // Public: show "Negotiable" when true, blank otherwise (SpecField's public
    // branch treats empty string as "hide row").
    display: (v) => (v === true ? "Negotiable" : ""),
  },
  {
    key: "expected_price_per_sqft",
    label: "Expected price per sqft (₹)",
    input: "number",
    min: 0,
    helper: "Manual estimate — not auto-calculated from sale price.",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "sale",
    display: (v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}/sqft` : "—"),
  },
  {
    key: "possession_status",
    label: "Possession status",
    input: "select",
    options: [
      { value: "ready_to_move", label: "Ready to move" },
      { value: "under_construction", label: "Under construction" },
      { value: "new_launch", label: "New launch" },
    ],
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "sale",
    requiredOwner: true,
  },
  {
    key: "possession_date",
    label: "Possession date",
    publicLabel: "Possession from", // per D-135
    input: "date",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "sale",
    // Only meaningful when under construction — hide otherwise. Trigger
    // enforces required-when-under-construction server-side (D-160).
    visibleWhen: (v) => v.possession_status === "under_construction",
    datePickerOptions: {},
  },
  {
    key: "rera_registration_number",
    label: "RERA registration number",
    input: "text",
    helper: "Adding RERA number builds trust with buyers.",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "sale",
  },
  {
    key: "khata_type",
    label: "Khata type",
    input: "select",
    options: [
      { value: "A", label: "A" },
      { value: "B", label: "B" },
      { value: "not_applicable", label: "N/A" },
    ],
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "sale",
  },
  {
    key: "property_tax_paid_upto",
    label: "Property tax paid up to",
    input: "date",
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "sale",
    display: (v) => (v ? `Property tax paid up to ${v}` : ""),
    datePickerOptions: {},
  },
  // Phase 1.5 addendum (D-166). DB CHECK enforces 0–10; UI mirrors via max=10.
  {
    key: "sale_brokerage_pct",
    label: "Brokerage (%)",
    input: "number",
    min: 0,
    max: 10,
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "sale",
    display: (v) => (v === null || v === undefined || v === "" ? "" : `${v}%`),
    // Safe with strict equality — sale is opt-in; no legacy null-listing_type rows are sale.
    visibleWhen: (v) => v.listing_type === "sale",
  },

  // ── Admin-only columns ───────────────────────────────────────────────
  // Added in Prompt 4 — legacy PM field (deposit in months) alongside
  // owner-facing security_deposit_amount (rupees).
  // Sync Prompt 1 (D-167) — audiences widened to owner_form + public_detail
  // to match actual usage: chips write to security_deposit_amount but months
  // remains part of the deposit picture; public reads months for the fallback
  // display when amount is null. Owner form doesn't add a months input in this
  // pass — chips continue as-is. editableBy widened to match audiences.
  {
    key: "security_deposit_months",
    label: "Security deposit (months)",
    adminLabel: "Security Deposit (months)",
    input: "select",
    options: [
      { value: "1", label: "1 month" },
      { value: "2", label: "2 months" },
      { value: "3", label: "3 months" },
    ],
    audiences: ["owner_form", "admin_form", "public_detail"],
    editableBy: ["owner", "admin"],
    ownerSection: "rent_deposit",
  },
  // Added in Prompt 4 — admin-captured legal owner name (never shown to tenants).
  {
    key: "legal_owner_name",
    label: "Legal owner name",
    adminLabel: "Property Legal Owner Name",
    placeholder: "e.g. Rajesh Kumar Sharma",
    input: "text",
    audiences: ["admin_form"],
    editableBy: ["admin"],
  },
  {
    key: "status",
    label: "Status",
    input: "select",
    // Options intentionally omitted — admin surface builds them from
    // STATUS_CONFIG (propertyStatus.ts). Marked select for form-shape purposes;
    // admin PropertyEdit will keep its own status dropdown per D-110.
    audiences: ["admin_form", "public_detail"],
    editableBy: ["admin"],
    display: (v) => String(v),
    tier: "locked",
  },
  {
    key: "is_active",
    label: "Active",
    input: "switch",
    audiences: ["admin_form"],
    editableBy: ["admin"],
    tier: "locked",
  },
  {
    key: "flat_number",
    label: "Flat number",
    input: "text",
    audiences: ["admin_form"],
    editableBy: ["admin"],
    tier: "locked",
  },
  {
    key: "lister_flat_number",
    label: "Flat / Unit number",
    input: "text",
    maxLength: 10,
    pattern: /^[A-Za-z0-9/-]{1,10}$/,
    helper: "Letters, numbers, hyphens and slashes only. Max 10 characters. This will not be visible to tenants on the property listing.",
    audiences: ["owner_form", "admin_form"],
    editableBy: ["owner", "admin"],
    ownerSection: "location",
    tier: "locked",
  },
  {
    key: "flat_number_revealed",
    label: "Flat number revealed",
    input: "switch",
    audiences: ["admin_form"],
    editableBy: ["admin"],
    tier: "locked",
  },
  {
    key: "board_status",
    label: "Board status",
    input: "select",
    audiences: ["admin_form"],
    editableBy: ["admin"],
    tier: "locked",
  },
  {
    key: "auto_accept_enabled",
    label: "Auto-accept applications",
    input: "switch",
    audiences: ["admin_form"],
    editableBy: ["admin"],
    tier: "locked",
  },
  {
    key: "owner_diet_preference",
    label: "Owner diet preference",
    input: "select",
    audiences: ["admin_form"],
    editableBy: ["admin"],
    tier: "locked",
  },
  {
    key: "owner_pet_preference",
    label: "Owner pet preference",
    input: "select",
    audiences: ["admin_form"],
    editableBy: ["admin"],
    tier: "locked",
  },
  {
    key: "owner_tenant_type_preference",
    label: "Owner tenant-type preference",
    input: "select",
    audiences: ["admin_form"],
    editableBy: ["admin"],
    tier: "locked",
  },
  {
    key: "listed_at",
    label: "Listed at",
    input: "date",
    audiences: ["admin_form"],
    editableBy: ["admin"],
  },
  {
    key: "created_at",
    label: "Created at",
    input: "date",
    audiences: ["admin_form"],
    editableBy: ["admin"],
  },
];

// ─── Public details grid membership (Phase 1.5 Prompt 5, D-157) ─────────
// Explicit ordered array — the "spec is single knob" for the tenant-facing
// details grid on PropertyDetail. Adding/removing a scalar from the grid =
// edit this array + confirm `public_detail` is in the field's `audiences`.
// Order deliberately matches PropertyDetail's pre-refactor page order (not
// spec section order) — TODO(spec) in Prompt 6 to reconcile if desired.
// Row visibility guards (non-null / !== "none") stay in PropertyDetail; the
// spec only controls membership, order, label, icon, and formatting.
export const PUBLIC_DETAILS_GRID_KEYS: readonly string[] = [
  "bhk",
  "square_footage",
  "floor_number",
  "total_floors",
  "bathrooms",
  "balconies",
  "facing",
  "building_age_years",
  "furnishing",
  // Prompt 8 (D-159): parking_2w / parking_4w removed from the grid — replaced
  // by a compound bespoke display in PropertyDetail that combines enum + count
  // ("Covered · 2 slots"). See renderParkingRow() in PropertyDetail.tsx.
  "water_storage",
  "notice_period_months",
  "annual_rent_increase_pct",
  "main_door_lock_type",
  "pet_policy",
  "parking_notes",
  // Prompt 10b (D-162) — sale-side grid rows. `possession_date` respects its
  // spec `visibleWhen(v.possession_status === 'under_construction')` when the
  // caller passes `formValues` — hidden on ready_to_move / new_launch.
  // `sale_price`, `price_negotiable`, `expected_price_per_sqft` render bespoke
  // in the prominent Sale Price block on PropertyDetail — NOT in the grid.
  "possession_status",
  "possession_date",
  "rera_registration_number",
  "khata_type",
  "property_tax_paid_upto",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────

export function getFieldsForSurface(
  spec: PropertyFieldSpec[],
  surface: PropertyFieldSurface,
): PropertyFieldSpec[] {
  return spec.filter((f) => f.audiences.includes(surface));
}

export function getOwnerFieldsGrouped(
  spec: PropertyFieldSpec[],
): Map<OwnerFormSection, PropertyFieldSpec[]> {
  const order: OwnerFormSection[] = [
    "location",
    "basics",
    "rent_deposit",
    "sale",
    "inside",
    "building_society",
    "rules_preferences",
    "photos",
    "description",
    "final_checks",
  ];
  const grouped = new Map<OwnerFormSection, PropertyFieldSpec[]>();
  for (const section of order) grouped.set(section, []);
  for (const field of spec) {
    if (!field.audiences.includes("owner_form")) continue;
    if (!field.ownerSection) continue;
    grouped.get(field.ownerSection)?.push(field);
  }
  return grouped;
}

export function getFieldLabel(
  field: PropertyFieldSpec,
  surface: PropertyFieldSurface,
): string {
  if (surface === "admin_form" && field.adminLabel) return field.adminLabel;
  if (surface === "public_detail" && field.publicLabel) return field.publicLabel;
  return field.label;
}

export function formatFieldValue(field: PropertyFieldSpec, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.display) return field.display(value);
  if ((field.input === "select" || field.input === "radio") && field.options) {
    return field.options.find((o) => o.value === value)?.label ?? String(value);
  }
  return String(value);
}

export function isFieldVisible(
  field: PropertyFieldSpec,
  values: Record<string, unknown>,
): boolean {
  if (!field.visibleWhen) return true;
  return field.visibleWhen(values);
}

/**
 * Runtime validation. Returns [] on success, otherwise a list of problems.
 * Callable from tests, dev startup, or the Prompts 3-5 refactors.
 */
export function validateSpec(spec: PropertyFieldSpec[]): string[] {
  const errors: string[] = [];
  const seenKeys = new Set<string>();
  for (const field of spec) {
    if (seenKeys.has(field.key)) errors.push(`Duplicate key: ${field.key}`);
    seenKeys.add(field.key);
    if (!field.audiences || field.audiences.length === 0) {
      errors.push(`Field ${field.key} has no audiences`);
    }
    if (!field.editableBy || field.editableBy.length === 0) {
      errors.push(`Field ${field.key} has no editableBy`);
    }
    if (field.audiences?.includes("owner_form") && !field.ownerSection) {
      errors.push(`Field ${field.key} is on owner_form but has no ownerSection`);
    }
    if (
      (field.input === "select" || field.input === "radio") &&
      // status is admin-only and intentionally options-less — consumer builds them.
      field.key !== "status" &&
      field.key !== "board_status" &&
      field.key !== "owner_diet_preference" &&
      field.key !== "owner_pet_preference" &&
      field.key !== "owner_tenant_type_preference" &&
      (!field.options || field.options.length === 0)
    ) {
      errors.push(`Field ${field.key} is select/radio but has no options`);
    }
  }
  return errors;
}
