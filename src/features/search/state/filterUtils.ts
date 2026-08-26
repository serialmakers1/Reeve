import type { RentFilters, BuyFilters } from "../domain/searchTypes";
import type { SearchMode } from "../domain/searchMode";

/**
 * Counts active filter categories for the given mode.
 * Each logical group counts as 1 regardless of how many values are set.
 * Sort is excluded — it has its own picker.
 * mode parameter ensures each mode's fields are counted exactly once.
 */
export function countActiveFilters(
  filters: RentFilters | BuyFilters,
  mode: SearchMode,
): number {
  const f = filters as RentFilters & BuyFilters;
  let n = 0;

  // ── Shared (both modes) ──────────────────────────────────────────────────
  if (f.minPrice || f.maxPrice) n++;
  if (f.bhk?.length) n++;
  if (f.furnishing?.length) n++;
  if (f.parking4w?.length || f.parking2w?.length) n++;
  if (f.amenities?.length) n++;
  if (f.hasVideoWalkthrough) n++;

  if (mode === "rent") {
    const rf = filters as RentFilters;
    if (rf.availableBy) n++;
    if (rf.listedWithin) n++;
    if (rf.zeroRentBrokerage || rf.maxBrokerage) n++;
    if (rf.maxDeposit) n++;
    if (rf.maxLockIn) n++;
    if (rf.maxNotice) n++;
    if (rf.maxAnnualIncrease) n++;
    if (rf.maxMoveInCharges) n++;
    if (rf.petPolicy?.length) n++;
  } else {
    const bf = filters as BuyFilters;
    if (bf.minCarpetArea || bf.maxCarpetArea) n++;
    if (bf.minSuperBuiltUp || bf.maxSuperBuiltUp) n++;
    if (bf.possessionStatus?.length) n++;
    if (bf.possessionBefore) n++;
    if (bf.negotiable) n++;
    if (bf.listedWithin) n++;
    if (bf.maxBrokerage) n++;
    if (bf.reraDisclosed) n++;
    if (bf.khataType?.length) n++;
    if (bf.propertyTaxPaid) n++;
  }

  return n;
}
