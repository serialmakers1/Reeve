import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchState } from "@/features/search/state/useSearchState";
import { countActiveFilters } from "@/features/search/state/filterUtils";
import type { RentFilters, BuyFilters } from "../domain/searchTypes";

interface SearchControlRowProps {
  onOpenSetup: () => void;
  onOpenFilters: () => void;
  loadedCount: number;
  hasNextPage: boolean;
}

const CHIP =
  "flex h-11 min-w-[44px] items-center rounded-full border px-3 text-xs font-medium shrink-0 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const ACTIVE_CHIP = "bg-primary/10 border-primary text-primary";
const INACTIVE_CHIP = "bg-background border-border text-foreground hover:border-primary/40";

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Mobile-only control row. Sort + count now live in the result header.
export function SearchControlRow({ onOpenSetup, onOpenFilters }: SearchControlRowProps) {
  const { state } = useSearchState();
  const { mode, city, locations, propertyType } = state.context;
  const resolvedMode = mode ?? "rent";

  // Line 1: mode · primary location (area or city)
  const areaLabel =
    locations.length > 0
      ? `${locations[0].label}${locations.length > 1 ? ` +${locations.length - 1} areas` : ""}`
      : city
        ? titleCase(city)
        : "Anywhere in India";
  const primaryLine = `${resolvedMode === "rent" ? "Rent" : "Buy"} · ${areaLabel}`;

  // Line 2: property type · city (graceful omissions)
  const secondaryLine =
    [propertyType ? titleCase(propertyType) : null, locations.length > 0 && city ? titleCase(city) : null]
      .filter(Boolean)
      .join(" · ") || (resolvedMode === "rent" ? "Rentals" : "For sale");

  const f = state.filters as RentFilters & BuyFilters;
  const budgetActive = !!(f.minPrice || f.maxPrice);
  const bhkActive = !!f.bhk?.length;
  const furnishingActive = !!f.furnishing?.length;
  const totalActive = countActiveFilters(state.filters, resolvedMode);

  return (
    <div className="sticky top-16 z-40 space-y-2 border-b bg-background px-4 pb-2 pt-2 desk:hidden">
      {/* Prominent Search Context card */}
      <button
        onClick={onOpenSetup}
        aria-label="Edit search context"
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-primary/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{primaryLine}</span>
          <span className="block truncate text-xs text-muted-foreground">{secondaryLine}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      </button>

      {/* Quick filter chips */}
      <div className="flex items-center gap-2 overflow-x-auto">
        <button
          onClick={onOpenFilters}
          aria-label="Budget filter"
          aria-pressed={budgetActive}
          className={cn(CHIP, budgetActive ? ACTIVE_CHIP : INACTIVE_CHIP)}
        >
          Budget{budgetActive ? " ·" : ""}
        </button>
        <button
          onClick={onOpenFilters}
          aria-label="BHK filter"
          aria-pressed={bhkActive}
          className={cn(CHIP, bhkActive ? ACTIVE_CHIP : INACTIVE_CHIP)}
        >
          {bhkActive ? `BHK (${f.bhk!.length})` : "BHK"}
        </button>
        <button
          onClick={onOpenFilters}
          aria-label="Furnishing filter"
          aria-pressed={furnishingActive}
          className={cn(CHIP, furnishingActive ? ACTIVE_CHIP : INACTIVE_CHIP)}
        >
          Furnishing{furnishingActive ? " ·" : ""}
        </button>
        <button
          onClick={onOpenFilters}
          aria-label="All filters"
          aria-pressed={totalActive > 0}
          className={cn(CHIP, totalActive > 0 ? ACTIVE_CHIP : INACTIVE_CHIP)}
        >
          Filters{totalActive > 0 ? ` · ${totalActive}` : ""}
        </button>
      </div>
    </div>
  );
}
