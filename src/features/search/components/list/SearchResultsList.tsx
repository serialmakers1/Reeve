import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
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
  layout?: "list" | "horizontal";
  columns?: 1 | "responsive";
  selectedPropertyId?: string | null;
  hoveredPropertyId?: string | null;
  onHover?: (id: string | null) => void;
  onRegisterRef?: (id: string, el: HTMLDivElement | null) => void;
  isFavourited: (id: string) => boolean;
  onToggleFavourite: (id: string, surface: "list" | "split" | "map") => void;
  isLoggedIn: boolean;
  onListingOpen?: (id: string, surface: "list" | "split") => void;
  nextPageHref?: string | null;
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
  layout = "list",
  columns = "responsive",
  selectedPropertyId,
  hoveredPropertyId,
  onHover,
  onRegisterRef,
  isFavourited,
  onToggleFavourite,
  isLoggedIn,
  onListingOpen,
  nextPageHref,
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

  const wrapperClass =
    layout === "horizontal"
      ? "flex flex-col"
      : cn(
          columns === "responsive"
            ? "desk:grid desk:grid-cols-2 2xl:grid-cols-3 desk:gap-3 desk:p-3"
            : "",
        );

  return (
    <div className={wrapperClass}>
      {isRefreshing && (
        <p className="py-2 text-center text-xs text-muted-foreground desk:col-span-full">
          Refreshing…
        </p>
      )}
      {results.map((r, i) => (
        <SearchPropertyCard
          key={r.id}
          result={r}
          layout={layout === "horizontal" ? "horizontal" : "vertical"}
          isSelected={r.id === selectedPropertyId}
          isFirstVisible={i === 0}
          onHover={onHover}
          onRegisterRef={onRegisterRef}
          isFavourited={isFavourited}
          onToggleFavourite={onToggleFavourite}
          isLoggedIn={isLoggedIn}
          onListingOpen={onListingOpen}
        />
      ))}
      {hasNextPage && !isLoadingMore && (
        <Link
          to={nextPageHref ?? "#"}
          onClick={(e) => { e.preventDefault(); loadMore(); }}
          className="block w-full py-4 text-center text-sm font-medium text-primary desk:col-span-full"
        >
          Load more
        </Link>
      )}
      {isLoadingMore && (
        <div className="desk:col-span-full">
          <SearchCardSkeleton />
          <SearchCardSkeleton />
        </div>
      )}
    </div>
  );
}
