import { describe, it, expect } from "vitest";
import { buildSearchInput } from "../state/buildSearchInput";
import { getDefaultSearchState } from "../domain/searchDefaults";
import { SEARCH_PAGE_SIZE } from "../data/searchContracts";
import type { SearchState, RentFilters, BuyFilters } from "../domain/searchTypes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BLR = {
  geoPlaceId: "blr-root", kind: "settlement" as const, label: "Bengaluru",
  settlementSubtype: "city" as const, searchRegionId: "blr-region", searchRegionLabel: "Bengaluru Urban",
};
const MUM = {
  geoPlaceId: "mum-root", kind: "settlement" as const, label: "Mumbai",
  settlementSubtype: "city" as const, searchRegionId: "mum-region", searchRegionLabel: "Mumbai",
};
// A canonical locality detail owned by BLR (enables an explicit distance radius).
const KORAMANGALA = {
  id: "kora-loc", geoPlaceId: "kora-loc", kind: "locality" as const, scopeRootId: "blr-root",
  label: "Koramangala", parentLabel: "Bengaluru", searchRegionLabel: "Bengaluru Urban",
};

function rentState(overrides: Partial<SearchState> = {}): SearchState {
  return {
    ...getDefaultSearchState("rent"),
    context: { mode: "rent", city: "bengaluru", cities: [BLR], locations: [], propertyTypes: [] },
    ...overrides,
  };
}

function buyState(overrides: Partial<SearchState> = {}): SearchState {
  return {
    ...getDefaultSearchState("buy"),
    context: { mode: "buy", city: "mumbai", cities: [MUM], locations: [], propertyTypes: [] },
    ...overrides,
  };
}

// ─── Disabled / null cases ────────────────────────────────────────────────────

describe("buildSearchInput — disabled cases", () => {
  it("returns null when mode is null", () => {
    expect(buildSearchInput(getDefaultSearchState(null))).toBeNull();
  });

  it("returns non-null with empty cityAnchors when no city is selected (city optional)", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: null, cities: [], locations: [], propertyTypes: [] },
    };
    const input = buildSearchInput(state);
    expect(input).not.toBeNull();
    expect(input!.geoPlaceIds).toEqual([]);
  });

  it("returns non-null for valid rent state", () => {
    expect(buildSearchInput(rentState())).not.toBeNull();
  });

  it("returns non-null for valid buy state", () => {
    expect(buildSearchInput(buyState())).not.toBeNull();
  });
});

// ─── Mode mapping ─────────────────────────────────────────────────────────────

describe("buildSearchInput — mode/listing_type mapping", () => {
  it("rent mode → mode=rent in output", () => {
    expect(buildSearchInput(rentState())!.mode).toBe("rent");
  });

  it("buy mode → mode=buy in output", () => {
    expect(buildSearchInput(buyState())!.mode).toBe("buy");
  });
});

// ─── Context fields ───────────────────────────────────────────────────────────

describe("buildSearchInput — context fields", () => {
  it("maps selected roots to canonical geoPlaceIds", () => {
    expect(buildSearchInput(rentState())!.geoPlaceIds).toEqual(["blr-root"]);
  });

  it("flattens roots + detail localities into deduped geoPlaceIds", () => {
    const state = rentState({
      context: {
        mode: "rent", city: "bengaluru", cities: [BLR],
        locations: [KORAMANGALA],
        propertyTypes: [],
      },
    });
    const input = buildSearchInput(state)!;
    expect(input.geoPlaceIds).toEqual(["blr-root", "kora-loc"]);
  });

  it("empty locations → only root geoPlaceIds", () => {
    expect(buildSearchInput(rentState())!.geoPlaceIds).toEqual(["blr-root"]);
  });

  it("distanceKm passes through only with a locality anchor; else null", () => {
    const withLocality = rentState({
      distanceKm: 5,
      context: { mode: "rent", city: "bengaluru", cities: [BLR], locations: [KORAMANGALA], propertyTypes: [] },
    });
    expect(buildSearchInput(withLocality)!.distanceKm).toBe(5);
    // city-only (no locality) → distance is inert, normalized to null
    expect(buildSearchInput(rentState({ distanceKm: 5 }))!.distanceKm).toBeNull();
    expect(buildSearchInput(rentState())!.distanceKm).toBeNull();
  });

  it("maps propertyTypes (single)", () => {
    const state = rentState({
      context: { mode: "rent", city: "bengaluru", cities: [BLR], locations: [], propertyTypes: ["apartment"] },
    });
    expect(buildSearchInput(state)!.propertyTypes).toEqual(["apartment"]);
  });

  it("maps propertyTypes (multiple)", () => {
    const state = rentState({
      context: {
        mode: "rent",
        city: "bengaluru",
        cities: [BLR],
        locations: [],
        propertyTypes: ["apartment", "duplex_apartment"],
      },
    });
    expect(buildSearchInput(state)!.propertyTypes).toEqual(["apartment", "duplex_apartment"]);
  });

  it("empty propertyTypes passes through", () => {
    expect(buildSearchInput(rentState())!.propertyTypes).toEqual([]);
  });
});

// ─── Rent filter mapping ──────────────────────────────────────────────────────

describe("buildSearchInput — rent filter mapping", () => {
  it("maps minPrice and maxPrice", () => {
    const state = rentState({ filters: { minPrice: 20000, maxPrice: 50000 } as RentFilters });
    const input = buildSearchInput(state)!;
    expect(input.minPrice).toBe(20000);
    expect(input.maxPrice).toBe(50000);
  });

  it("maps bhk array", () => {
    const state = rentState({ filters: { bhk: ["2BHK", "3BHK"] } as RentFilters });
    expect(buildSearchInput(state)!.bhk).toEqual(["2BHK", "3BHK"]);
  });

  it("maps furnishing array", () => {
    const state = rentState({ filters: { furnishing: ["semi_furnished"] } as RentFilters });
    expect(buildSearchInput(state)!.furnishing).toEqual(["semi_furnished"]);
  });

  it("maps petPolicy array", () => {
    const state = rentState({ filters: { petPolicy: ["allowed"] } as RentFilters });
    expect(buildSearchInput(state)!.petPolicy).toEqual(["allowed"]);
  });

  it("maps maxDeposit", () => {
    const state = rentState({ filters: { maxDeposit: 100000 } as RentFilters });
    expect(buildSearchInput(state)!.maxDeposit).toBe(100000);
  });

  it("maps maxLockIn", () => {
    const state = rentState({ filters: { maxLockIn: 11 } as RentFilters });
    expect(buildSearchInput(state)!.maxLockIn).toBe(11);
  });

  it("maps availabilityConfirmedWithin", () => {
    const state = rentState({ filters: { availabilityConfirmedWithin: 7 } as RentFilters });
    expect(buildSearchInput(state)!.availabilityConfirmedWithin).toBe(7);
  });

  it("maps availableBy", () => {
    const state = rentState({ filters: { availableBy: "2026-09-01" } as RentFilters });
    expect(buildSearchInput(state)!.availableBy).toBe("2026-09-01");
  });

  it("missing rent filters default to null/empty arrays", () => {
    const input = buildSearchInput(rentState())!;
    expect(input.minPrice).toBeNull();
    expect(input.maxPrice).toBeNull();
    expect(input.bhk).toEqual([]);
    expect(input.petPolicy).toEqual([]);
    expect(input.maxDeposit).toBeNull();
  });
});

// ─── Buy filter mapping ───────────────────────────────────────────────────────

describe("buildSearchInput — buy filter mapping", () => {
  it("maps possessionStatus array", () => {
    const state = buyState({ filters: { possessionStatus: ["ready_to_move"] } as BuyFilters });
    expect(buildSearchInput(state)!.possessionStatus).toEqual(["ready_to_move"]);
  });

  it("maps negotiable", () => {
    const state = buyState({ filters: { negotiable: true } as BuyFilters });
    expect(buildSearchInput(state)!.negotiable).toBe(true);
  });

  it("maps minCarpetArea and maxCarpetArea", () => {
    const state = buyState({ filters: { minCarpetArea: 800, maxCarpetArea: 1200 } as BuyFilters });
    const input = buildSearchInput(state)!;
    expect(input.minCarpetArea).toBe(800);
    expect(input.maxCarpetArea).toBe(1200);
  });

  it("maps reraDisclosed", () => {
    const state = buyState({ filters: { reraDisclosed: true } as BuyFilters });
    expect(buildSearchInput(state)!.reraDisclosed).toBe(true);
  });

  it("missing buy filters default to null/empty arrays", () => {
    const input = buildSearchInput(buyState())!;
    expect(input.possessionStatus).toEqual([]);
    expect(input.negotiable).toBeNull();
    expect(input.minCarpetArea).toBeNull();
  });
});

// ─── Shared filter mapping ────────────────────────────────────────────────────

describe("buildSearchInput — shared filters", () => {
  it("maps amenities", () => {
    const state = rentState({ filters: { amenities: ["gym", "lift"] } as RentFilters });
    expect(buildSearchInput(state)!.amenities).toEqual(["gym", "lift"]);
  });

  it("maps hasVideoWalkthrough=true", () => {
    const state = rentState({ filters: { hasVideoWalkthrough: true } as RentFilters });
    expect(buildSearchInput(state)!.hasVideoWalkthrough).toBe(true);
  });

  it("maps listedWithin", () => {
    const state = rentState({ filters: { listedWithin: 7 } as RentFilters });
    expect(buildSearchInput(state)!.listedWithin).toBe(7);
  });

  it("maps parking4w and parking2w", () => {
    const state = rentState({ filters: { parking4w: ["covered"], parking2w: ["uncovered"] } as RentFilters });
    const input = buildSearchInput(state)!;
    expect(input.parking4w).toEqual(["covered"]);
    expect(input.parking2w).toEqual(["uncovered"]);
  });
});

// ─── Sort and cursor ──────────────────────────────────────────────────────────

describe("buildSearchInput — sort and cursor", () => {
  it("passes sort through", () => {
    const state = rentState({ sort: "price_asc" });
    expect(buildSearchInput(state)!.sort).toBe("price_asc");
  });

  it("null cursor passes through as null", () => {
    expect(buildSearchInput(rentState())!.cursor).toBeNull();
  });

  it("non-null cursor passes through", () => {
    const cursor = { sort: "newest" as const, listedAt: "2026-07-01T00:00:00Z", id: "p1" };
    const state = rentState({ cursor });
    expect(buildSearchInput(state)!.cursor).toEqual(cursor);
  });

  it("limit is SEARCH_PAGE_SIZE", () => {
    expect(buildSearchInput(rentState())!.limit).toBe(SEARCH_PAGE_SIZE);
  });
});
