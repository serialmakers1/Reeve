import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { mergeSearchPages, useSearchResults } from "../state/useSearchResults";
import type { SearchPropertyResult } from "../data/searchResultContract";
import { useSearchState } from "../state/useSearchState";
import { searchProperties } from "../data/searchDataClient";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
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
    context: { mode: null as null, city: null as null, locations: [] as [], propertyTypes: [] as string[] },
    filters: {} as Record<string, never>,
    sort: "newest" as const,
    cursor: null,
    view: "list" as const,
    mapBounds: null,
    selectedPropertyId: null,
  },
  hasValidContext: false,
  setCursor: vi.fn(),
  setMode: vi.fn(),
  setFilters: vi.fn(),
  setSort: vi.fn(),
  setView: vi.fn(),
  setContext: vi.fn(),
  setMapBounds: vi.fn(),
  resetFilters: vi.fn(),
};

const validRentContext = {
  state: {
    context: { mode: "rent" as const, city: "bengaluru", locations: [] as [], propertyTypes: [] as string[] },
    filters: {} as Record<string, never>,
    sort: "newest" as const,
    cursor: null,
    view: "list" as const,
    mapBounds: null,
    selectedPropertyId: null,
  },
  hasValidContext: true,
  setCursor: vi.fn(),
  setMode: vi.fn(),
  setFilters: vi.fn(),
  setSort: vi.fn(),
  setView: vi.fn(),
  setContext: vi.fn(),
  setMapBounds: vi.fn(),
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
    });

    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.results).toHaveLength(0);
    });
  });

  it("error is exposed when searchProperties rejects", async () => {
    vi.mocked(searchProperties).mockRejectedValueOnce(new Error("DB error"));

    const { result } = renderHook(() => useSearchResults(), { wrapper: wrapper() });

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
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
