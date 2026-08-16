import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { mergeSearchPages, useSearchResults, isRadiusFailure } from "../state/useSearchResults";
import type { SearchPropertyResult } from "../data/searchResultContract";
import { useSearchState } from "../state/useSearchState";
import { searchProperties } from "../data/searchDataClient";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));

vi.mock("../state/useCanonicalHydration", () => ({
  useCanonicalHydration: () => ({ locationReady: true, hydrationOutcome: null }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, isLoading: false, isAuthenticated: false }),
}));

// Default: anonymous, no favourites
vi.mock("@/hooks/useFavourites", () => ({
  useFavourites: () => ({
    isFavourited: () => false,
    favouriteIds: new Set<string>(),
    loading: false,
    toggleFavourite: vi.fn(),
    isLoggedIn: false,
  }),
}));

const invalidContext = {
  state: {
    context: { mode: null as null, city: null as null, cities: [] as [], locations: [] as [], propertyTypes: [] as string[] },
    filters: {} as Record<string, never>,
    sort: "newest" as const,
    cursor: null,
    view: "list" as const,
    mapBounds: null,
    selectedPropertyId: null,
    distanceKm: null,
  },
  hasValidContext: false,
  setCursor: vi.fn(),
  setDistanceKm: vi.fn(),
  setMode: vi.fn(),
  setFilters: vi.fn(),
  applyFilters: vi.fn(),
  setSort: vi.fn(),
  setView: vi.fn(),
  setContext: vi.fn(),
  setMapBounds: vi.fn(),
  setSelectedPropertyId: vi.fn(),
  replaceSearchSetup: vi.fn(),
  resetFilters: vi.fn(),
};

const validRentContext = {
  state: {
    context: { mode: "rent" as const, city: "bengaluru", cities: [] as [], locations: [] as [], propertyTypes: [] as string[] },
    filters: {} as Record<string, never>,
    sort: "newest" as const,
    cursor: null,
    view: "list" as const,
    mapBounds: null,
    selectedPropertyId: null,
    distanceKm: null,
  },
  hasValidContext: true,
  setCursor: vi.fn(),
  setDistanceKm: vi.fn(),
  setMode: vi.fn(),
  setFilters: vi.fn(),
  applyFilters: vi.fn(),
  setSort: vi.fn(),
  setView: vi.fn(),
  setContext: vi.fn(),
  setMapBounds: vi.fn(),
  setSelectedPropertyId: vi.fn(),
  replaceSearchSetup: vi.fn(),
  resetFilters: vi.fn(),
};

// Default: no valid context (unresolved mode/city)
vi.mock("../state/useSearchState", () => ({
  useSearchState: vi.fn(),
}));

vi.mock("../data/searchDataClient", () => ({
  searchProperties: vi.fn(),
  overlayPropertyCounts: vi.fn((results: SearchPropertyResult[]) => Promise.resolve(results)),
  overlayFavourites: vi.fn((results: SearchPropertyResult[]) => results),
  buildSearchCursor: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeResult(id: string): SearchPropertyResult {
  return {
    id,
    detailUrl: `/property/${id}`,
    listingMode: "rent",
    propertyType: "apartment",
    bhk: "2BHK",
    primaryImageUrl: null,
    photoCount: 0,
    price: null,
    buildingName: "Test Building",
    locality: null,
    city: "bengaluru",
    locationMode: null,
    latitude: null,
    longitude: null,
    carpetAreaSqft: null,
    superBuiltUpSqft: null,
    furnishing: null,
    bathrooms: null,
    floorNumber: null,
    totalFloors: null,
    parking4w: null,
    parking2w: null,
    parking4wCount: null,
    parking2wCount: null,
    buildingAgeYears: null,
    possessionStatus: null,
    possessionDate: null,
    listerRole: "owner",
    responseHandledCount: 0,
    responseRatePct: null,
    viewCount: 0,
    commentCount: 0,
    experienceFeedback: null,
    listedAt: "2026-07-01T00:00:00Z",
    availabilityConfirmedAt: null,
    isFavourited: false,
    rentBrokerageType: null,
    rentBrokerageFixed: null,
    rentBrokerageMonths: null,
    saleBrokeragePct: null,
    securityDepositAmount: null,
    lockInMonths: null,
    noticePeriodDays: null,
    petPolicy: null,
    hasVideoWalkthrough: false,
    priceNegotiable: null,
    youtubeWalkthroughUrl: null,
  };
}

function wrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(MemoryRouter, null, children),
    );
}

// ─── mergeSearchPages (pure utility) ─────────────────────────────────────────

describe("mergeSearchPages", () => {
  it("appends incoming results to existing", () => {
    const page1 = [makeResult("a"), makeResult("b")];
    const page2 = [makeResult("c"), makeResult("d")];
    expect(mergeSearchPages(page1, page2)).toHaveLength(4);
  });

  it("deduplicates by ID — existing wins, order preserved", () => {
    const existing = [makeResult("a"), makeResult("b")];
    const incoming = [makeResult("b"), makeResult("c")]; // b is a dupe
    const merged = mergeSearchPages(existing, incoming);
    expect(merged).toHaveLength(3);
    expect(merged.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("returns empty when both are empty", () => {
    expect(mergeSearchPages([], [])).toEqual([]);
  });

  it("returns incoming when existing is empty (first page)", () => {
    const page1 = [makeResult("x"), makeResult("y")];
    expect(mergeSearchPages([], page1)).toEqual(page1);
  });

  it("does not mutate the existing array", () => {
    const existing = [makeResult("a")];
    const ref = existing;
    mergeSearchPages(existing, [makeResult("b")]);
    expect(existing).toBe(ref);
    expect(existing).toHaveLength(1);
  });
});

// ─── useSearchResults — disabled without valid context ────────────────────────

describe("useSearchResults — disabled without valid context", () => {
  beforeEach(() => {
    vi.mocked(useSearchState).mockReturnValue(invalidContext as ReturnType<typeof useSearchState>);
  });

  it("returns no results and no initial loading when context is invalid", async () => {
    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });
    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
      expect(result.current.results).toHaveLength(0);
    });
  });

  it("isEmpty=false when query is disabled (not a real empty result set)", async () => {
    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });
    await waitFor(() => {
      expect(result.current.isEmpty).toBe(false);
    });
  });

  it("error is null when disabled", async () => {
    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});

// ─── useSearchResults — valid context, data flows ─────────────────────────────

describe("useSearchResults — with valid context", () => {
  beforeEach(() => {
    vi.mocked(useSearchState).mockReturnValue(validRentContext as ReturnType<typeof useSearchState>);
  });

  it("returns results when searchProperties resolves", async () => {
    vi.mocked(searchProperties).mockResolvedValueOnce({
      results: [makeResult("p1"), makeResult("p2")],
      nextCursor: null,
      hasNextPage: false,
      totalCount: 0,
    });

    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(2);
      expect(result.current.results[0].id).toBe("p1");
      expect(result.current.results[1].id).toBe("p2");
    });
  });

  it("isEmpty=true when query resolves with empty array", async () => {
    vi.mocked(searchProperties).mockResolvedValueOnce({
      results: [],
      nextCursor: null,
      hasNextPage: false,
      totalCount: 0,
    });

    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.results).toHaveLength(0);
    });
  });

  it("error is exposed when searchProperties rejects", async () => {
    // Use mockRejectedValue (not Once) so retries also fail consistently
    vi.mocked(searchProperties).mockRejectedValue(new Error("DB error"));

    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    }, { timeout: 5000 });
  });
});

// ─── isRadiusFailure — unit ───────────────────────────────────────────────────

describe("isRadiusFailure", () => {
  it("returns true for plain PostgREST locality_no_representative_point object", () => {
    expect(isRadiusFailure({ message: "locality_no_representative_point", code: "P0001" })).toBe(true);
  });

  it("returns true for plain PostgREST radius_requires_locality object", () => {
    expect(isRadiusFailure({ message: "radius_requires_locality", code: "P0001" })).toBe(true);
  });

  it("returns true for Error instance with matching message", () => {
    expect(isRadiusFailure(new Error("locality_no_representative_point"))).toBe(true);
  });

  it("returns false for a plain object with unrelated message", () => {
    expect(isRadiusFailure({ message: "some_server_error", code: "P0001" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isRadiusFailure(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isRadiusFailure(undefined)).toBe(false);
  });

  it("returns false for plain object with no message field", () => {
    expect(isRadiusFailure({ code: "P0001" })).toBe(false);
  });
});

// ─── anonymous favourites ─────────────────────────────────────────────────────

describe("useSearchResults — anonymous favourites", () => {
  beforeEach(() => {
    vi.mocked(useSearchState).mockReturnValue(validRentContext as ReturnType<typeof useSearchState>);
    vi.mocked(searchProperties).mockResolvedValueOnce({
      results: [makeResult("p1"), makeResult("p2"), makeResult("p3")],
      nextCursor: null,
      hasNextPage: false,
      totalCount: 0,
    });
  });

  it("all results have isFavourited=false for anonymous users", async () => {
    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(3);
      expect(result.current.results.every((r) => r.isFavourited === false)).toBe(true);
    });
  });
});

// ─── radius failure recovery ──────────────────────────────────────────────────

const haralurLocality = {
  id: "geo-haralur",
  geoPlaceId: "geo-haralur",
  label: "Haralur",
  kind: "locality" as const,
};

function makeLocalityRadiusContext(distanceKm: number | null, setDistanceKm: ReturnType<typeof vi.fn>) {
  return {
    state: {
      context: {
        mode: "rent" as const,
        city: "bengaluru",
        cities: [] as [],
        locations: [haralurLocality],
        propertyTypes: [] as string[],
      },
      filters: { bhk: ["2"] } as Record<string, unknown>,
      sort: "newest" as const,
      cursor: null,
      view: "list" as const,
      mapBounds: null,
      selectedPropertyId: null,
      distanceKm,
    },
    hasValidContext: true,
    setCursor: vi.fn(),
    setDistanceKm,
    setMode: vi.fn(),
    setFilters: vi.fn(),
    applyFilters: vi.fn(),
    setSort: vi.fn(),
    setView: vi.fn(),
    setContext: vi.fn(),
    setMapBounds: vi.fn(),
    setSelectedPropertyId: vi.fn(),
    replaceSearchSetup: vi.fn(),
    resetFilters: vi.fn(),
  };
}

describe("useSearchResults — locality_no_representative_point recovery", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("suppresses error, shows notice, and calls setDistanceKm(null)", async () => {
    const setDistanceKm = vi.fn();
    vi.mocked(useSearchState).mockReturnValue(
      makeLocalityRadiusContext(5, setDistanceKm) as ReturnType<typeof useSearchState>,
    );
    vi.mocked(searchProperties).mockRejectedValue({
      message: "locality_no_representative_point",
      code: "P0001",
    });

    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });

    await waitFor(() => {
      expect(setDistanceKm).toHaveBeenCalledWith(null);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.distanceNotice).toBe(
      "Distance reset to Auto because radius search isn't available for this locality.",
    );
  });

  it("locality filter (bhk) is unchanged after recovery", async () => {
    const setDistanceKm = vi.fn();
    const ctx = makeLocalityRadiusContext(5, setDistanceKm);
    vi.mocked(useSearchState).mockReturnValue(ctx as ReturnType<typeof useSearchState>);
    vi.mocked(searchProperties).mockRejectedValue({
      message: "locality_no_representative_point",
      code: "P0001",
    });

    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });
    await waitFor(() => expect(setDistanceKm).toHaveBeenCalledWith(null));

    // The state the hook reads still has bhk=["2"] — we assert we didn't touch filters
    expect(result.current.results).toHaveLength(0);
    expect((ctx.state.filters as { bhk?: string[] }).bhk).toEqual(["2"]);
  });

  it("notice is NOT cleared when Auto query succeeds while 5-second timer is still active", async () => {
    const setDistanceKm = vi.fn();

    vi.mocked(useSearchState).mockReturnValue(
      makeLocalityRadiusContext(5, setDistanceKm) as ReturnType<typeof useSearchState>,
    );
    vi.mocked(searchProperties).mockRejectedValue({
      message: "locality_no_representative_point",
      code: "P0001",
    });

    const { result, rerender } = renderHook(() => useSearchResults(), { wrapper: wrapper() });

    // Wait for recovery notice to appear
    await waitFor(() => {
      expect(result.current.distanceNotice).toBe(
        "Distance reset to Auto because radius search isn't available for this locality.",
      );
    }, { timeout: 5000 });

    // Simulate Auto state (distanceKm=null), Auto query succeeds immediately
    vi.mocked(useSearchState).mockReturnValue(
      makeLocalityRadiusContext(null, setDistanceKm) as ReturnType<typeof useSearchState>,
    );
    vi.mocked(searchProperties).mockResolvedValue({
      results: [],
      nextCursor: null,
      hasNextPage: false,
      totalCount: 0,
    });
    rerender();

    // Wait for Auto query to succeed (isEmpty flips)
    await waitFor(() => expect(result.current.isEmpty).toBe(true), { timeout: 3000 });

    // Notice must STILL be visible — success-clear effect is guarded by noticeDismissRef
    // (the timer owns the notice lifecycle, not the query success)
    expect(result.current.distanceNotice).toBe(
      "Distance reset to Auto because radius search isn't available for this locality.",
    );
  });

  it("second km selection after reset triggers recovery again (radiusResetRef clears)", async () => {
    const setDistanceKm = vi.fn();

    // First cycle: distanceKm=5, fails
    vi.mocked(useSearchState).mockReturnValue(
      makeLocalityRadiusContext(5, setDistanceKm) as ReturnType<typeof useSearchState>,
    );
    vi.mocked(searchProperties).mockRejectedValue({
      message: "locality_no_representative_point",
      code: "P0001",
    });

    const { result, rerender } = renderHook(() => useSearchResults(), { wrapper: wrapper() });
    await waitFor(() => expect(setDistanceKm).toHaveBeenCalledTimes(1));

    // Simulate distanceKm reset to null (this clears radiusResetRef)
    vi.mocked(useSearchState).mockReturnValue(
      makeLocalityRadiusContext(null, setDistanceKm) as ReturnType<typeof useSearchState>,
    );
    vi.mocked(searchProperties).mockResolvedValue({
      results: [],
      nextCursor: null,
      hasNextPage: false,
      totalCount: 0,
    });
    rerender();
    await waitFor(() => expect(result.current.distanceNotice).toBeDefined());

    // Second cycle: user re-selects 5km, fails again
    vi.mocked(useSearchState).mockReturnValue(
      makeLocalityRadiusContext(5, setDistanceKm) as ReturnType<typeof useSearchState>,
    );
    vi.mocked(searchProperties).mockRejectedValue({
      message: "locality_no_representative_point",
      code: "P0001",
    });
    rerender();

    await waitFor(() => expect(setDistanceKm).toHaveBeenCalledTimes(2));
  });

  it("unrelated plain error surfaces as search.error (not suppressed)", async () => {
    const setDistanceKm = vi.fn();
    vi.mocked(useSearchState).mockReturnValue(
      makeLocalityRadiusContext(5, setDistanceKm) as ReturnType<typeof useSearchState>,
    );
    vi.mocked(searchProperties).mockRejectedValue({ message: "some_server_error", code: "P0001" });

    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });

    // Generous timeout — query-level retry (failureCount < 1) fires once with a TanStack delay
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    }, { timeout: 5000 });
    expect(setDistanceKm).not.toHaveBeenCalled();
  });
});
