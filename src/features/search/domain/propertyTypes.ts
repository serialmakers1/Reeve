import { PROPERTY_TYPE_VALUES } from "./searchConstants";

/**
 * Canonical normalizer for the multi-select property-type array.
 * - Drops values not in PROPERTY_TYPE_VALUES.
 * - Deduplicates.
 * - Orders deterministically by PROPERTY_TYPE_VALUES order (so URL/search-key output
 *   is stable regardless of click order).
 * Empty result means "all property types" (no filter).
 */
export function normalizePropertyTypes(values: readonly string[]): string[] {
  const valid = new Set<string>(PROPERTY_TYPE_VALUES as readonly string[]);
  const present = new Set<string>();
  for (const v of values) {
    if (valid.has(v)) present.add(v);
  }
  return (PROPERTY_TYPE_VALUES as readonly string[]).filter((v) => present.has(v));
}

/**
 * Serializes the normalized array to the deterministic CSV string sent to the RPCs
 * and written to the URL. Empty array → null (no property-type filter).
 */
export function propertyTypesToCsv(values: readonly string[]): string | null {
  const norm = normalizePropertyTypes(values);
  return norm.length > 0 ? norm.join(",") : null;
}
