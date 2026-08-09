/**
 * Building-result eligibility (Prompt 2).
 *
 * The "Building / Society" search (Path A) must accept genuine building/property
 * results only and reject clearly geographic/address-only results (locality, city,
 * route/street, postal code, admin areas). Uses the Places API (New) prediction
 * `types` array. Pure + framework-free so it can be unit-tested directly.
 */

/** Place types that describe an area/street/region rather than a specific building. */
const GEOGRAPHIC_ONLY_TYPES: ReadonlySet<string> = new Set([
  "locality",
  "sublocality",
  "sublocality_level_1", "sublocality_level_2", "sublocality_level_3",
  "sublocality_level_4", "sublocality_level_5",
  "neighborhood",
  "colloquial_area",
  "route",
  "street_address",
  "street_number",
  "intersection",
  "postal_code", "postal_code_prefix", "postal_code_suffix",
  "postal_town",
  "administrative_area_level_1", "administrative_area_level_2",
  "administrative_area_level_3", "administrative_area_level_4",
  "administrative_area_level_5", "administrative_area_level_6", "administrative_area_level_7",
  "country",
  "political",
  "plus_code",
]);

/**
 * True when the prediction plausibly refers to a building/premise/POI, not a bare
 * area or street. Rule: reject only when `types` is non-empty AND every type is a
 * geographic/address-only type. Unknown/empty types → accept (fail-open for the
 * building path so legitimate results are never silently dropped).
 */
export function isBuildingResult(types: readonly string[] | null | undefined): boolean {
  if (!types || types.length === 0) return true;
  return types.some((t) => !GEOGRAPHIC_ONLY_TYPES.has(t));
}
