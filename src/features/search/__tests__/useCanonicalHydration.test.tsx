import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCanonicalHydration } from "../state/useCanonicalHydration";
import { useSearchState } from "../state/useSearchState";
import { geoByIds, type GeoSuggestRow } from "../data/geoSuggestClient";
import type { CityToken, LocationToken, SearchState } from "../domain/searchTypes";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

vi.mock("../state/useSearchState", () => ({ useSearchState: vi.fn() }));

// Keep the real row→token mappers; only geoByIds is controllable.
vi.mock("../data/geoSuggestClient", async () => {
  const actual = await vi.importActual<typeof import("../data/geoSuggestClient")>(
    "../data/geoSuggestClient",
  );
  return { ...actual, geoByIds: vi.fn() };
});

// ─── Canonical fixtures (A and B are distinct geographies) ────────────────────

const RA = "aaaaaaaa-0000-0000-0000-000000000001";
const DA = "aaaaaaaa-0000-0000-0000-000000000002";
const RB = "bbbbbbbb-0000-0000-0000-000000000001";
const DB = "bbbbbbbb-0000-0000-0000-000000000002";

const root = (id: string, label: string): CityToken => ({
  geoPlaceId: id, kind: "settlement", label, settlementSubtype: "city",
});
const detail = (id: string, scopeRootId: string, label: string): LocationToken => ({
  id, geoPlaceId: id, kind: "locality", scopeRootId, label,
});

function stateWith(cities: CityToken[], locations: LocationToken[]): SearchState {
  return {
    context: { mode: "rent", city: cities[0]?.label.toLowerCase() ?? null, cities, locations, propertyTypes: [] },
    filters: {},
    sort: "newest",
    cursor: null,
    selectedPropertyId: null,
    distanceKm: null,
  };
}

const rowsForA: GeoSuggestRow[] = [
  { id: RA, display_name: "CityA", kind: "settlement", settlement_subtype: "city", parent_geo_place_id: null, parent_display_name: null, search_region_id: null, search_region_display_name: null },
  { id: DA, display_name: "LocA", kind: "locality", settlement_subtype: null, parent_geo_place_id: RA, parent_display_name: "CityA", search_region_id: null, search_region_display_name: null },
];

const replaceSearchSetup = vi.fn();

function mockStateReturn(state: SearchState) {
  vi.mocked(useSearchState).mockReturnValue({
    state,
    replaceSearchSetup,
    // Unused by the hook, present for shape completeness.
    setContext: vi.fn(), setMode: vi.fn(), setFilters: vi.fn(), applyFilters: vi.fn(),
    setSort: vi.fn(), setView: vi.fn(), setCursor: vi.fn(), setDistanceKm: vi.fn(),
    setMapBounds: vi.fn(), setSelectedPropertyId: vi.fn(), resetFilters: vi.fn(),
    hasValidContext: true,
  } as unknown as ReturnType<typeof useSearchState>);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useCanonicalHydration — stale-guard against a newer user selection", () => {
  it.each(["success", "failure"] as const)(
    "a late %s response for geography A never overwrites a newer selection B",
    async (mode) => {
      // Controllable pending geoByIds — resolves/rejects only when we say so.
      let resolveA!: (rows: GeoSuggestRow[]) => void;
      let rejectA!: (e: unknown) => void;
      const pending = new Promise<GeoSuggestRow[]>((res, rej) => {
        resolveA = res;
        rejectA = rej;
      });
      vi.mocked(geoByIds).mockReturnValue(pending);

      // Mount with geography A → hook captures A's signature + starts the request.
      mockStateReturn(stateWith([root(RA, "CityA")], [detail(DA, RA, "LocA")]));
      const { result, rerender } = renderHook(() => useCanonicalHydration());
      expect(result.current.locationReady).toBe(false);

      // User changes geography to B while A is still in flight.
      mockStateReturn(stateWith([root(RB, "CityB")], [detail(DB, RB, "LocB")]));
      rerender();

      // The old A request now completes (either way).
      if (mode === "success") resolveA(rowsForA);
      else rejectA(new Error("network"));

      // The stale response is discarded: no replace, and the gate opens on B.
      await waitFor(() => expect(result.current.locationReady).toBe(true));
      expect(replaceSearchSetup).not.toHaveBeenCalled();
      // hydrationOutcome must be null — the stale response was discarded
      expect(result.current.hydrationOutcome).toBe(null);
    },
  );
});

describe("useCanonicalHydration — hydrationOutcome", () => {
  it("returns ok when all IDs resolve successfully", async () => {
    vi.mocked(geoByIds).mockResolvedValue(rowsForA);

    mockStateReturn(stateWith([root(RA, "CityA")], [detail(DA, RA, "LocA")]));
    const { result } = renderHook(() => useCanonicalHydration());

    await waitFor(() => expect(result.current.locationReady).toBe(true));
    expect(result.current.hydrationOutcome).toBe("ok");
  });

  it("returns partial when some IDs resolve and some are dropped", async () => {
    // Only root resolves — locality is missing from the response
    vi.mocked(geoByIds).mockResolvedValue([rowsForA[0]]); // only RA, not DA

    mockStateReturn(stateWith([root(RA, "CityA")], [detail(DA, RA, "LocA")]));
    const { result } = renderHook(() => useCanonicalHydration());

    await waitFor(() => expect(result.current.locationReady).toBe(true));
    expect(result.current.hydrationOutcome).toBe("partial");
  });

  it("returns failed when geoByIds throws", async () => {
    vi.mocked(geoByIds).mockRejectedValue(new Error("network"));

    mockStateReturn(stateWith([root(RA, "CityA")], []));
    const { result } = renderHook(() => useCanonicalHydration());

    await waitFor(() => expect(result.current.locationReady).toBe(true));
    expect(result.current.hydrationOutcome).toBe("failed");
    expect(replaceSearchSetup).toHaveBeenCalledWith(
      expect.objectContaining({ cities: [], locations: [] }),
    );
  });
});
