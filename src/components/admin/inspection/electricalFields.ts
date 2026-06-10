/**
 * electricalFields.ts — Inventory type + defaults, and issue FieldConfig array
 * for the Electrical subsection inside Room Features.
 *
 * Two distinct parts:
 *   1. Inventory — compact always-visible form, stored as flat namespaced keys
 *      in room_features JSONB (e.g. room_features.electrical_fan_count).
 *   2. Issues — EntryList for faults/problems. Starts empty.
 *
 * Namespaced keys (electrical_*) avoid collision with legacy flat keys like
 * fan_count that may still exist in old inspection JSONB blobs.
 *
 * Do not import from InspectionForm or other page-level files.
 */
import type { FieldConfig } from "./EntryList";

// ── Inventory ─────────────────────────────────────────────────────────────────

export type ElectricalInventory = {
  electrical_fan_count: number;
  electrical_fan_brand: string;
  electrical_light_count: number;
  electrical_switchboard_count: number;
  electrical_ac_provision_count: number;
  // Detail fields migrated from per-room-type branches (Prompt 6)
  electrical_light_brand: string;
  electrical_light_type: string;
  electrical_switchboard_brand: string;
  electrical_wifi_point: string;
  electrical_wifi_brand: string;
};

export const DEFAULT_ELECTRICAL_INVENTORY: ElectricalInventory = {
  electrical_fan_count: 0,
  electrical_fan_brand: "",
  electrical_light_count: 0,
  electrical_switchboard_count: 0,
  electrical_ac_provision_count: 0,
  electrical_light_brand: "",
  electrical_light_type: "",
  electrical_switchboard_brand: "",
  electrical_wifi_point: "",
  electrical_wifi_brand: "",
};

// ── Issue fields ──────────────────────────────────────────────────────────────

export const ELECTRICAL_ISSUE_FIELDS: FieldConfig[] = [
  {
    key: "item",
    label: "Item",
    type: "select",
    placeholder: "Select item",
    options: [
      { value: "fan",          label: "Ceiling fan" },
      { value: "light",        label: "Light fixture" },
      { value: "switchboard",  label: "Switchboard" },
      { value: "mcb_db",       label: "MCB / DB box" },
      { value: "ac_point",     label: "AC point" },
      { value: "exhaust_fan",  label: "Exhaust fan" },
      { value: "geyser_point", label: "Geyser point" },
      { value: "socket",       label: "Socket / power point" },
      { value: "other",        label: "Other" },
    ],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    placeholder: "Select status",
    options: [
      { value: "working",     label: "Working" },
      { value: "not_working", label: "Not working" },
      { value: "flickering",  label: "Flickering" },
      { value: "damaged",     label: "Damaged" },
      { value: "loose",       label: "Loose / unsafe" },
      { value: "missing",     label: "Missing" },
    ],
  },
  {
    key: "notes",
    label: "Notes",
    type: "textarea",
    placeholder: "Describe: location in room, type of damage, safety concern",
    showWhen: (e) =>
      e.status !== "" && e.status !== "working" && e.status !== undefined,
  },
];

// ── Issue entry factory ───────────────────────────────────────────────────────

export const newElectricalIssueEntry = (): Record<string, unknown> => ({
  id: crypto.randomUUID(),
  item: "",
  status: "",
  notes: "",
  is_custom: false,
  custom_label: "",
});

// ── Issue entry title ─────────────────────────────────────────────────────────

const ITEM_LABELS: Record<string, string> = {
  fan:          "Ceiling fan",
  light:        "Light fixture",
  switchboard:  "Switchboard",
  mcb_db:       "MCB / DB box",
  ac_point:     "AC point",
  exhaust_fan:  "Exhaust fan",
  geyser_point: "Geyser point",
  socket:       "Socket",
  other:        "Other",
};

export const electricalIssueTitle = (
  entry: Record<string, unknown>,
  index: number,
): string => {
  if (entry.is_custom) return String(entry.custom_label || `Issue ${index + 1}`);
  return ITEM_LABELS[entry.item as string] ?? `Issue ${index + 1}`;
};
