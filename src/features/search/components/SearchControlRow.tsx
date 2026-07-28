import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSearchState } from "@/features/search/state/useSearchState";
import { countActiveFilters } from "@/features/search/state/filterUtils";
import type { SearchSortKey } from "../domain/searchTypes";
import type { RentFilters, BuyFilters } from "../domain/searchTypes";

interface SearchControlRowProps {
  onOpenSetup: () => void;
  onOpenFilters: () => void;
  loadedCount: number;
  hasNextPage: boolean;
}


const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  price_asc: "Price ↑",
  price_desc: "Price ↓",
  availability_confirmed: "Availability",
};

const CHIP =
  "flex h-8 items-center rounded-full border border-border px-3 text-xs font-medium shrink-0 transition-colors";

const ACTIVE_CHIP = "bg-primary/10 border-primary text-primary";
const INACTIVE_CHIP = "bg-background text-foreground";

export function SearchControlRow({
  onOpenSetup,
  onOpenFilters,
  loadedCount,
  hasNextPage,
}: SearchControlRowProps) {
  const { state, setSort } = useSearchState();
  const { mode, city, locations } = state.context;

  const SORT_OPTIONS: { key: SearchSortKey; label: string }[] = [
    { key: "newest", label: "Newest" },
    ...(mode === "rent" ? [{ key: "availability_confirmed" as SearchSortKey, label: "Availability" }] : []),
    { key: "price_asc", label: "Price ↑" },
    { key: "price_desc", label: "Price ↓" },
  ];

  const contextLabel = [
    mode === "rent" ? "Rent" : "Buy",
    city ? city.charAt(0).toUpperCase() + city.slice(1) : null,
    locations.length > 0 ? locations[0].label : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const sortLabel = SORT_LABELS[state.sort] ?? "Newest";
  const countLabel =
    loadedCount === 0
      ? ""
      : hasNextPage
      ? `${loadedCount}+ properties`
      : `${loadedCount} ${loadedCount === 1 ? "property" : "properties"}`;

  const resolvedMode = mode ?? "rent";
  const totalActive = countActiveFilters(state.filters, resolvedMode);
  const f = state.filters as RentFilters & BuyFilters;

  const budgetActive = !!(f.minPrice || f.maxPrice);
  const bhkActive = !!(f.bhk?.length);
  const modeFilterActive =
    resolvedMode === "buy"
      ? !!((state.filters as BuyFilters).possessionStatus?.length)
      : !!((state.filters as RentFilters).furnishing?.length);
  const modeFilterLabel = resolvedMode === "buy" ? "Possession" : "Furnishing";

  return (
    <div className="sticky top-16 z-40 bg-background border-b">
      {/* Row 1: context chip + count + sort */}
      <div className="flex h-10 items-center justify-between gap-2 px-4">
        <button
          onClick={onOpenSetup}
          className="flex min-w-0 items-center gap-1 rounded-full border border-border px-3 h-8 text-xs font-medium truncate"
          aria-label="Edit search context"
        >
          <span className="truncate">{contextLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {countLabel ? (
            <span className="text-xs text-muted-foreground">{countLabel}</span>
          ) : null}
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="flex h-8 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium"
                aria-label={`Current sort: ${sortLabel}`}
              >
                {sortLabel}
                <ChevronDown className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-36 p-1">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm rounded",
                    key === state.sort && "bg-primary/10 font-medium text-primary",
                  )}
                >
                  {label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Row 2: filter chips */}
      <div className="flex h-10 items-center gap-2 overflow-x-auto px-4 pb-1">
        <button
          onClick={onOpenFilters}
          aria-label="Budget filter"
          className={cn(CHIP, budgetActive ? ACTIVE_CHIP : INACTIVE_CHIP)}
        >
          Budget{budgetActive ? " ·" : ""}
        </button>
        <button
          onClick={onOpenFilters}
          aria-label="BHK filter"
          className={cn(CHIP, bhkActive ? ACTIVE_CHIP : INACTIVE_CHIP)}
        >
          {bhkActive ? `BHK (${f.bhk!.length})` : "BHK"}
        </button>
        <button
          onClick={onOpenFilters}
          aria-label={`${modeFilterLabel} filter`}
          className={cn(CHIP, modeFilterActive ? ACTIVE_CHIP : INACTIVE_CHIP)}
        >
          {modeFilterLabel}
          {modeFilterActive ? " ·" : ""}
        </button>
        <button
          onClick={onOpenFilters}
          aria-label="All filters"
          className={cn(CHIP, totalActive > 0 ? ACTIVE_CHIP : INACTIVE_CHIP)}
        >
          All Filters{totalActive > 0 ? ` (${totalActive})` : ""}
        </button>
      </div>
    </div>
  );
}
