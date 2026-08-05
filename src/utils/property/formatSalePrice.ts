const LAKH = 1_00_000;
const CRORE = 1_00_00_000;

function indianGrouped(v: number): string {
  // Last 3 digits, then groups of 2 — e.g. 95000 → "95,000", 1250000 → "12,50,000"
  const s = Math.round(v).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const withCommas = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${withCommas},${last3}`;
}

function stripTrailingZeros(n: number): string {
  // parseFloat of toFixed(2) drops trailing zeros; toString converts back
  return parseFloat(n.toFixed(2)).toString();
}

export function formatSalePrice(v: number | null | undefined): string | null {
  if (v == null || !Number.isFinite(v) || v <= 0) return null;

  if (v < LAKH) {
    return `₹${indianGrouped(v)}`;
  }

  if (v < CRORE) {
    const roundedLakhs = parseFloat((v / LAKH).toFixed(2));
    // Promote to crore if rounding pushes to 100 lakh
    if (roundedLakhs >= 100) {
      const roundedCrores = parseFloat((v / CRORE).toFixed(2));
      return `₹${stripTrailingZeros(roundedCrores)} Cr`;
    }
    return `₹${stripTrailingZeros(roundedLakhs)} Lakh`;
  }

  const roundedCrores = parseFloat((v / CRORE).toFixed(2));
  return `₹${stripTrailingZeros(roundedCrores)} Cr`;
}
