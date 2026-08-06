/**
 * Formatting for public price-change history (PublicTimeline `price_changed`).
 *
 * Compact by default (₹48k, ₹1.25 Cr). Reuses the shared sale formatter
 * (formatSalePrice) for sale, and a compact k/L/Cr form for rent.
 *
 * Guarantee: never hide a real difference. If both compact strings collide but
 * the underlying values differ (e.g. a ₹1 change), fall back to full Indian
 * grouping for BOTH sides — ₹48,000 → ₹47,999.
 */

import { formatSalePrice } from "@/utils/property/formatSalePrice";

const LAKH = 1_00_000;
const CRORE = 1_00_00_000;

function stripZeros(n: number): string {
  return parseFloat(n.toFixed(2)).toString();
}

/** Full Indian-grouped rupees, e.g. 47999 → "₹47,999". */
function fullINR(v: number): string {
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

/** Compact rent form: ₹950 / ₹48k / ₹1.2L / ₹1.25Cr. */
function compactRent(v: number): string {
  if (v < 1000) return `₹${Math.round(v)}`;
  if (v < LAKH) return `₹${stripZeros(v / 1000)}k`;
  if (v < CRORE) return `₹${stripZeros(v / LAKH)}L`;
  return `₹${stripZeros(v / CRORE)}Cr`;
}

function compact(v: number, listingType: "rent" | "sale"): string {
  if (listingType === "sale") return formatSalePrice(v) ?? fullINR(v);
  return compactRent(v);
}

/**
 * Returns the two formatted price strings for a price-change delta. Callers
 * must have already validated that both values are finite numbers > 0.
 */
export function formatPricePair(
  from: number,
  to: number,
  listingType: "rent" | "sale",
): { from: string; to: string } {
  const cf = compact(from, listingType);
  const ct = compact(to, listingType);
  // Compact strings collide but values genuinely differ → show full for both.
  if (cf === ct && from !== to) {
    return { from: fullINR(from), to: fullINR(to) };
  }
  return { from: cf, to: ct };
}
