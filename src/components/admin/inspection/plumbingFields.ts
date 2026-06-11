/**
 * plumbingFields.ts — Inventory type + defaults, and issue FieldConfig array
 * for the Plumbing subsection inside Room Features.
 *
 * Two distinct parts:
 *   1. Inventory — compact always-visible form, stored as flat namespaced keys
 *      in room_features JSONB (plumbing_tap_count, plumbing_shower_present,
 *      plumbing_hot_cold_mixer). These are NEW fields — no room-type branch
 *      duplicates to remove.
 *   2. Issues — EntryList for faults/leaks/blockages. Starts empty.
 *
 * All per-room plumbing specifics (geyser, flush, bathroom sink, kitchen sink,
 * utility sink) remain in their room-type-specific branches — unchanged.
 *
 * Do not import from InspectionForm or other page-level files.
 */
import type { FieldConfig } from "./EntryList";

// ── Inventory ─────────────────────────────────────────────────────────────────

export type PlumbingInventory = {
  plumbing_tap_count: number;
  plumbing_shower_present: string;
  plumbing_hot_cold_mixer: string;
};

export const DEFAULT_PLUMBING_INVENTORY: PlumbingInventory = {
  plumbing_tap_count: 0,
  plumbing_shower_present: "",
  plumbing_hot_cold_mixer: "",
};

export const SHOWER_PRESENT_OPTIONS = [
  { value: "none",     label: "None" },
  { value: "overhead", label: "Overhead only" },
  { value: "handheld", label: "Handheld only" },
  { value: "both",     label: "Both overhead + handheld" },
] as const;

export const HOT_COLD_MIXER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no",  label: "No" },
] as const;

// ── Issue fields ──────────────────────────────────────────────────────────────

export const PLUMBING_ISSUE_FIELDS: FieldConfig[] = [
  {
    key: "item",
    label: "Item",
    type: "select",
    placeholder: "Select item",
    options: [
      { value: "tap",          label: "Tap / faucet" },
      { value: "pipe_joint",   label: "Pipe / joint" },
      { value: "drain",        label: "Drain" },
      { value: "flush",        label: "Flush mechanism" },
      { value: "geyser",       label: "Geyser / water heater" },
      { value: "sink",         label: "Sink / basin" },
      { value: "shower",       label: "Shower" },
      { value: "water_supply", label: "Water supply point" },
      { value: "other",        label: "Other" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    placeholder: "Select status",
    options: [
      { value: "ok",           label: "OK" },
      { value: "leaking",      label: "Leaking / dripping" },
      { value: "slow_drain",   label: "Slow drain" },
      { value: "low_pressure", label: "Low Pressure" },
      { value: "blocked",      label: "Blocked / not draining" },
      { value: "not_working",  label: "Not working" },
      { value: "damaged",      label: "Damaged" },
      { value: "missing",      label: "Missing" },
      { value: "other",        label: "Other" },
    ],
    customTextOnValue: "other",
    customTextPlaceholder: "Describe the issue…",
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    placeholder: "Describe: location, severity, visible water damage or staining",
    showWhen: (e) =>
      e.status !== "" && e.status !== "ok" && e.status !== undefined,
  },
];

// ── Issue entry factory ───────────────────────────────────────────────────────

export const newPlumbingIssueEntry = (): Record<string, unknown> => ({
  id: crypto.randomUUID(),
  item: "",
  status: "",
  notes: "",
  is_custom: false,
  custom_label: "",
});

// ── Issue entry title ─────────────────────────────────────────────────────────

const ITEM_LABELS: Record<string, string> = {
  tap:          "Tap / faucet",
  pipe_joint:   "Pipe / joint",
  drain:        "Drain",
  flush:        "Flush mechanism",
  geyser:       "Geyser",
  sink:         "Sink / basin",
  shower:       "Shower",
  water_supply: "Water supply point",
  other:        "Other",
};

export const plumbingIssueTitle = (
  entry: Record<string, unknown>,
  index: number,
): string => {
  if (entry.is_custom) return String(entry.custom_label || `Issue ${index + 1}`);
  return ITEM_LABELS[entry.item as string] ?? `Issue ${index + 1}`;
};
