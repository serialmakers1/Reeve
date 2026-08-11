/**
 * Shared display fallback for a property's building/location line (Prompt 4).
 *
 * `building_name` is nullable (Prompt 2 — Google may resolve geography without a
 * credible building, and the owner may leave it blank for house/villa/plot). Surfaces
 * that render the building name must never show a blank/broken line — fall back to the
 * locality, then the city, then a generic label. Never surfaces private flat/unit data.
 */
export function formatBuildingLine(
  p: { building_name?: string | null; locality?: string | null; city?: string | null },
  fallback = "this property",
): string {
  return (
    p.building_name?.trim() ||
    p.locality?.trim() ||
    p.city?.trim() ||
    fallback
  );
}
