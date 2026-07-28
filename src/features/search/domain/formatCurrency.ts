/** Verbatim from src/pages/Search.tsx:128-135 — do not change logic. */
export function formatIndianRupee(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return "₹" + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return "₹" + formatted + "," + last3;
}

/** Compact form for Map markers and filter chips. */
export function formatPriceShort(n: number): string {
  if (n >= 1_00_00_000)
    return "₹" + (n / 1_00_00_000).toFixed(1).replace(/\.0$/, "") + "Cr";
  if (n >= 1_00_000)
    return "₹" + (n / 1_00_000).toFixed(1).replace(/\.0$/, "") + "L";
  if (n >= 1_000)
    return "₹" + Math.round(n / 1_000) + "k";
  return "₹" + n;
}
