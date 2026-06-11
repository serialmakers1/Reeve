/**
 * surfaceFields.ts — FieldConfig arrays and default entry factories for
 * wall, flooring, ceiling, and false-ceiling surfaces.
 *
 * These are consumed by SurfacesSubsection via EntryList.
 * Do not import from InspectionForm or other page-level files.
 *
 * "Custom" dropdown options use the customTextOnValue pattern: when selected,
 * EntryList renders a free-text input storing at `<key>_custom`.
 */
import type { FieldConfig } from "./EntryList";

// ── Shared condition options (matches ROOM_CONDITION_OPTIONS in inspection.ts) ─

const CONDITION_OPTIONS = [
  { value: "good",            label: "Good" },
  { value: "minor_wear",      label: "Minor Wear" },
  { value: "moderate_damage", label: "Poor — Visible Damage" },
  { value: "severe_damage",   label: "Critical — Severe Damage" },
];

const conditionNotGood = (e: Record<string, unknown>) =>
  e.condition !== "" && e.condition !== "good" && e.condition !== undefined;

// ── Wall fields ───────────────────────────────────────────────────────────────

export const WALL_FIELDS: FieldConfig[] = [
  {
    key: "which_wall",
    label: "Wall",
    type: "select",
    placeholder: "Select wall",
    options: [
      { value: "all_walls", label: "All Walls" },
      { value: "left",      label: "Left" },
      { value: "right",     label: "Right" },
      { value: "entry",     label: "Entry" },
      { value: "opposite",  label: "Opposite" },
      { value: "custom",    label: "Custom" },
    ],
    customTextOnValue: "custom",
    customTextPlaceholder: "Describe which wall…",
  },
  {
    key: "opening",
    label: "Opening on this wall",
    type: "select",
    placeholder: "Select",
    options: [
      { value: "none",   label: "None" },
      { value: "door",   label: "Door" },
      { value: "custom", label: "Custom" },
    ],
    customTextOnValue: "custom",
    customTextPlaceholder: "Describe the opening…",
  },
  {
    key: "condition",
    label: "Condition",
    type: "select",
    placeholder: "Select condition",
    options: CONDITION_OPTIONS,
  },
  {
    key: "paint_condition",
    label: "Paint condition",
    type: "select",
    placeholder: "Select paint condition",
    options: [
      { value: "fresh",                 label: "Fresh" },
      { value: "faded",                 label: "Faded" },
      { value: "marked",                label: "Marked" },
      { value: "touch_up_required",     label: "Requires Touch-up" },
      { value: "full_repaint_required", label: "Requires Full Repaint" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    placeholder: "Describe damage: type, location on wall, approximate size",
    showWhen: conditionNotGood,
  },
];

export const newWallEntry = (): Record<string, unknown> => ({
  id: crypto.randomUUID(),
  which_wall: "",
  which_wall_custom: "",
  opening: "",
  opening_custom: "",
  condition: "",
  paint_condition: "",
  notes: "",
});

// ── Flooring fields ───────────────────────────────────────────────────────────

export const FLOORING_FIELDS: FieldConfig[] = [
  {
    key: "flooring_zone",
    label: "Zone",
    type: "select",
    placeholder: "Select zone",
    options: [
      { value: "entire_room",   label: "Entire room" },
      { value: "near_entrance", label: "Near entrance" },
      { value: "near_window",   label: "Near window" },
      { value: "near_bathroom", label: "Near bathroom" },
      { value: "corner_area",   label: "Corner area" },
      { value: "custom",        label: "Custom" },
    ],
    customTextOnValue: "custom",
    customTextPlaceholder: "Describe the zone…",
  },
  {
    key: "flooring_type",
    label: "Flooring type",
    type: "select",
    placeholder: "Select type",
    options: [
      { value: "vitrified_tile", label: "Vitrified tile" },
      { value: "ceramic_tile",   label: "Ceramic tile" },
      { value: "marble",         label: "Marble" },
      { value: "granite",        label: "Granite" },
      { value: "hardwood",       label: "Hardwood" },
      { value: "laminate",       label: "Laminate" },
      { value: "vinyl",          label: "Vinyl" },
      { value: "cement",         label: "Cement" },
      { value: "mosaic",         label: "Mosaic" },
      { value: "other",          label: "Other" },
    ],
  },
  {
    key: "condition",
    label: "Condition",
    type: "select",
    placeholder: "Select condition",
    options: CONDITION_OPTIONS,
  },
  {
    key: "cracked_tiles_count",
    label: "Cracked tiles count",
    type: "number",
    min: 0,
    showWhen: conditionNotGood,
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    placeholder: "Describe damage: location, number of affected tiles, staining",
    showWhen: conditionNotGood,
  },
];

export const newFlooringEntry = (): Record<string, unknown> => ({
  id: crypto.randomUUID(),
  flooring_zone: "",
  flooring_zone_custom: "",
  flooring_type: "",
  condition: "",
  cracked_tiles_count: 0,
  notes: "",
});

// ── Ceiling fields ────────────────────────────────────────────────────────────

const ceilingNotesVisible = (e: Record<string, unknown>) =>
  conditionNotGood(e) ||
  (e.seepage_dampness !== "" &&
    e.seepage_dampness !== "none" &&
    e.seepage_dampness !== undefined);

export const CEILING_FIELDS: FieldConfig[] = [
  {
    key: "ceiling_area",
    label: "Ceiling area",
    type: "select",
    placeholder: "Select area",
    options: [
      { value: "entire",       label: "Entire ceiling" },
      { value: "corner",       label: "Corner area" },
      { value: "above_window", label: "Above window" },
      { value: "centre",       label: "Centre" },
      { value: "custom",       label: "Custom" },
    ],
    customTextOnValue: "custom",
    customTextPlaceholder: "Describe the area…",
  },
  {
    key: "condition",
    label: "Condition",
    type: "select",
    placeholder: "Select condition",
    options: CONDITION_OPTIONS,
  },
  {
    key: "seepage_dampness",
    label: "Dampness",
    type: "select",
    placeholder: "Select",
    options: [
      { value: "none",            label: "None" },
      { value: "staining_dry",    label: "Staining visible (dry)" },
      { value: "active_dampness", label: "Active dampness" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    placeholder: "Describe: location, size of affected area, water source if known",
    showWhen: ceilingNotesVisible,
  },
];

export const newCeilingEntry = (): Record<string, unknown> => ({
  id: crypto.randomUUID(),
  ceiling_area: "",
  ceiling_area_custom: "",
  condition: "",
  seepage_dampness: "",
  notes: "",
});

// ── False ceiling (single object, not entry list) ─────────────────────────────

export type FalseCeilingData = {
  false_ceiling_type: "" | "none" | "partial" | "full";
  material: string;
  condition: string;
  notes: string;
};

export const DEFAULT_FALSE_CEILING: FalseCeilingData = {
  false_ceiling_type: "",
  material: "",
  condition: "",
  notes: "",
};

export const FALSE_CEILING_TYPES = [
  { value: "none",    label: "None" },
  { value: "partial", label: "Partial" },
  { value: "full",    label: "Full" },
] as const;

export const FALSE_CEILING_MATERIALS = [
  { value: "gypsum",      label: "Gypsum" },
  { value: "pop",         label: "POP" },
  { value: "wood",        label: "Wood" },
  { value: "grid_tiles",  label: "Grid + Tiles" },
  { value: "other",       label: "Other" },
] as const;

export { CONDITION_OPTIONS };
