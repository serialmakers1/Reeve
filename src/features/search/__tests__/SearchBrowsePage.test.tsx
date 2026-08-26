/**
 * Tests for the stale Search URL param canonicalization effect in SearchBrowsePage.
 * Only the STALE_SEARCH_PARAMS set ("view", "ne_lat", "ne_lng", "sw_lat", "sw_lng")
 * are stripped. All other params — including unknown keys — are preserved.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ── Mocks ────────────────────────────────────────────────────────────────────

const navigateSpy = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

vi.mock("@/features/search/state/useSearchState", () => ({
  useSearchState: () => ({
    state: {
      context: { mode: "rent", city: null, cities: [], locations: [], propertyTypes: [] },
      distanceKm: null,
      selectedPropertyId: null,
    },
    setMode: vi.fn(),
    hasValidContext: false,
    setContext: vi.fn(),
  }),
}));

vi.mock("@/features/search/state/useSearchResults", () => ({
  useSearchResults: () => ({
    results: [],
    hasNextPage: false,
    isInitialLoading: false,
    isLoadingMore: false,
    isRefreshing: false,
    isEmpty: true,
    error: null,
    loadMore: vi.fn(),
    locationReady: true,
    hydrationOutcome: null,
    distanceNotice: null,
    nextCursor: null,
    areaFallback: null,
  }),
}));

vi.mock("@/hooks/useFavourites", () => ({
  useFavourites: () => ({
    isFavourited: () => false,
    toggleFavourite: vi.fn(),
    isLoggedIn: false,
  }),
}));

vi.mock("@/features/search/hooks/useSearchMeta", () => ({ useSearchMeta: () => {} }));

vi.mock("@/features/search/state/useSearchBootstrap", () => ({
  useSearchBootstrap: () => ({
    status: "done",
    approxCity: null,
    ipNoticeCity: null,
    markUserInteracted: vi.fn(),
    recentCities: [],
    getCityMemory: vi.fn(),
    confirmSetup: vi.fn(),
    removeRememberedCity: vi.fn(),
    clearRememberedHistory: vi.fn(),
  }),
}));

vi.mock("@/components/Layout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/features/search/components/SearchSetupPanel", () => ({ SearchSetupPanel: () => null }));
vi.mock("@/features/search/components/SearchControlRow", () => ({ SearchControlRow: () => null }));
vi.mock("@/features/search/components/SearchFilterPanel", () => ({ SearchFilterPanel: () => null }));
vi.mock("@/features/search/components/list/SearchResultsList", () => ({ SearchResultsList: () => null }));
vi.mock("@/features/search/components/desktop/DesktopSearchToolbar", () => ({ DesktopSearchToolbar: () => null }));

// ── Helper ────────────────────────────────────────────────────────────────────

async function renderPage(search: string) {
  const { default: SearchBrowsePage } = await import("../SearchBrowsePage");
  render(
    <MemoryRouter initialEntries={[`/search${search}`]}>
      <Routes>
        <Route path="/search" element={<SearchBrowsePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  navigateSpy.mockClear();
  vi.resetModules();
});

describe("SearchBrowsePage — stale URL canonicalization", () => {
  it("strips view=split and calls navigate with replace:true", async () => {
    await renderPage("?view=split");
    expect(navigateSpy).toHaveBeenCalledWith("/search", { replace: true });
  });

  it("strips view=split while preserving filter params", async () => {
    await renderPage("?view=split&type=rent&city=bengaluru");
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/search\?/),
      { replace: true },
    );
    const [url] = navigateSpy.mock.calls[0];
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.has("view")).toBe(false);
    expect(params.get("type")).toBe("rent");
    expect(params.get("city")).toBe("bengaluru");
  });

  it("strips all four legacy map-bound params while preserving type=rent", async () => {
    await renderPage("?view=split&ne_lat=12.9&ne_lng=77.6&sw_lat=12.8&sw_lng=77.5&type=rent");
    const [url] = navigateSpy.mock.calls[0];
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.has("view")).toBe(false);
    expect(params.has("ne_lat")).toBe(false);
    expect(params.has("ne_lng")).toBe(false);
    expect(params.has("sw_lat")).toBe(false);
    expect(params.has("sw_lng")).toBe(false);
    expect(params.get("type")).toBe("rent");
  });

  it("does NOT call navigate when URL is already clean", async () => {
    await renderPage("?type=rent&city=bengaluru");
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("preserves unrelated unknown params (e.g. utm_source)", async () => {
    await renderPage("?utm_source=google&type=rent");
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it("produces no trailing ? when all params are stale", async () => {
    await renderPage("?view=split");
    const [url] = navigateSpy.mock.calls[0];
    expect(url).toBe("/search");
    expect(url).not.toContain("?");
  });
});
