import { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from "react";
import posthog from "posthog-js";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { useSearchState } from "@/features/search";
import { useSearchResults } from "@/features/search/state/useSearchResults";
import { useFavourites } from "@/hooks/useFavourites";
import { useSearchMeta } from "@/features/search/hooks/useSearchMeta";
import {
  SEARCH_EVENTS,
  newSearchSessionId,
  buildSearchContext,
  getDeviceClass,
} from "@/features/search/analytics/searchAnalytics";
import { SearchSetupPanel } from "@/features/search/components/SearchSetupPanel";
import { SearchControlRow } from "@/features/search/components/SearchControlRow";
import { SearchFilterPanel } from "@/features/search/components/SearchFilterPanel";
import { SearchMapPlaceholder } from "@/features/search/components/SearchMapPlaceholder";
import { SearchResultsList } from "@/features/search/components/list/SearchResultsList";
import { DesktopSearchToolbar } from "@/features/search/components/desktop/DesktopSearchToolbar";
import { Button } from "@/components/ui/button";
import { URL_PARAMS } from "@/features/search/domain/searchConstants";
import type { SearchViewMode } from "@/features/search/domain/searchTypes";

const SearchMapView = lazy(() =>
  import("@/features/search/components/SearchMapView").then((m) => ({ default: m.SearchMapView })),
);

export default function SearchBrowsePage() {
  const { state, setView, hasValidContext } = useSearchState();
  const search = useSearchResults();
  const { isFavourited, toggleFavourite, isLoggedIn } = useFavourites();
  const routeLocation = useLocation();
  useSearchMeta();
  const [isPanelOpen, setIsPanelOpen] = useState(!hasValidContext);

  // ── search_context_submitted ───────────────────────────────────────────────
  const handleContextSubmitted = useCallback(
    (submittedCtx: { mode: string; city: string; locations: { id: string }[]; propertyType: string | null }) => {
      const sessionId = newSearchSessionId();
      posthog?.capture(SEARCH_EVENTS.CONTEXT_SUBMITTED, {
        search_session_id: sessionId,
        listing_mode: submittedCtx.mode,
        city_id: null,
        selected_location_count: submittedCtx.locations.length,
        property_type: submittedCtx.propertyType ?? null,
        filter_groups: [],
        result_count_bucket: "unknown",
        view_mode: state.view,
        device_class: getDeviceClass(),
      });
    },
    [state.view],
  );
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // ── View mode helpers ──────────────────────────────────────────────────────
  const isMapView = state.view === "map";
  const isSplitView = state.view === "split";

  // Track actual desktop viewport width for behavioral effects
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 1200px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1200px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  // Desktop Split: URL says split AND viewport is ≥1200px
  const isDesktopSplit = isSplitView && isDesktop;

  // ── Lazy map mount — only when map will actually render ────────────────────
  const [hasOpenedMap, setHasOpenedMap] = useState(isMapView || isDesktopSplit);
  const prevViewRef = useRef(state.view);

  useEffect(() => {
    const prev = prevViewRef.current;
    const next = state.view;
    prevViewRef.current = next;

    if (isMapView || isDesktopSplit) {
      if (!hasOpenedMap) setHasOpenedMap(true);
    }

    // map_opened: fire when map becomes visible (fullscreen map OR desktop Split), not on mobile split
    const mapWasVisible = prev === "map" || (prev === "split" && isDesktop);
    const mapIsVisible = next === "map" || (next === "split" && isDesktop);
    if (mapIsVisible && !mapWasVisible) {
      posthog?.capture(
        SEARCH_EVENTS.MAP_OPENED,
        buildSearchContext(state, { resultsCount: search.results.length, isDesktop }),
      );
    }
  }, [state.view, isDesktopSplit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Setup panel auto-open ──────────────────────────────────────────────────
  useEffect(() => {
    if (!hasValidContext) setIsPanelOpen(true);
  }, [hasValidContext]);

  const openSetup = () => setIsPanelOpen(true);

  // ── search_results_loaded / no_results_viewed — criteria fingerprint dedup ─
  const lastFiredCriteriaRef = useRef<string | null>(null);
  useEffect(() => {
    if (search.isInitialLoading || search.error || !hasValidContext) return;
    const fp = JSON.stringify({
      mode: state.context.mode,
      city: state.context.city,
      locationIds: state.context.locations.map((l) => l.id).sort(),
      propertyType: state.context.propertyType,
      filters: state.filters,
    });
    if (fp === lastFiredCriteriaRef.current) return;
    lastFiredCriteriaRef.current = fp;
    const ctx = buildSearchContext(state, { resultsCount: search.results.length, isDesktop });
    posthog?.capture(SEARCH_EVENTS.RESULTS_LOADED, ctx);
    if (search.isEmpty) {
      posthog?.capture(SEARCH_EVENTS.NO_RESULTS_VIEWED, ctx);
    }
  }, [search.isInitialLoading, search.error, search.isEmpty, search.results.length, hasValidContext, state, isDesktop]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── listing_opened callback — surface supplied by caller ──────────────────
  const handleListingOpen = useCallback(
    (propertyId: string, surface: "list" | "split" | "map") => {
      posthog?.capture(SEARCH_EVENTS.LISTING_OPENED, {
        property_id: propertyId,
        source_surface: surface,
        ...buildSearchContext(state, { resultsCount: search.results.length, isDesktop }),
      });
    },
    [state, search.results.length, isDesktop],
  );

  // ── favourite_completed — wrapped toggle, surface from caller ─────────────
  const wrappedToggleFavourite = useCallback(
    async (propertyId: string, surface: "list" | "split" | "map") => {
      const wasAdding = !isFavourited(propertyId);
      const success = await toggleFavourite(propertyId);
      if (success && wasAdding) {
        posthog?.capture(SEARCH_EVENTS.FAVOURITE_COMPLETED, {
          property_id: propertyId,
          source_surface: surface,
          ...buildSearchContext(state, { resultsCount: search.results.length, isDesktop }),
        });
      }
      return success;
    },
    [toggleFavourite, isFavourited, state, search.results.length, isDesktop],
  );

  // ── Hover state for card→marker sync ──────────────────────────────────────
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);

  // ── Card refs for marker→card scroll ──────────────────────────────────────
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // One-time return scroll: initialized from mount-time selectedPropertyId (login-return / detail-return)
  const returnScrollPendingRef = useRef<string | null>(state.selectedPropertyId ?? null);

  const scrollBehavior = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";

  const onRegisterRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) {
        cardRefs.current.set(id, el);
        // Desktop Split: scroll selected card into view when markers are clicked
        if (isDesktopSplit && state.selectedPropertyId === id) {
          el.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
        }
        // One-time return scroll for ALL modes (List, mobile, Split)
        if (returnScrollPendingRef.current === id) {
          returnScrollPendingRef.current = null;
          el.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
        }
      } else {
        cardRefs.current.delete(id);
      }
    },
    [isDesktopSplit, state.selectedPropertyId],
  );

  // ── Marker→card scroll when selectedPropertyId changes (desktop Split only) ─
  useEffect(() => {
    if (!isDesktopSplit || !state.selectedPropertyId) return;
    const el = cardRefs.current.get(state.selectedPropertyId);
    el?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
  }, [state.selectedPropertyId, isDesktopSplit]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll position restoration ────────────────────────────────────────────
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const savedWindowScroll = useRef<number>(0);
  const savedPaneScroll = useRef<number>(0);
  const prevScrollView = useRef<SearchViewMode>(state.view);

  const usesWindowScroll = (v: SearchViewMode) =>
    v === "list" || (v === "split" && !isDesktop);
  const usesPaneScroll = (v: SearchViewMode) => v === "split" && isDesktop;

  useEffect(() => {
    const prev = prevScrollView.current;
    const next = state.view;
    prevScrollView.current = next;

    if (usesWindowScroll(prev)) savedWindowScroll.current = window.scrollY;
    if (usesPaneScroll(prev))
      savedPaneScroll.current = resultsScrollRef.current?.scrollTop ?? 0;

    requestAnimationFrame(() => {
      if (usesWindowScroll(next)) {
        window.scrollTo({ top: savedWindowScroll.current, behavior: "instant" });
      }
      if (usesPaneScroll(next) && resultsScrollRef.current) {
        resultsScrollRef.current.scrollTop = savedPaneScroll.current;
      }
    });
  }, [state.view, isDesktop]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Crawlable next-page URL (cursor already serialized to URL params) ────────
  const nextPageHref = useMemo(() => {
    if (!search.hasNextPage || !search.nextCursor) return null;
    const params = new URLSearchParams(routeLocation.search);
    params.set(URL_PARAMS.cursor, btoa(JSON.stringify(search.nextCursor)));
    return `/search?${params.toString()}`;
  }, [search.hasNextPage, search.nextCursor, routeLocation.search]);

  // ── Derived H1 text from search context ───────────────────────────────────
  const h1Text = hasValidContext
    ? [
        state.context.mode === "buy" ? "Properties for Sale" : "Rental Properties",
        state.context.propertyType ?? null,
        state.context.city
          ? `in ${state.context.city.charAt(0).toUpperCase() + state.context.city.slice(1)}`
          : null,
      ]
        .filter(Boolean)
        .join(" ")
    : "Search Properties";

  // ── Map wrapper positioning — caller owns all positioning ──────────────────
  const mapWrapperClass = isMapView
    ? "fixed inset-x-0 top-16 desk:top-[120px] bottom-0 z-30"
    : isSplitView
      ? "hidden desk:fixed desk:right-0 desk:top-[120px] desk:bottom-0 desk:w-[42%] desk:z-20"
      : "hidden";

  return (
    <Layout>
    <div data-testid="search-browse-page" className="min-h-screen">
      <SearchSetupPanel open={isPanelOpen} onOpenChange={setIsPanelOpen} onSubmit={handleContextSubmitted} />
      <SearchFilterPanel open={isFilterPanelOpen} onOpenChange={setIsFilterPanelOpen} />

      {/* Mobile toolbar — hidden at desk: */}
      {hasValidContext && (
        <div className="desk:hidden">
          <SearchControlRow
            onOpenSetup={openSetup}
            onOpenFilters={() => setIsFilterPanelOpen(true)}
            loadedCount={search.results.length}
            hasNextPage={search.hasNextPage}
          />
        </div>
      )}

      {/* Desktop toolbar — hidden below desk: */}
      {hasValidContext && (
        <DesktopSearchToolbar
          onOpenSetup={openSetup}
          onOpenFilters={() => setIsFilterPanelOpen(true)}
          view={state.view}
          onSetView={setView}
          loadedCount={search.results.length}
          hasNextPage={search.hasNextPage}
        />
      )}

      {/* Results pane — hidden only on fullscreen map */}
      {hasValidContext && (
        <div
          ref={resultsScrollRef}
          className={cn(
            isMapView ? "hidden" : "",
            isDesktopSplit
              ? "desk:w-[58%] desk:overflow-y-auto desk:h-[calc(100vh-120px)] desk:sticky desk:top-[120px]"
              : "",
          )}
        >
          <h1 className="sr-only">{h1Text}</h1>
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {search.isInitialLoading && "Loading properties…"}
            {!search.isInitialLoading && !search.isEmpty && `${search.results.length}${search.hasNextPage ? "+" : ""} properties`}
            {search.isEmpty && "No properties found for this search"}
          </div>
          <div className={cn(!isDesktopSplit && "pb-24")}>
            <SearchResultsList
              {...search}
              onOpenSetup={openSetup}
              layout={isDesktopSplit ? "horizontal" : "list"}
              columns={isDesktopSplit ? 1 : "responsive"}
              selectedPropertyId={state.selectedPropertyId}
              hoveredPropertyId={hoveredPropertyId}
              onHover={setHoveredPropertyId}
              onRegisterRef={onRegisterRef}
              isFavourited={isFavourited}
              onToggleFavourite={wrappedToggleFavourite}
              isLoggedIn={isLoggedIn}
              onListingOpen={handleListingOpen}
              nextPageHref={nextPageHref}
            />
          </div>
        </div>
      )}

      {/* No-context CTA (mobile: list view only) */}
      {!hasValidContext && !isPanelOpen && !isMapView && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-40 pointer-events-none">
          <Button className="pointer-events-auto shadow-lg" onClick={openSetup}>
            Set up search
          </Button>
        </div>
      )}

      {/* Single SearchMapView — outside results pane; wrapper className owns all positioning */}
      {hasOpenedMap && (
        <div className={mapWrapperClass}>
          <Suspense fallback={null}>
          <SearchMapView
            onOpenSetup={openSetup}
            onOpenFilters={() => setIsFilterPanelOpen(true)}
            onBackToList={() => setView("list")}
            showPreview={isMapView}
            hoveredPropertyId={hoveredPropertyId}
            isFavourited={isFavourited}
            onToggleFavourite={wrappedToggleFavourite}
            isLoggedIn={isLoggedIn}
            onListingOpen={handleListingOpen}
          />
          </Suspense>
        </div>
      )}

      {/* Map FAB — show when not in fullscreen map; hidden on desktop (desk:hidden in component) */}
      {hasValidContext && !isMapView && (
        <SearchMapPlaceholder onClick={() => setView("map")} />
      )}
    </div>
    </Layout>
  );
}
