import type { SearchState } from "../domain/searchTypes";
import { formatCitiesLabel } from "./searchStateUtils";

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Contextual result-header label. Uses the exact total_count from the v2 RPC
 * (Prompt 3) — no "+", stable across pages, unaffected by map viewport.
 *
 * - areas present → "N homes in {first area}" (+ " +k areas" when multiple)
 * - city, no areas → "N homes in {City}"
 * - no city → "Homes across India"
 */
export function resultHeaderLabel(
  state: SearchState,
  totalCount: number,
): string {
  const { city, cities, locations } = state.context;
  const count = `${totalCount}`;
  const plural = totalCount === 1 ? "home" : "homes";

  if (locations.length > 0) {
    const suffix = locations.length > 1 ? ` +${locations.length - 1} areas` : "";
    return `${count} ${plural} in ${locations[0].label}${suffix}`;
  }
  // Multi-city aware: "Bengaluru" / "Bengaluru +1" — never collapse to the first city.
  const citiesLabel = formatCitiesLabel(cities);
  if (citiesLabel) {
    return `${count} ${plural} in ${citiesLabel}`;
  }
  if (city) {
    return `${count} ${plural} in ${titleCase(city)}`;
  }
  return "Homes across India";
}
