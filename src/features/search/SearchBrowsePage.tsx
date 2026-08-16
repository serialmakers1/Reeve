import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import posthog from "posthog-js";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { useSearchState } from "@/features/search";
import { useSearchResults } from "@/features/search/state/useSearchResults";
import { useFavourites } from "@/hooks/useFavourites";
import { useSearchMeta } from "@/features/search/hooks/useSearchMeta";
import { useSearchBootstrap } from "@/features/search/state/useSearchBootstrap";
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
import { SearchResultsList } from "@/features/search/components/list/SearchResultsList";
import { DesktopSearchToolbar } from "@/features/search/components/desktop/DesktopSearchToolbar";
import { Button } from "@/components/ui/button";
import { URL_PARAMS } from "@/features/search/domain/searchConstants";

/**
 * LIST-only Search experience (Phase 4 · Prompt 4 — Map/Split permanently removed).
 * Stale ?view=map|split and map-bounds params are ignored by the parser and open plain LIST.
 */
export default function SearchBrowsePage() {
  const { state, setMode, hasValidContext } = useSearchState();
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

  // ── Hydration outcome banners ────────────────────────────────────────────────
  const [hydrationBanner, setHydrationBanner] = useState<"partial" | "failed" | null>(null);
  useEffect(() => {
    if (search.hydrationOutcome === "partial") {
      setHydrationBanner("partial");
    } else if (search.hydrationOutcome === "failed") {
      setHydrationBanner("failed");
    } else {
      setHydrationBanner(null);
    }
  }, [search.hydrationOutcome]);

  // ── Client-side distance-reset notice ───────────────────────────────────────
  // Fires only when the user explicitly removes the last locality (not during hydration).
  const [clientRadiusResetNotice, setClientRadiusResetNotice] = useState(false);
  const radiusBaselineReadyRef = useRef(search.locationReady);
  const prevDistanceRef = useRef<number | null>(state.distanceKm);
  const prevHadLocalityRef = useRef(state.context.locations.some((l) => l.kind === "locality"));

  useEffect(() => {
    const hasLocality = state.context.locations.some((l) => l.kind === "locality");

    if (!search.locationReady || !radiusBaselineReadyRef.current) {
      prevDistanceRef.current = state.distanceKm;
      prevHadLocalityRef.current = hasLocality;
      if (search.locationReady) radiusBaselineReadyRef.current = true;
      return;
    }

    const prevDistance = prevDistanceRef.current;
    const prevHadLocality = prevHadLocalityRef.current;
    prevDistanceRef.current = state.distanceKm;
    prevHadLocalityRef.current = hasLocality;

    if (prevDistance !== null && state.distanceKm === null && prevHadLocality && !hasLocality) {
      setClientRadiusResetNotice(true);
    }
  }, [search.locationReady, state.distanceKm, state.context.locations]);

  useEffect(() => {
    if (!clientRadiusResetNotice) return;
    const id = window.setTimeout(() => setClientRadiusResetNotice(false), 5000);
    return () => window.clearTimeout(id);
  }, [clientRadiusResetNotice]);
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
        view_mode: "list",
        device_class: getDeviceClass(),
      });
    },
    [],
  );
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

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
    const ctx = buildSearchContext(state, { resultsCount: search.results.length });
    posthog?.capture(SEARCH_EVENTS.RESULTS_LOADED, ctx);
    if (search.isEmpty) {
      posthog?.capture(SEARCH_EVENTS.NO_RESULTS_VIEWED, ctx);
    }
  }, [search.isInitialLoading, search.error, search.isEmpty, search.results.length, hasValidContext, state]);

  // ── listing_opened callback ───────────────────────────────────────────────
  const handleListingOpen = useCallback(
    (propertyId: string) => {
      posthog?.capture(SEARCH_EVENTS.LISTING_OPENED, {
        property_id: propertyId,
        source_surface: "list",
        ...buildSearchContext(state, { resultsCount: search.results.length }),
      });
    },
    [state, search.results.length],
  );

  // ── favourite_completed — wrapped toggle ──────────────────────────────────
  const wrappedToggleFavourite = useCallback(
    async (propertyId: string) => {
      const wasAdding = !isFavourited(propertyId);
      const success = await toggleFavourite(propertyId);
      if (success && wasAdding) {
        posthog?.capture(SEARCH_EVENTS.FAVOURITE_COMPLETED, {
          property_id: propertyId,
          source_surface: "list",
          ...buildSearchContext(state, { resultsCount: search.results.length }),
        });
      }
      return success;
    },
    [toggleFavourite, isFavourited, state, search.results.length],
  );

  // ── Card refs for one-time return scroll (login-return / detail-return) ────
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const returnScrollPendingRef = useRef<string | null>(state.selectedPropertyId ?? null);

  const scrollBehavior = (): ScrollBehavior =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";

  const onRegisterRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(id, el);
      if (returnScrollPendingRef.current === id) {
        returnScrollPendingRef.current = null;
        el.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
      }
    } else {
      cardRefs.current.delete(id);
    }
  }, []);

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

  const titleCaseCity = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);

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
          onModeChange={handleModeChange}
          loadedCount={search.results.length}
          hasNextPage={search.hasNextPage}
        />
      )}

      {/* IP-approximate location notice — non-blocking, hidden for URL/remembered locations */}
      {bootstrap.ipNoticeCity && (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 text-sm lg:px-6">
          <span className="text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{titleCaseCity(bootstrap.ipNoticeCity)}</span>{" "}
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
              Keep {titleCaseCity(bootstrap.ipNoticeCity)}
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={openSetup}>
              Change
            </Button>
          </div>
        </div>
      )}

      {/* Hydration outcome banners */}
      {hydrationBanner === "partial" && (
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 lg:px-6">
          <span>Saved locations that are no longer available were removed.</span>
          <button type="button" onClick={() => setHydrationBanner(null)} aria-label="Dismiss" className="shrink-0 text-amber-600 hover:text-amber-800">✕</button>
        </div>
      )}
      {hydrationBanner === "failed" && (
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-md border border-border bg-muted/50 px-4 py-2 text-sm text-muted-foreground lg:px-6">
          <span>We couldn't restore your saved locations. Search is continuing without location filters.</span>
          <button type="button" onClick={() => setHydrationBanner(null)} aria-label="Dismiss" className="shrink-0 hover:text-foreground">✕</button>
        </div>
      )}

      {/* Distance auto-reset notice — a selected locality isn't radius-eligible yet */}
      {search.distanceNotice && (
        <div className="mx-auto max-w-6xl px-4 py-2 text-sm text-muted-foreground lg:px-6">
          {search.distanceNotice}
        </div>
      )}

      {/* Client-side distance reset — user removed last locality */}
      {clientRadiusResetNotice && (
        <div className="mx-auto max-w-6xl px-4 py-2 text-sm text-muted-foreground lg:px-6">
          Distance reset to Auto because radius search needs a locality.
        </div>
      )}

      {/* Results pane */}
      {hasValidContext && (
        <div>
          <h1 className="sr-only">{h1Text}</h1>
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {search.isInitialLoading && "Loading properties…"}
            {!search.isInitialLoading && !search.isEmpty && `${search.results.length}${search.hasNextPage ? "+" : ""} properties`}
            {search.isEmpty && "No properties found for this search"}
          </div>
          <div className="pb-24">
            <SearchResultsList
              {...search}
              onOpenSetup={openSetup}
              onOpenFilters={() => setIsFilterPanelOpen(true)}
              selectedPropertyId={state.selectedPropertyId}
              onRegisterRef={onRegisterRef}
              isFavourited={isFavourited}
              onToggleFavourite={wrappedToggleFavourite}
              isLoggedIn={isLoggedIn}
              onListingOpen={handleListingOpen}
              nextPageHref={nextPageHref}
              emptyLocationContext={(() => {
                const cs = state.context.cities;
                const ls = state.context.locations;
                if (cs.length === 1 && ls.length === 0) return { singleCity: cs[0].label, hasLocations: false };
                if (cs.length > 0 || ls.length > 0) return { hasLocations: true };
                return { hasLocations: false };
              })()}
            />
          </div>
        </div>
      )}

      {/* No-context CTA */}
      {!hasValidContext && !isPanelOpen && (
        <div className="fixed bottom-6 inset-x-0 flex justify-center z-40 pointer-events-none">
          <Button className="pointer-events-auto shadow-lg" onClick={openSetup}>
            Set up search
          </Button>
        </div>
      )}
    </div>
    </Layout>
  );
}
