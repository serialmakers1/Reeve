/**
 * Location readiness for listing submission (Prompt 1 — created, NOT activated).
 *
 * The canonical location contract a property must satisfy to move draft → pending_review
 * under the new geographic model: coordinates present, a verified primary city, and a
 * building name (or an explicit "no society" allowance for house/villa/plot types).
 *
 * IMPORTANT: This is NOT wired into the submit guard in Prompt 1 — doing so would break
 * the current listing flow before the new UI writes associations. It is activated within
 * Prompt 2 as part of the complete owner-location unit. Pure + framework-free.
 */

import type { ResolvedLocation } from "@/lib/location/resolvePropertyLocation";

/** Property types where a society/building name may legitimately not exist. */
export const NO_SOCIETY_PROPERTY_TYPES: ReadonlySet<string> = new Set([
  "independent_house",
  "villa",
  "plot",
]);

export interface LocationReadiness {
  ready: boolean;
  reasons: string[]; // machine keys, e.g. "no_coordinates", "google_city_unresolved", "building_name_required"
}

export function isLocationReadyForSubmit(
  resolved: Pick<ResolvedLocation, "blockingIssues" | "building_name">,
  propertyType: string | null | undefined,
): LocationReadiness {
  const reasons: string[] = [...(resolved.blockingIssues ?? [])];

  const societyOptional = !!propertyType && NO_SOCIETY_PROPERTY_TYPES.has(propertyType);
  if (!societyOptional && !resolved.building_name?.trim()) {
    reasons.push("building_name_required");
  }

  return { ready: reasons.length === 0, reasons };
}
