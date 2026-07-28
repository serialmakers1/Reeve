import { LayoutList, Columns2, Map, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSearchState } from "@/features/search/state/useSearchState";
import { countActiveFilters } from "@/features/search/state/filterUtils";
import type { SearchViewMode, SearchSortKey, RentFilters, BuyFilters } from "@/features/search/domain/searchTypes";

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  price_asc: "Price ↑",
  price_desc: "Price ↓",
  availability_confirmed: "Availability",
};

const CHIP =
  "flex h-8 items-center rounded-full border px-3 text-xs font-medium shrink-0 transition-colors";
const ACTIVE_CHIP = "bg-primary/10 border-primary text-primary";
const INACTIVE_CHIP = "border-border bg-background text-foreground";

interface DesktopSearchToolbarProps {
  onOpenSetup: () => void;
  onOpenFilters: () => void;
  view: SearchViewMode;
  onSetView: (v: SearchViewMode) => void;
  loadedCount: number;
  hasNextPage: boolean;
}

export function DesktopSearchToolbar({
  onOpenSetup,
  onOpenFilters,
  view,
  onSetView,
  loadedCount,
  hasNextPage,
}: DesktopSearchToolbarProps) {
  const { state, setSort } = useSearchState();
  const { mode, city, locations } = state.context;
  const resolvedMode = mode ?? "rent";

  const SORT_OPTIONS: { key: SearchSortKey; label: string }[] = [
    { key: "newest", label: "Newest" },
    ...(resolvedMode === "rent"
      ? [{ key: "availability_confirmed" as SearchSortKey, label: "Availability" }]
      : []),
    { key: "price_asc", label: "Price ↑" },
    { key: "price_desc", label: "Price ↓" },
  ];

  const contextLabel = [
    resolvedMode === "rent" ? "Rent" : "Buy",
    city ? city.charAt(0).toUpperCase() + city.slice(1) : null,
    locations.length > 0 ? locations[0].label : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const sortLabel = SORT_LABELS[state.sort] ?? "Newest";
  const totalActive = countActiveFilters(state.filters, resolvedMode);
  const f = state.filters as RentFilters & BuyFilters;
  const budgetActive = !!(f.minPrice || f.maxPrice);
  const bhkActive = !!(f.bhk?.length);
  const modeFilterActive =
    resolvedMode === "buy"
      ? !!((state.filters as BuyFilters).possessionStatus?.length)
      : !!((state.filters as RentFilters).furnishing?.length);
  const modeFilterLabel = resolvedMode === "buy" ? "Possession" : "Furnishing";

  const countLabel =
    loadedCount === 0
      ? ""
      : hasNextPage
        ? `${loadedCount}+ properties`
        : `${loadedCount} ${loadedCount === 1 ? "property" : "properties"}`;

  return (
    <div className="hidden desk:flex sticky top-16 z-40 h-14 bg-background border-b items-center gap-2 px-4">
      {/* Mode chip */}
      <button
        onClick={onOpenSetup}
        className={cn(CHIP, INACTIVE_CHIP, "font-semibold")}
        aria-label="Switch rent/buy"
      >
        {resolvedMode === "rent" ? "Rent" : "Buy"}
      </button>

      {/* Context chip */}
      <button
        onClick={onOpenSetup}
        className={cn(CHIP, INACTIVE_CHIP, "max-w-[200px] truncate")}
        aria-label="Edit search context"
      >
        <span className="truncate">{contextLabel || "Set location"}</span>
        <ChevronDown className="ml-1 h-3 w-3 shrink-0" />
      </button>

      {/* Budget */}
      <button
        onClick={onOpenFilters}
        aria-label="Budget filter"
        aria-pressed={budgetActive}
        className={cn(CHIP, budgetActive ? ACTIVE_CHIP : INACTIVE_CHIP)}
      >
        Budget{budgetActive ? " ·" : ""}
      </button>

      {/* BHK */}
      <button
        onClick={onOpenFilters}
        aria-label="BHK filter"
        aria-pressed={bhkActive}
        className={cn(CHIP, bhkActive ? ACTIVE_CHIP : INACTIVE_CHIP)}
      >
        {bhkActive ? `BHK (${f.bhk!.length})` : "BHK"}
      </button>

      {/* Furnishing / Possession */}
      <button
        onClick={onOpenFilters}
        aria-label={`${modeFilterLabel} filter`}
        aria-pressed={modeFilterActive}
        className={cn(CHIP, modeFilterActive ? ACTIVE_CHIP : INACTIVE_CHIP)}
      >
        {modeFilterLabel}
        {modeFilterActive ? " ·" : ""}
      </button>

      {/* All Filters */}
      <button
        onClick={onOpenFilters}
        aria-label="All filters"
        aria-pressed={totalActive > 0}
        className={cn(CHIP, totalActive > 0 ? ACTIVE_CHIP : INACTIVE_CHIP)}
      >
        <SlidersHorizontal className="mr-1.5 h-3 w-3" />
        Filters{totalActive > 0 ? ` (${totalActive})` : ""}
      </button>

      {/* Spacer + count */}
      <div className="flex-1" />
      {countLabel && (
        <span className="text-xs text-muted-foreground shrink-0">{countLabel}</span>
      )}

      {/* Sort */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(CHIP, INACTIVE_CHIP)}
            aria-label={`Current sort: ${sortLabel}`}
          >
            {sortLabel}
            <ChevronDown className="ml-1 h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 p-1">
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

      {/* View mode toggle */}
      <div className="flex items-center rounded-lg border border-border overflow-hidden shrink-0">
        {(
          [
            { v: "list" as SearchViewMode, Icon: LayoutList, label: "List" },
            { v: "split" as SearchViewMode, Icon: Columns2, label: "Split" },
            { v: "map" as SearchViewMode, Icon: Map, label: "Map" },
          ] as const
        ).map(({ v, Icon, label }) => (
          <button
            key={v}
            onClick={() => onSetView(v)}
            aria-label={`${label} view`}
            className={cn(
              "flex h-8 w-9 items-center justify-center text-xs transition-colors",
              view === v
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
