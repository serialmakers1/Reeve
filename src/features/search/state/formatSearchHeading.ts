import type { SearchMode } from "../domain/searchMode";
import { normalizePropertyTypes } from "../domain/propertyTypes";

/** Plural, heading-friendly labels for each property type. */
const PROPERTY_TYPE_PLURAL_LABELS: Record<string, string> = {
  apartment: "Apartments",
  villa: "Villas",
  independent_house: "Independent Houses",
  duplex_apartment: "Duplex Apartments",
  plot: "Plots / Land",
};

function titleCaseCity(city: string): string {
  return city.charAt(0).toUpperCase() + city.slice(1);
}

interface HeadingArgs {
  mode: SearchMode | null;
  city: string | null;
  /** Preferred multi-city label ("Bengaluru" / "Bengaluru +1"); wins over `city`. */
  citiesLabel?: string | null;
  propertyTypes: readonly string[];
}

/**
 * Produces the search H1 / document-title text from the search context.
 * Rules (keeps headings natural — never long comma-heavy strings):
 *  - no mode            → "Search Properties"
 *  - 0 types            → "Rental Properties [in City]" / "Properties for Sale [in City]"
 *  - 1 type             → "Apartments for Rent [in City]" / "Apartments for Sale [in City]"
 *  - 2 types            → "Apartments & Villas for Rent [in City]"
 *  - 3+ types           → falls back to the generic 0-types heading (avoids awkward lists)
 * Never emits "sale" into any public URL — this only affects display text.
 */
export function formatSearchHeading({ mode, city, citiesLabel, propertyTypes }: HeadingArgs): string {
  if (!mode) return "Search Properties";

  // Multi-city label wins (already display-cased); else the legacy single city.
  const locationLabel = citiesLabel ?? (city ? titleCaseCity(city) : null);
  const inCity = locationLabel ? ` in ${locationLabel}` : "";
  const action = mode === "buy" ? "for Sale" : "for Rent";
  const generic = mode === "buy" ? "Properties for Sale" : "Rental Properties";

  const types = normalizePropertyTypes([...propertyTypes]);
  const labels = types.map((t) => PROPERTY_TYPE_PLURAL_LABELS[t]).filter(Boolean);

  // 1 or 2 types read naturally; 3+ would be a comma-heavy string → use the generic heading.
  if (labels.length === 1) return `${labels[0]} ${action}${inCity}`;
  if (labels.length === 2) return `${labels[0]} & ${labels[1]} ${action}${inCity}`;

  return `${generic}${inCity}`;
}
