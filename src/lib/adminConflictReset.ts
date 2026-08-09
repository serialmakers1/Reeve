/**
 * Admin Property Edit — live-value reset for newly-appeared owner-edit conflicts (Prompt 4).
 *
 * When an owner submits a reviewable edit in the window between the admin opening
 * PropertyEdit and pressing Save, that column becomes a fresh conflict. Before the field
 * is locked read-only it MUST be reset to the authoritative live DB value — otherwise the
 * lock would display the admin's un-persisted typed value as if it were saved.
 *
 * This derives, from a freshly-refetched `properties` row, the exact field values to reset
 * for the given conflicting DB columns. Pure + framework-free so the mapping is unit-tested
 * directly; the component applies the result via its state setters and touches nothing else.
 *
 * Keys mirror `extractPendingConflictKeys` output: scalar columns map to themselves, plus the
 * two structured columns `amenities` (→ building amenities array) and `furnishing_detail`.
 */

// Loosely typed to avoid coupling to the generated Supabase row type.
export type LiveConflictRow = Record<string, unknown>;

export interface ConflictFieldResets {
  bhk?: string;
  propertyType?: string;
  reraRegistrationNumber?: string;
  youtubeWalkthroughUrl?: string;
  parkingNotes?: string;
  buildingRules?: string;
  buildingNotes?: string;
  buildingAmenities?: string[];
  furnishingDetail?: unknown[];
}

const str = (v: unknown, fallback = ""): string => (typeof v === "string" && v.length > 0 ? v : fallback);

/**
 * Return the reset values for exactly the conflicting columns present in `keys`.
 * Unlisted keys are omitted so the caller never disturbs unrelated fields.
 */
export function deriveConflictFieldResets(
  keys: Iterable<string>,
  liveRow: LiveConflictRow,
): ConflictFieldResets {
  const out: ConflictFieldResets = {};
  for (const k of keys) {
    switch (k) {
      case "bhk":
        out.bhk = str(liveRow.bhk);
        break;
      case "property_type":
        out.propertyType = str(liveRow.property_type, "apartment");
        break;
      case "rera_registration_number":
        out.reraRegistrationNumber = str(liveRow.rera_registration_number);
        break;
      case "youtube_walkthrough_url":
        out.youtubeWalkthroughUrl = str(liveRow.youtube_walkthrough_url);
        break;
      case "parking_notes":
        out.parkingNotes = str(liveRow.parking_notes);
        break;
      case "building_rules":
        out.buildingRules = str(liveRow.building_rules);
        break;
      case "building_notes":
        out.buildingNotes = str(liveRow.building_notes);
        break;
      case "amenities": {
        const am = (liveRow.amenities as Record<string, unknown>) || {};
        out.buildingAmenities = Array.isArray(am.building) ? (am.building as string[]) : [];
        break;
      }
      case "furnishing_detail":
        out.furnishingDetail = Array.isArray(liveRow.furnishing_detail)
          ? (liveRow.furnishing_detail as unknown[])
          : [];
        break;
      // Unknown/other keys: nothing to reset (they aren't editable conflict fields here).
    }
  }
  return out;
}
