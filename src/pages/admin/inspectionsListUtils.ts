/**
 * Helpers for the admin Inspections list — kept pure so the PostgREST search
 * construction (the one piece with real injection risk) is unit-tested.
 */

/**
 * Normalize a user-entered search term into a value that is safe to embed inside
 * a double-quoted PostgREST `.or(...)` ILIKE pattern.
 *
 * - ILIKE wildcards (`%`, `_`) and PostgREST's own `*` are replaced with spaces
 *   so the input always behaves as a literal substring search.
 * - We trim AFTER neutralizing wildcards, so a wildcard-only input collapses to
 *   an empty string (→ treated as no search by buildSearchOrFilter).
 * - `\` and `"` are backslash-escaped because the value is wrapped in double
 *   quotes in the final filter; quoting makes `, . : ( )` literal.
 */
export function escapeOrValue(v: string): string {
  return v
    .replace(/[%_*]/g, ' ')
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

/**
 * Build the `.or(...)` filter string matching a term (case-insensitively) against
 * building_name, owner_name, or owner_phone. Returns null when the term is empty
 * (or wildcard-only), meaning "no search filter".
 */
export function buildSearchOrFilter(raw: string): string | null {
  const t = escapeOrValue(raw);
  if (!t) return null;
  const p = `"*${t}*"`;
  return `building_name.ilike.${p},owner_name.ilike.${p},owner_phone.ilike.${p}`;
}
