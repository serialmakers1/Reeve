/**
 * Shared types, constants, and utility functions for the inspection form
 * and PDF export pipeline.
 *
 * Imported by:
 *   - src/pages/admin/InspectionForm.tsx
 *   - src/lib/inspection-report/types.ts
 *   - src/lib/inspection-report/sections/RoomsSection.tsx
 *   - src/lib/inspection-report/sections/DamagesSection.tsx
 *   - src/lib/inspection-report/sections/AppliancesSection.tsx
 *   - src/lib/inspection-report/sections/NotesSection.tsx
 *   - src/components/admin/ExportReportDialog.tsx
 *
 * Do NOT import these types from @/pages/admin/InspectionForm.
 */

// ── Database-backed record types ──────────────────────────────────────────────

/**
 * Inspection type values, matching the report/PDF `ReportType` contract
 * (src/lib/inspection-report/types.ts) and the DB CHECK constraint on
 * property_inspections.inspection_type. Kept as a plain string in InspectionRecord
 * since the column is a nullable free-text column with a CHECK; the export/report
 * layer narrows to the ReportType union.
 */
export type InspectionType = "PBR" | "MIR" | "BIR" | "MOCR";

/**
 * Standalone, fully-manual inspection record (migration
 * 20260919000000_inspections_standalone_manual_model). No marketplace property
 * link, no status/scheduling/mode workflow. All business fields are optional so an
 * admin may start an inspection and finish it later. `id`, `inspector_user_id`,
 * `created_at`, `updated_at` are the only always-present system fields.
 */
export type InspectionRecord = {
  id: string;
  inspector_user_id: string;
  inspection_date: string | null;
  inspection_type: InspectionType | null;
  // Manual property details
  building_name: string | null;
  flat_number: string | null;
  full_address: string | null;
  locality: string | null;
  city: string | null;
  pincode: string | null;
  floor: string | null;
  bhk: string | null;
  bathrooms: number | null;
  balconies: number | null;
  google_maps_url: string | null;
  // Owner — admin-only (owner_name may appear in reports; contacts never do)
  owner_name: string | null;
  owner_phone: string | null;
  owner_alternate_phone: string | null;
  owner_email: string | null;
  // Tenant — admin-only (never enters the report payload)
  tenant_name: string | null;
  tenant_phone: string | null;
  tenant_alternate_phone: string | null;
  tenant_email: string | null;
  // Inspection content
  general_observations: string | null;
  pre_existing_damages: unknown;
  inspector_notes: string | null;
  media_drive_link: string | null;
  utilities_overview: unknown;
  structural_observations: unknown;
  inspection_summary?: Record<string, unknown> | null;
  key_return_summary?: Record<string, unknown>[] | null;
  created_at?: string;
  updated_at?: string;
};

export type RoomRecord = {
  id: string;
  inspection_id: string;
  room_type: string;
  room_label: string;
  sort_order: number;
  walls_condition: string | null;
  walls_notes: string | null;
  paint_condition: string | null;
  flooring_condition: string | null;
  flooring_notes: string | null;
  ceiling_condition: string | null;
  ceiling_notes: string | null;
  doors_windows_condition: string | null;
  doors_windows_notes: string | null;
  electrical_condition: string | null;
  electrical_notes: string | null;
  plumbing_condition: string | null;
  plumbing_notes: string | null;
  overall_room_notes: string | null;
};

export type LocalRoom = RoomRecord & {
  is_auto_generated: boolean;
  room_features: unknown;
  furniture_items: unknown;
};

export type LocalAppliance = {
  id: string;
  inspection_id: string;
  appliance_type: string;
  custom_label: string | null;
  brand: string | null;
  model_number: string | null;
  color: string | null;
  manufacturing_year: string | number | null;
  condition: string | null;
  ownership: string | null;
  notes: string | null;
  serial_number: string | null;
  last_service_date: string | null;
  /** Optional room/area label for where this appliance is located. */
  location?: string | null;
  is_local_only?: boolean;
};

/**
 * One entry in the pre_existing_damages JSONB array.
 *
 * Severity DB values (written to Supabase):
 *   cosmetic | repair_before_relet | urgent_immediate
 *
 * Legacy values from old inspections are mapped in InspectionForm.loadData:
 *   low → cosmetic | medium → repair_before_relet | high → urgent_immediate
 */
export type DamageItem = {
  localId: string;
  location: string;
  damage_type: string;
  severity: "" | "cosmetic" | "repair_before_relet" | "urgent_immediate";
  notes: string;
  /** Suggested remediation step, populated by auto-generation. Null for manually entered items. */
  recommended_action: string | null;
  /** Reference to the room field or appliance that triggered auto-generation. Null for manual items. */
  source_ref:
    | { room_id: string; field_key: string }
    | { appliance_id: string; field_key: string }
    | null;
  /** True if this item was auto-generated from a room condition field, false if entered manually. */
  is_auto_generated: boolean;
  /** Human-readable label of the triggering condition/status (e.g. "Poor — Visible Damage"). Auto-generated entries only. */
  source_condition?: string | null;
};

export type SaveState = "saving" | "saved" | "failed";

/** Room type values stored in the DB `room_type` enum. */
export type RoomTypeOption =
  | "living_room"
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "balcony"
  | "utility"
  | "parking"
  | "common_area"
  | "pooja_room"
  | "study_room"
  | "home_office"
  | "servant_quarter"
  | "store_room"
  | "dining_room"
  | "other";

// ── Display constants ─────────────────────────────────────────────────────────

export const ROOM_TYPE_LABELS: Record<RoomTypeOption, string> = {
  living_room:     "Living Room",
  bedroom:         "Bedroom",
  kitchen:         "Kitchen",
  bathroom:        "Bathroom",
  balcony:         "Balcony",
  utility:         "Utility",
  parking:         "Parking",
  common_area:     "Common Area",
  pooja_room:      "Pooja Room / Mandir",
  study_room:      "Study Room",
  home_office:     "Home Office",
  servant_quarter: "Servant Quarter",
  store_room:      "Store Room",
  dining_room:     "Dining Room",
  other:           "Other",
};

/**
 * Room condition options.
 * DB enum values (unchanged): good | minor_wear | moderate_damage | severe_damage
 * Display labels updated 2026-06-09.
 */
export const ROOM_CONDITION_OPTIONS = [
  { value: "good",            label: "Good" },
  { value: "minor_wear",      label: "Minor Wear" },
  { value: "moderate_damage", label: "Poor — Visible Damage" },
  { value: "severe_damage",   label: "Critical — Severe Damage" },
] as const;

export const PAINT_CONDITION_OPTIONS = [
  { value: "fresh",                 label: "Fresh" },
  { value: "faded",                 label: "Faded" },
  { value: "marked",                label: "Marked" },
  { value: "touch_up_required",     label: "Requires Touch-up" },
  { value: "full_repaint_required", label: "Requires Full Repaint" },
] as const;

export const APPLIANCE_TYPE_OPTIONS = [
  { value: "refrigerator",      label: "Refrigerator" },
  { value: "washing_machine",   label: "Washing Machine" },
  { value: "dryer",             label: "Dryer" },
  { value: "air_conditioner",   label: "Air Conditioner" },
  { value: "geyser",            label: "Geyser / Water Heater" },
  { value: "microwave",         label: "Microwave" },
  { value: "stove_hob",         label: "Stove / Hob" },
  { value: "exhaust_fan",       label: "Exhaust Fan" },
  { value: "ceiling_fan",       label: "Ceiling Fan" },
  { value: "dishwasher",        label: "Dishwasher" },
  { value: "water_purifier",    label: "Water Purifier" },
  { value: "tv",                label: "Television" },
  { value: "fire_extinguisher", label: "Fire Extinguisher" },
  { value: "other",             label: "Other" },
] as const;

export const APPLIANCE_CONDITION_OPTIONS = [
  { value: "fully_functional", label: "Fully Functional" },
  { value: "minor_issues",     label: "Minor Issues" },
  { value: "non_functional",   label: "Non-Functional" },
] as const;

export const FURNITURE_ITEM_OPTIONS = [
  "Sofa", "Dining Table", "Bed", "Mattress", "Wardrobe", "TV Unit", "Study Table",
  "Dressing Table", "Shoe Rack", "Centre Table", "Side Table",
  "Curtains", "Window Blinds", "Bookshelf", "Other",
] as const;

export const LOCK_TYPE_OPTIONS = [
  "Digital / Smart lock",
  "Mortise lock",
  "Cylindrical lock",
  "Deadbolt",
  "Chain latch",
  "Padlock",
  "Multi-point lock",
] as const;

export const GLASS_CONDITION_OPTIONS = [
  { value: "Good",    label: "Good" },
  { value: "Cracked", label: "Cracked" },
  { value: "Missing", label: "Missing" },
] as const;

export const APPLIANCE_OWNERSHIP_OPTIONS = [
  { value: "landlord",     label: "Landlord" },
  { value: "platform",     label: "Platform" },
  { value: "tenant_owned", label: "Tenant-Owned" },
] as const;

/**
 * Default room layout per BHK configuration.
 * Order: Living → Dining (2BHK+) → Kitchen → [Balconies injected here by buildDefaultRooms] → Bedrooms → Bathrooms.
 *
 * Balconies are NOT listed here — buildDefaultRooms injects them dynamically from the inspection's `balconies`.
 */
export const ROOM_DEFAULTS: Record<string, Array<{ room_type: RoomTypeOption; room_label: string }>> = {
  studio: [
    { room_label: "Living Room/Studio", room_type: "other" },
    { room_label: "Kitchen",            room_type: "kitchen" },
    { room_label: "Bathroom 1",         room_type: "bathroom" },
  ],
  "1BHK": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Kitchen",     room_type: "kitchen" },
    { room_label: "Bedroom 1",   room_type: "bedroom" },
    { room_label: "Bathroom 1",  room_type: "bathroom" },
  ],
  "2BHK": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Dining Room", room_type: "dining_room" },
    { room_label: "Kitchen",     room_type: "kitchen" },
    { room_label: "Bedroom 1",   room_type: "bedroom" },
    { room_label: "Bedroom 2",   room_type: "bedroom" },
    { room_label: "Bathroom 1",  room_type: "bathroom" },
    { room_label: "Bathroom 2",  room_type: "bathroom" },
  ],
  "3BHK": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Dining Room", room_type: "dining_room" },
    { room_label: "Kitchen",     room_type: "kitchen" },
    { room_label: "Bedroom 1",   room_type: "bedroom" },
    { room_label: "Bedroom 2",   room_type: "bedroom" },
    { room_label: "Bedroom 3",   room_type: "bedroom" },
    { room_label: "Bathroom 1",  room_type: "bathroom" },
    { room_label: "Bathroom 2",  room_type: "bathroom" },
    { room_label: "Bathroom 3",  room_type: "bathroom" },
  ],
  "4BHK": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Dining Room", room_type: "dining_room" },
    { room_label: "Kitchen",     room_type: "kitchen" },
    { room_label: "Bedroom 1",   room_type: "bedroom" },
    { room_label: "Bedroom 2",   room_type: "bedroom" },
    { room_label: "Bedroom 3",   room_type: "bedroom" },
    { room_label: "Bedroom 4",   room_type: "bedroom" },
    { room_label: "Bathroom 1",  room_type: "bathroom" },
    { room_label: "Bathroom 2",  room_type: "bathroom" },
    { room_label: "Bathroom 3",  room_type: "bathroom" },
  ],
  "5BHK_plus": [
    { room_label: "Living Room", room_type: "living_room" },
    { room_label: "Dining Room", room_type: "dining_room" },
    { room_label: "Kitchen",     room_type: "kitchen" },
    { room_label: "Bedroom 1",   room_type: "bedroom" },
    { room_label: "Bedroom 2",   room_type: "bedroom" },
    { room_label: "Bedroom 3",   room_type: "bedroom" },
    { room_label: "Bedroom 4",   room_type: "bedroom" },
    { room_label: "Bedroom 5",   room_type: "bedroom" },
    { room_label: "Bathroom 1",  room_type: "bathroom" },
    { room_label: "Bathroom 2",  room_type: "bathroom" },
    { room_label: "Bathroom 3",  room_type: "bathroom" },
  ],
};

// ── Utility functions ─────────────────────────────────────────────────────────

export function emptyToNull(value: string | null | number | undefined) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function shortId(id: string) {
  return id.slice(0, 8);
}

export function getSuggestedRoomLabel(roomType: RoomTypeOption, rooms: LocalRoom[]) {
  if (roomType === "bedroom") {
    return `Bedroom ${rooms.filter((room) => room.room_type === "bedroom").length + 1}`;
  }
  if (roomType === "bathroom") {
    return `Bathroom ${rooms.filter((room) => room.room_type === "bathroom").length + 1}`;
  }
  return ROOM_TYPE_LABELS[roomType];
}

export function getConditionDotClass(condition: string | null) {
  if (!condition) return "";
  if (condition === "good") return "bg-primary";
  if (condition === "minor_wear") return "bg-accent-foreground";
  if (condition === "moderate_damage") return "bg-foreground";
  return "bg-destructive";
}

export function getWorstCondition(room: LocalRoom) {
  const values = [
    room.walls_condition,
    room.flooring_condition,
    room.ceiling_condition,
    room.doors_windows_condition,
    room.electrical_condition,
    room.plumbing_condition,
  ].filter(Boolean) as string[];

  if (values.length === 0) return null;

  const rank = {
    good: 1,
    minor_wear: 2,
    moderate_damage: 3,
    severe_damage: 4,
  } as const;

  return values.reduce((worst, current) =>
    rank[current as keyof typeof rank] > rank[worst as keyof typeof rank] ? current : worst
  );
}
