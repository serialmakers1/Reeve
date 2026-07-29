import { SlidersHorizontal } from "lucide-react";
import { useSearchState } from "@/features/search/state/useSearchState";
import type { RentFilters, BuyFilters } from "@/features/search/domain/searchTypes";

/**
 * Desktop-only in-flow strip summarising active filter groups as chips. Clicking any
 * chip opens the existing filter sheet — no filter-mutation logic here. Renders nothing
 * when no filters are active. In-flow (not fixed/sticky), so toolbar/map offsets are unaffected.
 */
export function ActiveFiltersRow({ onOpenFilters }: { onOpenFilters: () => void }) {
  const { state } = useSearchState();
  const mode = state.context.mode ?? "rent";
  const f = state.filters as RentFilters & BuyFilters;

  const labels: string[] = [];
  if (f.minPrice || f.maxPrice) labels.push("Budget");
  if (f.bhk?.length) labels.push(`BHK · ${f.bhk.length}`);
  if (f.furnishing?.length) labels.push("Furnishing");
  if (f.amenities?.length) labels.push(`Amenities · ${f.amenities.length}`);
  if (f.parking4w?.length || f.parking2w?.length) labels.push("Parking");
  if (f.hasVideoWalkthrough) labels.push("Video walkthrough");
  if (f.minResponseRate) labels.push("Response rate");
  if (f.hasExperienceFeedback) labels.push("Has feedback");

  if (mode === "rent") {
    const rf = state.filters as RentFilters;
    if (rf.availableBy) labels.push("Available by");
    if (rf.listedWithin) labels.push("Listed within");
    if (rf.zeroRentBrokerage || rf.maxBrokerage) labels.push("Brokerage");
    if (rf.maxDeposit || rf.maxLockIn || rf.maxNotice || rf.maxAnnualIncrease || rf.maxMoveInCharges)
      labels.push("Deposit & terms");
    if (rf.petPolicy?.length) labels.push("Pets");
    if (rf.availabilityConfirmedWithin) labels.push("Availability confirmed");
  } else {
    const bf = state.filters as BuyFilters;
    if (bf.minCarpetArea || bf.maxCarpetArea || bf.minSuperBuiltUp || bf.maxSuperBuiltUp)
      labels.push("Area");
    if (bf.possessionStatus?.length || bf.possessionBefore) labels.push("Possession");
    if (bf.negotiable) labels.push("Negotiable");
    if (bf.listedWithin) labels.push("Listed within");
    if (bf.maxBrokerage) labels.push("Brokerage");
    if (bf.reraDisclosed || bf.khataType?.length || bf.propertyTaxPaid) labels.push("Legal");
  }

  if (labels.length === 0) return null;

  return (
    <div className="hidden flex-wrap items-center gap-2 px-4 pt-3 desk:flex">
      <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
      {labels.map((label) => (
        <button
          key={label}
          type="button"
          onClick={onOpenFilters}
          className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
