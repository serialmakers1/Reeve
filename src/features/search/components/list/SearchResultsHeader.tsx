import { useSearchState } from "@/features/search/state/useSearchState";
import { resultHeaderLabel } from "@/features/search/state/resultHeaderResolver";
import { SortControl } from "../SortControl";

interface SearchResultsHeaderProps {
  totalCount: number;
}

/**
 * Contextual result header: "247 homes in Whitefield" / "Homes across India".
 * Sort sits right-aligned on mobile (desk:hidden — desktop sort lives in the toolbar).
 */
export function SearchResultsHeader({ totalCount }: SearchResultsHeaderProps) {
  const { state } = useSearchState();
  const label = resultHeaderLabel(state, totalCount);

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <h2 className="min-w-0 truncate text-base font-semibold text-foreground">{label}</h2>
      <div className="desk:hidden shrink-0">
        <SortControl className="h-9" />
      </div>
    </div>
  );
}
