/**
 * doorWindowFields.ts — FieldConfig arrays and default entry factories for
 * doors and windows.
 *
 * Consumed by DoorsWindowsSubsection via EntryList.
 * Each door / window is documented as a separate entry with its own condition.
 * Do not import from InspectionForm or other page-level files.
 */
import type { FieldConfig } from "./EntryList";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Item types that can have glass panels */
const GLASS_ITEM_TYPES = new Set([
  "window",
  "sliding_door",
  "french_door",
  "balcony_door",
]);

// ── Shared condition options ───────────────────────────────────────────────────

const CONDITION_OPTIONS = [
  { value: "good",            label: "Good Condition" },
  { value: "minor_wear",      label: "Fair — Normal Wear" },
  { value: "moderate_damage", label: "Poor — Needs Repair" },
  { value: "severe_damage",   label: "Critical — Needs Replacement" },
];

// ── showWhen helpers ──────────────────────────────────────────────────────────

const isGlassType = (e: Record<string, unknown>) =>
  GLASS_ITEM_TYPES.has(e.item_type as string);

const notGoodOrDefault = (key: string, defaultGood: string) =>
  (e: Record<string, unknown>) => {
    const v = e[key];
    return v !== "" && v !== defaultGood && v !== undefined;
  };

const notesVisible = (e: Record<string, unknown>) =>
  notGoodOrDefault("frame_condition", "good")(e) ||
  notGoodOrDefault("shutter_condition", "good")(e) ||
  (e.lock_latch !== "" && e.lock_latch !== "working" && e.lock_latch !== undefined) ||
  (["cracked", "broken"].includes(e.glass_condition as string)) ||
  (["present_torn", "missing"].includes(e.mosquito_mesh as string));

// ── Field config ──────────────────────────────────────────────────────────────

export const DOOR_WINDOW_FIELDS: FieldConfig[] = [
  {
    key: "item_type",
    label: "Type",
    type: "select",
    placeholder: "Select type",
    options: [
      { value: "main_door",     label: "Main door" },
      { value: "room_door",     label: "Room door" },
      { value: "bathroom_door", label: "Bathroom door" },
      { value: "window",        label: "Window" },
      { value: "sliding_door",  label: "Sliding door" },
      { value: "french_door",   label: "French door" },
      { value: "balcony_door",  label: "Balcony door" },
    ],
  },
  {
    key: "frame_condition",
    label: "Frame condition",
    type: "select",
    placeholder: "Select condition",
    options: CONDITION_OPTIONS,
  },
  {
    key: "shutter_condition",
    label: "Shutter / panel condition",
    type: "select",
    placeholder: "Select condition",
    options: CONDITION_OPTIONS,
  },
  {
    key: "lock_latch",
    label: "Lock / latch",
    type: "select",
    placeholder: "Select",
    options: [
      { value: "working", label: "Working" },
      { value: "stiff",   label: "Stiff — hard to operate" },
      { value: "broken",  label: "Broken" },
      { value: "missing", label: "Missing" },
    ],
  },
  {
    key: "glass_condition",
    label: "Glass condition",
    type: "select",
    placeholder: "Select condition",
    options: [
      { value: "clear",     label: "Clear — no damage" },
      { value: "scratched", label: "Scratched" },
      { value: "cracked",   label: "Cracked" },
      { value: "broken",    label: "Broken / missing pane" },
    ],
    showWhen: isGlassType,
  },
  {
    key: "mosquito_mesh",
    label: "Mosquito mesh",
    type: "select",
    placeholder: "Select",
    options: [
      { value: "none",           label: "None" },
      { value: "present_intact", label: "Present — intact" },
      { value: "present_torn",   label: "Present — torn" },
      { value: "missing",        label: "Missing (was present)" },
    ],
    showWhen: isGlassType,
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    placeholder: "Describe: sticking, warping, rust, paint peeling, broken hardware",
    showWhen: notesVisible,
  },
];

// ── Entry factories ───────────────────────────────────────────────────────────

export const newDoorWindowEntry = (): Record<string, unknown> => ({
  id: crypto.randomUUID(),
  item_type: "",
  frame_condition: "",
  shutter_condition: "",
  lock_latch: "",
  glass_condition: "",
  mosquito_mesh: "",
  notes: "",
  is_custom: false,
  custom_label: "",
});

export const newCustomDoorWindowEntry = (): Record<string, unknown> => ({
  ...newDoorWindowEntry(),
  is_custom: true,
});

// ── Entry title helper ────────────────────────────────────────────────────────

const ITEM_TYPE_LABELS: Record<string, string> = {
  main_door:     "Main door",
  room_door:     "Room door",
  bathroom_door: "Bathroom door",
  window:        "Window",
  sliding_door:  "Sliding door",
  french_door:   "French door",
  balcony_door:  "Balcony door",
};

export const doorWindowEntryTitle = (
  entry: Record<string, unknown>,
  index: number,
): string => {
  if (entry.is_custom) return String(entry.custom_label || `Item ${index + 1}`);
  return ITEM_TYPE_LABELS[entry.item_type as string] ?? `Item ${index + 1}`;
};
