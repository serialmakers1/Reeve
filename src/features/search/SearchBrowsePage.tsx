import { useState, useEffect, useRef, useCallback, useMemo, Suspense, lazy } from "react";
import posthog from "posthog-js";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { useSearchState } from "@/features/search";
import { useSearchResults } from "@/features/search/state/useSearchResults";
import { useFavourites } from "@/hooks/useFavourites";
import { useSearchMeta } from "@/features/search/hooks/useSearchMeta";
import { useSearchBootstrap } from "@/features/search/state/useSearchBootstrap";
import { SEARCH_MAP_ENABLED } from "@/features/search/domain/searchFeatureFlags";
import { formatSearchHeading } from "@/features/search/state/formatSearchHeading";
import { formatCitiesLabel } from "@/features/search/state/searchStateUtils";
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
  const { state, setView, setMode, hasValidContext } = useSearchState();
  const search = useSearchResults();
  const { isFavourited, toggleFavourite, isLoggedIn } = useFavourites();
  const routeLocation = useLocation();
  useSearchMeta();

  // Deterministic location bootstrap: confirmed memory → Vercel IP → setup panel.
  const bootstrap = useSearchBootstrap();

  // Setup starts closed; the bootstrap opens it exactly once when it resolves to
  // needs_setup. Closing it must not reopen on every render, so guard with a ref
  // that only resets for a genuinely new empty bootstrap (status back to checking).
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (bootstrap.status === "checking") {
      autoOpenedRef.current = false;
      return;
    }
    if (bootstrap.status === "needs_setup" && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setIsPanelOpen(true);
    }
  }, [bootstrap.status]);

  // Normalize a stale ?view=map|split in the URL to List once (replace, no new entry).
  useEffect(() => {
    if (SEARCH_MAP_ENABLED) return;
    const v = new URLSearchParams(routeLocation.search).get(URL_PARAMS.view);
    if (v === "map" || v === "split") setView("list");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── search_context_submitted ───────────────────────────────────────────────
  const handleContextSubmitted = useCallback(
    (submittedCtx: { mode: string; city: string | null; locations: { id: string }[]; propertyTypes: string[] }) => {
      const sessionId = newSearchSessionId();
      posthog?.capture(SEARCH_EVENTS.CONTEXT_SUBMITTED, {
        search_session_id: sessionId,
        listing_mode: submittedCtx.mode,
        city_id: null,
        selected_location_count: submittedCtx.locations.length,
        property_types: submittedCtx.propertyTypes,
        property_type: submittedCtx.propertyTypes.length === 1 ? submittedCtx.propertyTypes[0] : null,
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
  const [hasOpenedMap, setHasOpenedMap] = useState(
    SEARCH_MAP_ENABLED && (isMapView || isDesktopSplit),
  );
  const prevViewRef = useRef(state.view);

  useEffect(() => {
    // Map/Split gated off — no mount, no marker query, no map analytics.
    if (!SEARCH_MAP_ENABLED) return;
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

  const openSetup = () => setIsPanelOpen(true);

  // Explicit Rent/Buy toggle from the toolbar: change mode live, then persist the
  // current city's full setup with the new mode (only when a committed city exists).
  const handleModeChange = useCallback(
    (mode: "rent" | "buy") => {
      setMode(mode);
      const c = state.context;
      if (c.city) {
        bootstrap.confirmSetup({ city: c.city, cityToken: c.cities[0], areas: c.locations, mode, propertyTypes: c.propertyTypes });
      }
    },
    [setMode, state.context, bootstrap],
  );

  // ── search_results_loaded / no_results_viewed — criteria fingerprint dedup ─
  const lastFiredCriteriaRef = useRef<string | null>(null);
  useEffect(() => {
    if (search.isInitialLoading || search.error || !hasValidContext) return;
    const fp = JSON.stringify({
      mode: state.context.mode,
      city: state.context.city,
      locationIds: state.context.locations.map((l) => l.id).sort(),
      propertyTypes: state.context.propertyTypes,
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

  // ── Derived H1 text from search context (shared formatter — see useSearchMeta) ─
  const h1Text = hasValidContext
    ? formatSearchHeading({
        mode: state.context.mode,
        city: state.context.city,
        citiesLabel: formatCitiesLabel(state.context.cities),
        propertyTypes: state.context.propertyTypes,
      })
    : "Search Properties";

  // ── Map wrapper positioning — caller owns all positioning ──────────────────
  const mapWrapperClass = isMapView
    ? "fixed inset-x-0 top-16 desk:top-[120px] bottom-0 z-30"
    : isSplitView
      ? "hidden desk:block desk:fixed desk:right-0 desk:top-[120px] desk:bottom-0 desk:w-[42%] desk:z-20"
      : "hidden";

  return (
    <Layout>
    <div data-testid="search-browse-page" className="min-h-screen bg-muted/30">
      <SearchSetupPanel
        open={isPanelOpen}
        onOpenChange={setIsPanelOpen}
        onSubmit={handleContextSubmitted}
        suggestedCity={bootstrap.approxCity}
        onCityInteraction={bootstrap.markUserInteracted}
        recentCities={bootstrap.recentCities}
        getCityMemory={bootstrap.getCityMemory}
        onConfirmSetup={bootstrap.confirmSetup}
        onRemoveCity={bootstrap.removeRememberedCity}
        onClearRecent={bootstrap.clearRememberedHistory}
      />
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
          onModeChange={handleModeChange}
          loadedCount={search.results.length}
          hasNextPage={search.hasNextPage}
        />
      )}

      {/* IP-approximate location notice — non-blocking, hidden for URL/remembered locations */}
      {bootstrap.ipNoticeCity && !isMapView && (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-sm lg:px-6">
          <span className="text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {bootstrap.ipNoticeCity.charAt(0).toUpperCase() + bootstrap.ipNoticeCity.slice(1)}
            </span>{" "}
            based on your approximate location.
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={() =>
                bootstrap.confirmSetup({
                  city: bootstrap.ipNoticeCity!,
                  cityToken: state.context.cities[0],
                  areas: state.context.locations,
                  mode: state.context.mode ?? "rent",
                  propertyTypes: state.context.propertyTypes,
                })
              }
            >
              Keep {bootstrap.ipNoticeCity.charAt(0).toUpperCase() + bootstrap.ipNoticeCity.slice(1)}
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={openSetup}>
              Change
            </Button>
          </div>
        </div>
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
              onOpenFilters={() => setIsFilterPanelOpen(true)}
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
      {SEARCH_MAP_ENABLED && hasOpenedMap && (
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

      {/* Map FAB — hidden while Map/Split are gated off */}
      {SEARCH_MAP_ENABLED && hasValidContext && !isMapView && (
        <SearchMapPlaceholder onClick={() => setView("map")} />
      )}
    </div>
    </Layout>
  );
}
