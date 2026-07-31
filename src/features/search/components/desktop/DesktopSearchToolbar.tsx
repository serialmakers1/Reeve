import { LayoutList, Columns2, Map, ChevronDown, SlidersHorizontal, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSearchState } from "@/features/search/state/useSearchState";
import { countActiveFilters } from "@/features/search/state/filterUtils";
import { SortControl } from "../SortControl";
import { RentBuySelector } from "../RentBuySelector";
import type { SearchViewMode, RentFilters, BuyFilters } from "@/features/search/domain/searchTypes";

const CHIP =
  "flex h-9 items-center rounded-lg border px-3 text-xs font-medium shrink-0 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const ACTIVE_CHIP = "bg-primary/10 border-primary text-primary";
const INACTIVE_CHIP = "border-border bg-background text-foreground hover:border-primary/40";

interface DesktopSearchToolbarProps {
  onOpenSetup: () => void;
  onOpenFilters: () => void;
  view: SearchViewMode;
  onSetView: (v: SearchViewMode) => void;
  loadedCount: number;
  hasNextPage: boolean;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function DesktopSearchToolbar({
  onOpenSetup,
  onOpenFilters,
  view,
  onSetView,
}: DesktopSearchToolbarProps) {
  const { state, setMode } = useSearchState();
  const { mode, city, locations } = state.context;
  const resolvedMode = mode ?? "rent";

  const contextLabel =
    locations.length > 0
      ? `${locations[0].label}${locations.length > 1 ? ` +${locations.length - 1}` : ""}`
      : city
        ? titleCase(city)
        : "All of India";

  const totalActive = countActiveFilters(state.filters, resolvedMode);
  const f = state.filters as RentFilters & BuyFilters;
  const budgetActive = !!(f.minPrice || f.maxPrice);
  const bhkActive = !!f.bhk?.length;
  const furnishingActive = !!f.furnishing?.length;

  return (
    <div className="sticky top-16 z-40 hidden h-14 items-center gap-2 border-b bg-background px-4 desk:flex">
      {/* Rent / Buy — segmented control */}
      <div className="w-[148px] shrink-0">
        <RentBuySelector value={resolvedMode} onChange={setMode} />
      </div>

      {/* Prominent location / context control */}
      <button
        onClick={onOpenSetup}
        aria-label="Edit search location"
        className="flex h-9 min-w-[280px] max-w-[380px] items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/10 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
          {contextLabel}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Secondary quick filters */}
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
        <SlidersHorizontal className="mr-1.5 h-3 w-3" />
        Filters{totalActive > 0 ? ` (${totalActive})` : ""}
      </button>

      <div className="flex-1" />

      {/* Sort */}
      <SortControl className="h-9" />

      {/* View mode toggle */}
      <div className="flex shrink-0 items-center overflow-hidden rounded-lg border border-border">
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
              "flex h-9 w-9 items-center justify-center text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
              view === v ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
