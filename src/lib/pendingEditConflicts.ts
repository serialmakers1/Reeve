/**
 * Pending-edit conflict keys (Prompt 3).
 *
 * Derives the exact live `properties` DB columns that a pending owner edit request
 * proposes to change, from the DEPLOYED Prompt-1 payload shape:
 *   payload.field_changes = { <scalar review keys>, amenities_building_add?, furnishing_detail_add? }
 * Admin Property Edit uses this to lock only the conflicting field/editor (the whole
 * amenities/furnishing editor for a pending custom delta) while leaving everything else
 * editable. `base_values` and `photo_changes` never lock live fields/photo controls.
 *
 * Pure + framework-free so it can be unit-tested directly.
 */

export interface PendingEditPayload {
  field_changes?: Record<string, unknown> | null;
  // base_values / photo_changes intentionally ignored for conflict purposes.
  [k: string]: unknown;
}

/** Custom-delta payload keys → the whole DB column/editor they conflict with. */
const DELTA_KEY_TO_COLUMN: Record<string, string> = {
  amenities_building_add: "amenities",
  furnishing_detail_add: "furnishing_detail",
};

/**
 * Return the set of live DB column keys with a pending owner-reviewed change.
 * Scalar review keys map to themselves; custom-addition deltas map to their whole
 * column. Never includes `base_values` or photo keys.
 */
export function extractPendingConflictKeys(payload: PendingEditPayload | null | undefined): Set<string> {
  const out = new Set<string>();
  const fc = payload?.field_changes;
  if (!fc || typeof fc !== "object") return out;
  for (const k of Object.keys(fc)) {
    out.add(DELTA_KEY_TO_COLUMN[k] ?? k);
  }
  return out;
}
