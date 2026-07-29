import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSearchState } from "@/features/search/state/useSearchState";
import type { SearchSortKey } from "../domain/searchTypes";

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  price_asc: "Price ↑",
  price_desc: "Price ↓",
  availability_confirmed: "Availability",
};

/**
 * Shared sort popover — reused by the mobile result header and both toolbars.
 * Mode-aware: exposes availability_confirmed only for rent. State/actions unchanged.
 */
export function SortControl({ className, align = "end" }: { className?: string; align?: "start" | "end" }) {
  const { state, setSort } = useSearchState();
  const mode = state.context.mode ?? "rent";

  const options: { key: SearchSortKey; label: string }[] = [
    { key: "newest", label: "Newest" },
    ...(mode === "rent" ? [{ key: "availability_confirmed" as SearchSortKey, label: "Availability" }] : []),
    { key: "price_asc", label: "Price ↑" },
    { key: "price_desc", label: "Price ↓" },
  ];
  const sortLabel = SORT_LABELS[state.sort] ?? "Newest";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground shrink-0 transition-colors hover:border-primary/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            className,
          )}
          aria-label={`Current sort: ${sortLabel}`}
        >
          {sortLabel}
          <ChevronDown className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-40 p-1">
        {options.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={cn(
              "w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
              key === state.sort && "bg-primary/10 font-medium text-primary hover:bg-primary/10",
            )}
          >
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
