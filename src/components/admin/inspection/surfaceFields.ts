/**
 * surfaceFields.ts — FieldConfig arrays and default entry factories for
 * wall, flooring, ceiling, and false-ceiling surfaces.
 *
 * These are consumed by SurfacesSubsection via EntryList.
 * Do not import from InspectionForm or other page-level files.
 */
import type { FieldConfig } from "./EntryList";

// ── Shared condition options (matches ROOM_CONDITION_OPTIONS in inspection.ts) ─

const CONDITION_OPTIONS = [
  { value: "good",            label: "Good Condition" },
  { value: "minor_wear",      label: "Fair — Normal Wear" },
  { value: "moderate_damage", label: "Poor — Needs Repair" },
  { value: "severe_damage",   label: "Critical — Needs Replacement" },
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
      { value: "road_facing",      label: "Road-facing wall" },
      { value: "building_facing",  label: "Building-facing wall" },
      { value: "left_wall",        label: "Left wall (as you enter)" },
      { value: "right_wall",       label: "Right wall (as you enter)" },
      { value: "all_walls",        label: "All walls" },
      { value: "partition_wall",   label: "Partition wall" },
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
  condition: "",
  paint_condition: "",
  notes: "",
  is_custom: false,
  custom_label: "",
});

export const newCustomWallEntry = (): Record<string, unknown> => ({
  ...newWallEntry(),
  is_custom: true,
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
    ],
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
  flooring_type: "",
  condition: "",
  cracked_tiles_count: 0,
  notes: "",
  is_custom: false,
  custom_label: "",
});

export const newCustomFlooringEntry = (): Record<string, unknown> => ({
  ...newFlooringEntry(),
  is_custom: true,
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
      { value: "entire_ceiling",        label: "Entire ceiling" },
      { value: "above_bed_area",        label: "Above bed area" },
      { value: "above_kitchen_slab",    label: "Above kitchen slab" },
      { value: "above_bathroom_area",   label: "Above bathroom area" },
      { value: "corner_area",           label: "Corner area" },
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
    key: "seepage_dampness",
    label: "Seepage / dampness",
    type: "select",
    placeholder: "Select",
    options: [
      { value: "none",              label: "None" },
      { value: "staining_dry",      label: "Staining visible (dry)" },
      { value: "active_dampness",   label: "Active dampness" },
      { value: "seepage_suspected", label: "Seepage suspected" },
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
  condition: "",
  seepage_dampness: "",
  notes: "",
  is_custom: false,
  custom_label: "",
});

export const newCustomCeilingEntry = (): Record<string, unknown> => ({
  ...newCeilingEntry(),
  is_custom: true,
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
