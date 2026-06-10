/**
 * deriveConditions.ts — Pure functions for deriving room condition summaries
 * from room_features entry arrays and inventory.
 *
 * Consumed by:
 *   - DerivedConditionChips.tsx (display)
 *   - useConditionSnapshot.ts   (DB write at completion / export)
 *
 * No React imports. No side effects.
 */

import type { LocalRoom } from "@/types/inspection";

// ── Severity ordering ─────────────────────────────────────────────────────────

const CONDITION_RANK: Record<string, number> = {
  good:              1,
  minor_wear:        2,
  moderate_damage:   3,
  severe_damage:     4,
};

export function worstOfValues(values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  for (const v of values) {
    if (v && CONDITION_RANK[v] !== undefined) {
      if (!best || CONDITION_RANK[v] > CONDITION_RANK[best]) best = v;
    }
  }
  return best;
}

// ── Issue status → room condition mappings ────────────────────────────────────

const ELECTRICAL_STATUS_TO_CONDITION: Record<string, string> = {
  working:     "good",
  flickering:  "minor_wear",
  loose:       "moderate_damage",
  not_working: "moderate_damage",
  damaged:     "moderate_damage",
  missing:     "severe_damage",
};

const PLUMBING_STATUS_TO_CONDITION: Record<string, string> = {
  ok:          "good",
  leaking:     "minor_wear",
  slow_drain:  "minor_wear",
  blocked:     "moderate_damage",
  not_working: "moderate_damage",
  damaged:     "moderate_damage",
  missing:     "severe_damage",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function asNum(v: unknown): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

// ── Public types ──────────────────────────────────────────────────────────────

export type ChipState = {
  key:          string;        // "walls", "flooring", etc.
  label:        string;        // "Walls", "Flooring", etc.
  condition:    string | null; // null when not assessed
  displayLabel: string;        // "Not Assessed", "Good Condition", etc.
  isAssessed:   boolean;
};

export const CONDITION_DISPLAY: Record<string, string> = {
  good:              "Good Condition",
  minor_wear:        "Fair — Normal Wear",
  moderate_damage:   "Poor — Needs Repair",
  severe_damage:     "Critical — Needs Replacement",
};

export type DerivedConditions = {
  walls:        ChipState;
  flooring:     ChipState;
  ceiling:      ChipState;
  doorsWindows: ChipState;
  electrical:   ChipState;
  plumbing:     ChipState;
  paintCondition: string | null; // worst paint_condition from wall_entries
};

// ── makeChip ──────────────────────────────────────────────────────────────────

function makeChip(
  key: string,
  label: string,
  isAssessed: boolean,
  worst: string | null,
): ChipState {
  if (!isAssessed) {
    return { key, label, condition: null, displayLabel: "Not Assessed", isAssessed: false };
  }
  // Assessed with no recorded issues → good
  const condition = worst ?? "good";
  return {
    key,
    label,
    condition,
    displayLabel: CONDITION_DISPLAY[condition] ?? condition,
    isAssessed: true,
  };
}

// ── deriveConditions ──────────────────────────────────────────────────────────

export function deriveConditions(room: LocalRoom): DerivedConditions {
  const rf = (room.room_features as Record<string, unknown>) ?? {};

  // Walls
  const wallEntries = asArray(rf.wall_entries);
  const wallsWorst = worstOfValues(wallEntries.map((e) => e.condition as string));

  // Flooring
  const floorEntries = asArray(rf.flooring_entries);
  const flooringWorst = worstOfValues(floorEntries.map((e) => e.condition as string));

  // Ceiling — regular entries PLUS false ceiling (if active)
  const ceilEntries = asArray(rf.ceiling_entries);
  const falseCeiling = (rf.false_ceiling as Record<string, unknown> | null) ?? null;
  const falseCeilingActive =
    falseCeiling !== null &&
    falseCeiling.false_ceiling_type !== "none" &&
    falseCeiling.false_ceiling_type !== "" &&
    falseCeiling.false_ceiling_type !== undefined;
  const ceilingCondValues: (string | null | undefined)[] = [
    ...ceilEntries.map((e) => e.condition as string),
    ...(falseCeilingActive && falseCeiling ? [falseCeiling.condition as string] : []),
  ];
  const ceilingAssessed = ceilEntries.length > 0 || falseCeilingActive;
  const ceilingWorst = worstOfValues(ceilingCondValues);

  // Doors & Windows — worst of frame_condition and shutter_condition across all entries
  const dwEntries = asArray(rf.door_window_entries);
  const dwCondValues = dwEntries.flatMap((e) => [
    e.frame_condition as string,
    e.shutter_condition as string,
  ]);
  const dwWorst = worstOfValues(dwCondValues);

  // Electrical — issues use `.status`, mapped to condition enum
  const elIssues = asArray(rf.electrical_issues);
  const elInventoryFilled =
    asNum(rf.electrical_fan_count) > 0 ||
    asNum(rf.electrical_light_count) > 0 ||
    asNum(rf.electrical_switchboard_count) > 0 ||
    asNum(rf.electrical_ac_provision_count) > 0;
  const elAssessed = elInventoryFilled || elIssues.length > 0;
  const elCondValues = elIssues
    .map((e) => ELECTRICAL_STATUS_TO_CONDITION[e.status as string] ?? null)
    .filter(Boolean) as string[];
  // If issues exist, derive worst; otherwise null (makeChip will default to "good" when assessed)
  const elWorst = elIssues.length > 0 ? worstOfValues(elCondValues) : null;

  // Plumbing — issues use `.status`, mapped to condition enum
  const plIssues = asArray(rf.plumbing_issues);
  const plInventoryFilled = asNum(rf.plumbing_tap_count) > 0;
  const plAssessed = plInventoryFilled || plIssues.length > 0;
  const plCondValues = plIssues
    .map((e) => PLUMBING_STATUS_TO_CONDITION[e.status as string] ?? null)
    .filter(Boolean) as string[];
  const plWorst = plIssues.length > 0 ? worstOfValues(plCondValues) : null;

  // Paint condition — worst paint_condition across all wall entries
  const PAINT_RANK: Record<string, number> = {
    fresh: 1, faded: 2, marked: 3, touch_up_required: 4, full_repaint_required: 5,
  };
  const paintWorst = wallEntries.reduce<string | null>((worst, e) => {
    const v = e.paint_condition as string | null | undefined;
    if (!v || !PAINT_RANK[v]) return worst;
    if (!worst || PAINT_RANK[v] > PAINT_RANK[worst]) return v;
    return worst;
  }, null);

  return {
    walls:        makeChip("walls",         "Walls",           wallEntries.length > 0, wallsWorst),
    flooring:     makeChip("flooring",      "Flooring",        floorEntries.length > 0, flooringWorst),
    ceiling:      makeChip("ceiling",       "Ceiling",         ceilingAssessed,        ceilingWorst),
    doorsWindows: makeChip("doors_windows", "Doors & Windows", dwEntries.length > 0,   dwWorst),
    electrical:   makeChip("electrical",    "Electrical",      elAssessed,             elWorst),
    plumbing:     makeChip("plumbing",      "Plumbing",        plAssessed,             plWorst),
    paintCondition: paintWorst,
  };
}

// ── concatenateEntryNotes ─────────────────────────────────────────────────────

/**
 * Collect non-empty notes from an entry array, formatted as
 * "<location_label>: <notes>" joined with " | ".
 * Returns null if no entry has notes (caller preserves existing DB value via ??).
 *
 * @param entries     - The array of entry objects (e.g. wall_entries).
 * @param locationKey - The field key that identifies the location (e.g. "which_wall").
 * @param locationLabels - Optional human-readable map for location values.
 */
export function concatenateEntryNotes(
  entries: unknown,
  locationKey: string,
  locationLabels?: Record<string, string>,
): string | null {
  const arr = asArray(entries);
  const parts: string[] = [];
  for (const e of arr) {
    const notes = typeof e.notes === "string" ? e.notes.trim() : "";
    if (!notes) continue;
    const rawLoc = (e[locationKey] as string | undefined) ?? "";
    const loc = (locationLabels && rawLoc && locationLabels[rawLoc]) || rawLoc;
    parts.push(loc ? `${loc}: ${notes}` : notes);
  }
  return parts.length > 0 ? parts.join(" | ") : null;
}
