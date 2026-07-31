import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";
import { useSearchState } from "@/features/search/state/useSearchState";
import { SearchPropertyCard } from "./SearchPropertyCard";
import { SearchCardSkeleton } from "./SearchCardSkeleton";
import { SearchResultsHeader } from "./SearchResultsHeader";
import { ActiveFiltersRow } from "../desktop/ActiveFiltersRow";
import type { AreaFallback } from "@/features/search/state/useSearchResults";

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
  onOpenFilters?: () => void;
  areaFallback?: AreaFallback | null;
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
  onOpenFilters,
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
  areaFallback,
}: SearchResultsListProps) {
  const { state, setContext } = useSearchState();

  const areaNames = areaFallback?.areaLabels.join(", ") ?? "";
  const clearAreas = () => setContext({ locations: [] });

  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-3 p-4 desk:grid desk:grid-cols-2 2xl:grid-cols-3 desk:gap-4">
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

  // Area → city fallback owns the empty state when areas returned zero rows.
  if (areaFallback) {
    if (areaFallback.status === "loading") {
      return (
        <div className="flex flex-col gap-3 p-4 desk:grid desk:grid-cols-2 2xl:grid-cols-3 desk:gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <SearchCardSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (areaFallback.status === "error") {
      return (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <p className="text-sm font-medium">Couldn't load nearby homes</p>
          <p className="text-xs text-muted-foreground">Please check your connection and try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-full border border-border px-4 py-2 text-sm"
          >
            Try again
          </button>
        </div>
      );
    }
    if (!areaFallback.hasResults) {
      return (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <p className="text-sm font-medium">
            No homes found in {areaNames} or elsewhere in {areaFallback.cityLabel}
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
    // success + results → fall through to render banner + recovery results below.
  }

  if (isEmpty && !areaFallback) {
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

  const showingFallback = areaFallback?.status === "success" && areaFallback.hasResults;
  const displayResults = showingFallback ? areaFallback!.results : results;

  const wrapperClass =
    layout === "horizontal"
      ? "flex flex-col gap-3 p-3"
      : columns === "responsive"
        ? "flex flex-col gap-3 p-4 desk:grid desk:grid-cols-2 2xl:grid-cols-3 desk:gap-4 desk:p-4"
        : "flex flex-col gap-3 p-4";

  return (
    <>
      {onOpenFilters && <ActiveFiltersRow onOpenFilters={onOpenFilters} />}
      {showingFallback ? (
        <div className="flex flex-col gap-1 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">No homes found in {areaNames}</p>
          <p className="text-xs text-muted-foreground">
            Here are homes elsewhere in {areaFallback!.cityLabel}.{" "}
            <button
              type="button"
              onClick={clearAreas}
              className="font-medium text-primary underline underline-offset-2"
            >
              Search all {areaFallback!.cityLabel}
            </button>
          </p>
        </div>
      ) : (
        <SearchResultsHeader loadedCount={results.length} hasNextPage={hasNextPage} />
      )}
      <div className={wrapperClass}>
      {isRefreshing && !showingFallback && (
        <p className="py-2 text-center text-xs text-muted-foreground desk:col-span-full">
          Refreshing…
        </p>
      )}
      {displayResults.map((r, i) => (
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
      {!showingFallback && hasNextPage && !isLoadingMore && (
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
    </>
  );
}
