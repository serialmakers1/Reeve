import { useState, useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useSearchState } from "@/features/search";
import { useSearchResults } from "@/features/search/state/useSearchResults";
import { SearchSetupPanel } from "@/features/search/components/SearchSetupPanel";
import { SearchControlRow } from "@/features/search/components/SearchControlRow";
import { SearchFilterPanel } from "@/features/search/components/SearchFilterPanel";
import { SearchMapPlaceholder } from "@/features/search/components/SearchMapPlaceholder";
import { SearchResultsList } from "@/features/search/components/list/SearchResultsList";
import { SearchMapView } from "@/features/search/components/SearchMapView";
import { Button } from "@/components/ui/button";

export default function SearchBrowsePage() {
  const { state, setView, hasValidContext } = useSearchState();
  const search = useSearchResults();
  const [isPanelOpen, setIsPanelOpen] = useState(!hasValidContext);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const isMapView = state.view === "map";
  // Lazy mount: only create the map once it's first opened; never unmount thereafter
  const [hasOpenedMap, setHasOpenedMap] = useState(isMapView);
  // Track previous view to fire PostHog per List→Map transition
  const prevViewRef = useRef(state.view);

  useEffect(() => {
    if (!hasValidContext) setIsPanelOpen(true);
  }, [hasValidContext]);

  useEffect(() => {
    if (isMapView) {
      if (!hasOpenedMap) setHasOpenedMap(true);
      if (prevViewRef.current !== "map") {
        posthog?.capture("search_map_opened", {
          city: state.context.city,
          mode: state.context.mode,
        });
      }
    }
    prevViewRef.current = state.view;
  }, [state.view]); // eslint-disable-line react-hooks/exhaustive-deps

  const openSetup = () => setIsPanelOpen(true);

  return (
    <div data-testid="search-browse-page" className="min-h-screen">
      <SearchSetupPanel open={isPanelOpen} onOpenChange={setIsPanelOpen} />
      <SearchFilterPanel open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen} />

      {/* List view — CSS-hidden (not unmounted) when map is active */}
      <div style={{ display: isMapView ? "none" : undefined }}>
        {hasValidContext && (
          <>
            <SearchControlRow
              onOpenSetup={openSetup}
              onOpenFilters={() => setIsFilterPanelOpen(true)}
              loadedCount={search.results.length}
              hasNextPage={search.hasNextPage}
            />
            <div className="pb-24">
              <SearchResultsList {...search} onOpenSetup={openSetup} />
            </div>
            <SearchMapPlaceholder onClick={() => setView("map")} />
          </>
        )}

        {!hasValidContext && !isPanelOpen && (
          <div className="fixed bottom-6 inset-x-0 flex justify-center z-40 pointer-events-none">
            <Button className="pointer-events-auto shadow-lg" onClick={openSetup}>
              Set up search
            </Button>
          </div>
        )}
      </div>

      {/* Map view — lazy-mounted on first open; CSS-hidden when back on list */}
      {hasOpenedMap && (
        <div style={{ display: isMapView ? undefined : "none" }}>
          <SearchMapView
            onOpenSetup={openSetup}
            onOpenFilters={() => setIsFilterPanelOpen(true)}
            onBackToList={() => setView("list")}
          />
        </div>
      )}
    </div>
  );
}
