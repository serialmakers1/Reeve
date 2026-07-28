import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";
import { useSearchState } from "@/features/search/state/useSearchState";
import { SearchPropertyCard } from "./SearchPropertyCard";
import { SearchCardSkeleton } from "./SearchCardSkeleton";

interface SearchResultsListProps {
  results: SearchPropertyResult[];
  hasNextPage: boolean;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  isRefreshing: boolean;
  isEmpty: boolean;
  error: Error | null;
  loadMore: () => void;
  onOpenSetup: () => void;
}

export function SearchResultsList({
  results,
  hasNextPage,
  isInitialLoading,
  isLoadingMore,
  isRefreshing,
  isEmpty,
  error,
  loadMore,
  onOpenSetup,
}: SearchResultsListProps) {
  const { state } = useSearchState();

  if (isInitialLoading) {
    return (
      <div>
        {Array.from({ length: 6 }, (_, i) => (
          <SearchCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="text-sm font-medium">Something went wrong</p>
        <p className="text-xs text-muted-foreground">{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 rounded-full border border-border px-4 py-2 text-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="text-sm font-medium">No properties found</p>
        <p className="text-xs text-muted-foreground">
          {state.context.locations.length > 0
            ? "Try removing some area filters or searching all of the city"
            : "Try a different city, or adjust your search"}
        </p>
        <button
          onClick={onOpenSetup}
          className="mt-2 rounded-full border border-border px-4 py-2 text-sm"
        >
          Adjust search
        </button>
      </div>
    );
  }

  return (
    <div>
      {isRefreshing && (
        <p className="py-2 text-center text-xs text-muted-foreground">Refreshing…</p>
      )}
      {results.map((r) => (
        <SearchPropertyCard key={r.id} result={r} />
      ))}
      {hasNextPage && !isLoadingMore && (
        <button
          onClick={loadMore}
          className="w-full py-4 text-sm font-medium text-primary"
        >
          Load more
        </button>
      )}
      {isLoadingMore && (
        <div>
          <SearchCardSkeleton />
          <SearchCardSkeleton />
        </div>
      )}
    </div>
  );
}
