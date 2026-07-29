import type { SearchState } from "../domain/searchTypes";

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Contextual result-header label. Cursor pagination has no total, so N is the
 * loaded count with a "+" when more pages exist. No query is issued for this.
 *
 * - areas present → "N homes in {first area}" (+ " +k areas" when multiple)
 * - city, no areas → "N homes in {City}"
 * - no city → "Homes across India"
 */
export function resultHeaderLabel(
  state: SearchState,
  loadedCount: number,
  hasNextPage: boolean,
): string {
  const { city, locations } = state.context;
  const count = `${loadedCount}${hasNextPage ? "+" : ""}`;
  const plural = loadedCount === 1 && !hasNextPage ? "home" : "homes";

  if (locations.length > 0) {
    const suffix = locations.length > 1 ? ` +${locations.length - 1} areas` : "";
    return `${count} ${plural} in ${locations[0].label}${suffix}`;
  }
  if (city) {
    return `${count} ${plural} in ${titleCase(city)}`;
  }
  return "Homes across India";
}
