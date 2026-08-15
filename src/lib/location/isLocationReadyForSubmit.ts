/**
 * Location readiness for listing submission (Prompt 1 — created; wired in Prompt 3 P2).
 *
 * The canonical location contract a property must satisfy to move draft → pending_review under
 * the new geographic model: coordinates present, a verified location, and a building name when the
 * property type requires one. The DB trigger `enforce_property_owner_transitions` is authoritative;
 * this pure helper mirrors it for UX gating only.
 *
 * Building-name requirement is the SINGLE authoritative rule for Phase 3: required ONLY for
 * apartment / duplex_apartment. This MUST stay in sync with the M1 migration FINAL_OK/LEGACY_OK
 * building check (supabase/migrations/*_phase3_owner_submit_final_location_invariant.sql).
 * Pure + framework-free.
 */

import type { ResolvedLocation } from "@/lib/location/resolvePropertyLocation";

/** Property types that require a building / society name. Everything else may omit it. */
export const BUILDING_REQUIRED_TYPES: ReadonlySet<string> = new Set([
  "apartment",
  "duplex_apartment",
]);

/** Single source of truth for "does this property type require a building/society name?". */
export function isBuildingNameRequired(propertyType: string | null | undefined): boolean {
  return !!propertyType && BUILDING_REQUIRED_TYPES.has(propertyType);
}

export interface LocationReadiness {
  ready: boolean;
  reasons: string[]; // machine keys, e.g. "no_coordinates", "google_city_unresolved", "building_name_required"
}

export function isLocationReadyForSubmit(
  resolved: Pick<ResolvedLocation, "blockingIssues" | "building_name">,
  propertyType: string | null | undefined,
): LocationReadiness {
  const reasons: string[] = [...(resolved.blockingIssues ?? [])];

  if (isBuildingNameRequired(propertyType) && !resolved.building_name?.trim()) {
    reasons.push("building_name_required");
  }

  return { ready: reasons.length === 0, reasons };
}
