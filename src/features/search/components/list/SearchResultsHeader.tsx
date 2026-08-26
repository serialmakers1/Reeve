import { SortControl } from "../SortControl";

export function SearchResultsHeader() {
  return (
    <div className="desk:hidden flex items-center justify-end px-4 py-3">
      <SortControl className="h-9" />
    </div>
  );
}
