import type { RentFilters, BuyFilters } from "../domain/searchTypes";
import type { SearchMode } from "../domain/searchMode";
import { formatPriceShort } from "../domain/formatCurrency";

const BHK_LABELS: Record<string, string> = {
  "1BHK": "1 BHK", "2BHK": "2 BHK", "3BHK": "3 BHK", "4BHK": "4 BHK",
  "5BHK_plus": "5+ BHK", studio: "Studio",
};
const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished", semi_furnished: "Semi-furnished", fully_furnished: "Fully furnished",
};
const POSSESSION_LABELS: Record<string, string> = {
  ready_to_move: "Ready to move", under_construction: "Under construction", new_launch: "New launch",
};

type F = RentFilters & BuyFilters;

/**
 * Value-aware label for a quick-filter chip. Returns the plain category name when the
 * filter is inactive, or a concise value summary when active
 * (e.g. "Furnishing: Fully furnished", "BHK: 2 selected", "Budget: ₹10k–₹40k").
 */
export function quickFilterLabel(
  filters: RentFilters | BuyFilters,
  _mode: SearchMode,
  category: "budget" | "bhk" | "furnishing",
): string {
  const f = filters as F;
  if (category === "budget") {
    if (!f.minPrice && !f.maxPrice) return "Budget";
    const lo = f.minPrice ? formatPriceShort(f.minPrice) : "Any";
    const hi = f.maxPrice ? formatPriceShort(f.maxPrice) : "Any";
    return `Budget: ${lo}–${hi}`;
  }
  if (category === "bhk") {
    const v = f.bhk ?? [];
    if (v.length === 0) return "BHK";
    if (v.length === 1) return `BHK: ${BHK_LABELS[v[0]] ?? v[0]}`;
    return `BHK: ${v.length} selected`;
  }
  // furnishing
  const v = f.furnishing ?? [];
  if (v.length === 0) return "Furnishing";
  if (v.length === 1) return `Furnishing: ${FURNISHING_LABELS[v[0]] ?? v[0]}`;
  return `Furnishing: ${v.length} selected`;
}

export interface AppliedChip {
  key: string;
  label: string;
  clearKeys: string[];
}

/**
 * Active "advanced" filters as removable chips — EXCLUDES Budget/BHK/Furnishing (shown in the
 * quick controls) so nothing is duplicated. Each chip lists the filter keys it clears.
 */
export function appliedFilterChips(filters: RentFilters | BuyFilters, mode: SearchMode): AppliedChip[] {
  const f = filters as F;
  const chips: AppliedChip[] = [];

  // Shared
  if (f.amenities?.length) chips.push({ key: "amenities", label: `Amenities: ${f.amenities.length}`, clearKeys: ["amenities"] });
  if (f.parking4w?.length || f.parking2w?.length) chips.push({ key: "parking", label: "Parking", clearKeys: ["parking4w", "parking2w"] });
  if (f.hasVideoWalkthrough) chips.push({ key: "video", label: "Video walkthrough", clearKeys: ["hasVideoWalkthrough"] });

  if (mode === "rent") {
    const rf = filters as RentFilters;
    if (rf.availableBy) chips.push({ key: "availableBy", label: "Available by", clearKeys: ["availableBy"] });
    if (rf.listedWithin) chips.push({ key: "listedWithin", label: `Listed in ${rf.listedWithin}d`, clearKeys: ["listedWithin"] });
    if (rf.zeroRentBrokerage) chips.push({ key: "brokerage", label: "Zero brokerage", clearKeys: ["zeroRentBrokerage", "maxBrokerage"] });
    else if (rf.maxBrokerage) chips.push({ key: "brokerage", label: "Brokerage", clearKeys: ["zeroRentBrokerage", "maxBrokerage"] });
    if (rf.maxDeposit || rf.maxLockIn || rf.maxNotice || rf.maxAnnualIncrease || rf.maxMoveInCharges)
      chips.push({ key: "terms", label: "Deposit & terms", clearKeys: ["maxDeposit", "maxLockIn", "maxNotice", "maxAnnualIncrease", "maxMoveInCharges"] });
    if (rf.petPolicy?.length) chips.push({ key: "pets", label: "Pets", clearKeys: ["petPolicy"] });
    if (rf.availabilityConfirmedWithin) chips.push({ key: "availConfirmed", label: "Availability confirmed", clearKeys: ["availabilityConfirmedWithin"] });
  } else {
    const bf = filters as BuyFilters;
    if (bf.minCarpetArea || bf.maxCarpetArea || bf.minSuperBuiltUp || bf.maxSuperBuiltUp)
      chips.push({ key: "area", label: "Area", clearKeys: ["minCarpetArea", "maxCarpetArea", "minSuperBuiltUp", "maxSuperBuiltUp"] });
    if (bf.possessionStatus?.length)
      chips.push({ key: "possession", label: `Possession: ${POSSESSION_LABELS[bf.possessionStatus[0]] ?? bf.possessionStatus[0]}${bf.possessionStatus.length > 1 ? "…" : ""}`, clearKeys: ["possessionStatus", "possessionBefore"] });
    else if (bf.possessionBefore) chips.push({ key: "possession", label: "Possession", clearKeys: ["possessionStatus", "possessionBefore"] });
    if (bf.negotiable) chips.push({ key: "negotiable", label: "Negotiable", clearKeys: ["negotiable"] });
    if (bf.listedWithin) chips.push({ key: "listedWithin", label: `Listed in ${bf.listedWithin}d`, clearKeys: ["listedWithin"] });
    if (bf.maxBrokerage) chips.push({ key: "brokerage", label: "Brokerage", clearKeys: ["maxBrokerage"] });
    if (bf.reraDisclosed || bf.khataType?.length || bf.propertyTaxPaid)
      chips.push({ key: "legal", label: "Legal", clearKeys: ["reraDisclosed", "khataType", "propertyTaxPaid"] });
  }

  return chips;
}
