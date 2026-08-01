import { X } from "lucide-react";
import { useSearchState } from "@/features/search/state/useSearchState";
import { appliedFilterChips } from "@/features/search/state/filterSummary";
import type { RentFilters, BuyFilters } from "@/features/search/domain/searchTypes";

/**
 * In-flow applied-filter chips for **advanced** filters only (Budget/BHK/Furnishing live in the
 * quick controls and are never duplicated here). Each chip is individually removable; a "Clear all"
 * clears the advanced groups (quick-control filters + sort untouched). One horizontally-scrollable
 * row on mobile, wraps on desktop. Renders nothing when no advanced filter is active.
 */
export function ActiveFiltersRow({ onOpenFilters: _onOpenFilters }: { onOpenFilters: () => void }) {
  const { state, applyFilters } = useSearchState();
  const mode = state.context.mode ?? "rent";
  const chips = appliedFilterChips(state.filters, mode);
  if (chips.length === 0) return null;

  function clearKeys(keys: string[]) {
    const next = { ...(state.filters as RentFilters & BuyFilters) } as Record<string, unknown>;
    for (const k of keys) delete next[k];
    applyFilters(next as RentFilters | BuyFilters);
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden desk:flex-wrap desk:overflow-visible">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => clearKeys(chip.clearKeys)}
          aria-label={`Remove ${chip.label} filter`}
          className="flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 py-1 pl-3 pr-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {chip.label}
          <X className="h-3 w-3" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => clearKeys(chips.flatMap((c) => c.clearKeys))}
        className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
