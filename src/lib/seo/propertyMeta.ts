/**
 * src/lib/seo/propertyMeta.ts
 *
 * Pure (no DOM / no Node) helpers for Property Detail SEO. Shared by the edge
 * handler (`api/property.ts`) and the dynamic sitemap (`api/sitemap-properties.ts`).
 * The client does NOT import this module — SEO is edge-authoritative.
 *
 * Single source of truth for:
 *   - the minimum-safe SEO field shape,
 *   - the normalized-presence check,
 *   - the complete-record indexability gate (Building + Locality + City +
 *     recognized listing_type + matching price),
 *   - title / description / canonical composition,
 *   - the edge-only HTML-escape helper.
 *
 * HTTP lifecycle (200/404/5xx) and public-vs-private (RLS) are decided by the
 * edge handler, not here. No status predicate, no OG builder, no JSON-LD.
 */

export interface PropertySeoRow {
  listing_type: string | null;
  building_name: string | null;
  locality: string | null;
  city: string | null;
  listed_rent: number | null;
  sale_price: number | null;
}

/** Generic (incomplete public record) fallbacks — never a partial composed title. */
export const GATE_FAIL_TITLE = "Property Listing | Reeve";
export const GATE_FAIL_DESCRIPTION = "View this property on Reeve.";
/** Non-public / nonexistent / malformed. */
export const UNAVAILABLE_TITLE = "This listing is no longer available | Reeve";

/** A field "is present" only when non-null and, after trim, non-empty. */
export function isPresent(v: unknown): boolean {
  return v != null && String(v).trim() !== "";
}

function t(v: string | null | undefined): string {
  return (v ?? "").trim();
}

/** Recognized rent/sale word, or null for an unrecognized/absent listing_type. */
export function listingWord(row: PropertySeoRow): "Rent" | "Sale" | null {
  if (row.listing_type === "rent") return "Rent";
  if (row.listing_type === "sale") return "Sale";
  return null;
}

/** The current price for the listing_type in effect (>0), or null. */
export function priceValue(row: PropertySeoRow): number | null {
  const w = listingWord(row);
  if (w === "Rent") {
    return typeof row.listed_rent === "number" && row.listed_rent > 0 ? row.listed_rent : null;
  }
  if (w === "Sale") {
    return typeof row.sale_price === "number" && row.sale_price > 0 ? row.sale_price : null;
  }
  return null;
}

/**
 * Complete-record indexability gate. A public PDP is index,follow + sitemap-eligible
 * ONLY when the whole minimal record is valid.
 */
export function passesIndexabilityGate(row: PropertySeoRow): boolean {
  return (
    isPresent(row.building_name) &&
    isPresent(row.locality) &&
    isPresent(row.city) &&
    listingWord(row) !== null &&
    priceValue(row) !== null
  );
}

/** Indian-grouped rupee formatting (deterministic; no Intl dependency). */
export function formatINR(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return "₹" + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return "₹" + grouped + "," + last3;
}

/** Price text for the crawler body / OG (rent shows /month). Gate-passing rows only. */
export function priceText(row: PropertySeoRow): string {
  const w = listingWord(row);
  const p = priceValue(row);
  if (w == null || p == null) return "";
  return w === "Rent" ? `${formatINR(p)}/month` : formatINR(p);
}

/** `<Building> for Rent|Sale in <Locality>, <City> | Reeve` — gate-passing rows only. */
export function buildPropertyTitle(row: PropertySeoRow): string {
  const w = listingWord(row);
  return `${t(row.building_name)} for ${w} in ${t(row.locality)}, ${t(row.city)} | Reeve`;
}

/** OG title = the property title without the ` | Reeve` suffix. */
export function buildOgTitle(row: PropertySeoRow): string {
  const w = listingWord(row);
  return `${t(row.building_name)} for ${w} in ${t(row.locality)}, ${t(row.city)}`;
}

/** Meta description (no price — snippets lag volatile fields). Gate-passing rows only. */
export function buildPropertyDescription(row: PropertySeoRow): string {
  const w = (listingWord(row) ?? "").toLowerCase();
  return `${t(row.building_name)} for ${w} in ${t(row.locality)}, ${t(row.city)} — view this property on Reeve.`;
}

/** OG description = price-led, no building-name repeat. Gate-passing rows only. */
export function buildOgDescription(row: PropertySeoRow): string {
  return `${priceText(row)} · View this property on Reeve`;
}

/** Absolute self-canonical on the www host. */
export function buildPropertyCanonical(id: string): string {
  return `https://www.reeve.in/property/${id}`;
}

/**
 * HTML-escape for values interpolated into element text, attributes, or the
 * `data-pdp-base` carrier. Used by the edge serializer (client uses the DOM).
 */
export function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
