import { describe, it, expect } from "vitest";
import {
  normalizeSearchState,
  changeSearchMode,
  clearIncompatibleFilters,
  hasValidSearchContext,
  buildReturnUrl,
} from "../state/searchStateUtils";
import { getDefaultSearchState } from "../domain/searchDefaults";
import type { SearchState, RentFilters, BuyFilters, LocationToken, CityToken } from "../domain/searchTypes";

const BLR_ID = "11111111-1111-1111-1111-111111111111";
const MUM_ID = "22222222-2222-2222-2222-222222222222";
const uuidOf = (key: string): string => {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${h.toString(16).padStart(8, "0")}-0000-0000-0000-000000000000`;
};
const BLR_ROOT: CityToken = {
  geoPlaceId: BLR_ID, kind: "settlement", label: "Bengaluru", settlementSubtype: "city",
};

function makeToken(id: string, scopeRootId: string): LocationToken {
  return {
    id: uuidOf(id), geoPlaceId: uuidOf(id), kind: "locality", scopeRootId, label: `Area ${id}`,
  };
}

describe("normalizeSearchState", () => {
  it("swaps reversed minPrice and maxPrice", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      filters: { minPrice: 50000, maxPrice: 20000 } as RentFilters,
    };
    const result = normalizeSearchState(state);
    const rf = result.filters as RentFilters;
    expect(rf.minPrice).toBe(20000);
    expect(rf.maxPrice).toBe(50000);
  });

  it("deduplicates locations by id", () => {
    const t = makeToken("loc1", BLR_ID);
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: {
        mode: "rent",
        city: "bengaluru",
        cities: [BLR_ROOT],
        locations: [t, t, makeToken("loc2", BLR_ID)],
        propertyTypes: [],
      },
    };
    const result = normalizeSearchState(state);
    expect(result.context.locations).toHaveLength(2);
  });

  it("trims locations to max 5", () => {
    const locations = Array.from({ length: 7 }, (_, i) => makeToken(`loc${i}`, BLR_ID));
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: "bengaluru", cities: [BLR_ROOT], locations, propertyTypes: [] },
    };
    const result = normalizeSearchState(state);
    expect(result.context.locations).toHaveLength(5);
  });

  it("removes details whose owning root is not selected", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: {
        mode: "rent",
        city: "bengaluru",
        cities: [BLR_ROOT],
        locations: [
          makeToken("loc1", BLR_ID),
          makeToken("loc2", MUM_ID), // root not selected
        ],
        propertyTypes: [],
      },
    };
    const result = normalizeSearchState(state);
    expect(result.context.locations).toHaveLength(1);
    expect(result.context.locations[0].id).toBe(uuidOf("loc1"));
  });

  it("cursor passthrough (null remains null)", () => {
    const state = getDefaultSearchState("rent");
    expect(normalizeSearchState(state).cursor).toBeNull();
  });

  it("clears availability_confirmed cursor when mode is buy", () => {
    const state: SearchState = {
      ...getDefaultSearchState("buy"),
      cursor: { sort: "availability_confirmed", listedAt: null, availabilityConfirmedAt: null, id: "abc" },
    };
    expect(normalizeSearchState(state).cursor).toBeNull();
  });

  it("preserves newest cursor when mode is buy", () => {
    const cur = { sort: "newest" as const, listedAt: "2026-07-01T00:00:00Z", id: "abc" };
    const state: SearchState = { ...getDefaultSearchState("buy"), cursor: cur };
    expect(normalizeSearchState(state).cursor).toEqual(cur);
  });

  it("does not mutate the input", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      filters: { minPrice: 50000, maxPrice: 20000 } as RentFilters,
    };
    const original = (state.filters as RentFilters).minPrice;
    normalizeSearchState(state);
    expect((state.filters as RentFilters).minPrice).toBe(original);
  });
});

describe("changeSearchMode", () => {
  it("rent → buy: preserves city and BHK", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: "bengaluru", cities: [], locations: [], propertyTypes: [] },
      filters: { bhk: ["2BHK", "3BHK"], maxDeposit: 100000 } as RentFilters,
    };
    const result = changeSearchMode(state, "buy");
    expect(result.context.mode).toBe("buy");
    expect(result.context.city).toBe("bengaluru");
    const bf = result.filters as BuyFilters;
    expect(bf.bhk).toEqual(["2BHK", "3BHK"]);
  });

  it("rent → buy: drops rent-only filters (maxDeposit, maxLockIn, petPolicy, etc.)", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      filters: {
        bhk: ["2BHK"],
        maxDeposit: 100000,
        maxLockIn: 11,
        petPolicy: ["allowed"],
        availableBy: "2026-09-01",
        availabilityConfirmedWithin: 7,
      } as RentFilters,
    };
    const result = changeSearchMode(state, "buy");
    const bf = result.filters as BuyFilters;
    expect((bf as Record<string, unknown>).maxDeposit).toBeUndefined();
    expect((bf as Record<string, unknown>).maxLockIn).toBeUndefined();
    expect((bf as Record<string, unknown>).petPolicy).toBeUndefined();
    expect((bf as Record<string, unknown>).availableBy).toBeUndefined();
    expect((bf as Record<string, unknown>).availabilityConfirmedWithin).toBeUndefined();
    expect(bf.bhk).toEqual(["2BHK"]); // preserved
  });

  it("rent → buy: resets availability_confirmed sort to newest", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      sort: "availability_confirmed",
    };
    const result = changeSearchMode(state, "buy");
    expect(result.sort).toBe("newest");
  });

  it("rent → buy: budget clears (minPrice and maxPrice dropped)", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      filters: { bhk: ["2BHK"], minPrice: 30000, maxPrice: 60000 } as RentFilters,
    };
    const result = changeSearchMode(state, "buy");
    const bf = result.filters as Record<string, unknown>;
    expect(bf.minPrice).toBeUndefined();
    expect(bf.maxPrice).toBeUndefined();
  });

  it("rent → buy: petPolicy, maxDeposit, maxLockIn, maxNotice clear", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      filters: {
        petPolicy: ["allowed"],
        maxDeposit: 200000,
        maxLockIn: 11,
        maxNotice: 30,
      } as RentFilters,
    };
    const result = changeSearchMode(state, "buy");
    const bf = result.filters as Record<string, unknown>;
    expect(bf.petPolicy).toBeUndefined();
    expect(bf.maxDeposit).toBeUndefined();
    expect(bf.maxLockIn).toBeUndefined();
    expect(bf.maxNotice).toBeUndefined();
  });

  it("rent → buy: amenities, bhk, parking4w, listedWithin preserved", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      filters: {
        bhk: ["2BHK"],
        amenities: ["gym"],
        parking4w: ["covered"],
        listedWithin: 7,
      } as RentFilters,
    };
    const result = changeSearchMode(state, "buy");
    const bf = result.filters as BuyFilters;
    expect(bf.bhk).toEqual(["2BHK"]);
    expect(bf.amenities).toEqual(["gym"]);
    expect(bf.parking4w).toEqual(["covered"]);
    expect(bf.listedWithin).toBe(7);
  });

  it("rent → buy: sort=price_asc remains (compatible)", () => {
    const state = { ...getDefaultSearchState("rent"), sort: "price_asc" as const };
    expect(changeSearchMode(state, "buy").sort).toBe("price_asc");
  });

  it("buy → rent: budget clears", () => {
    const state: SearchState = {
      ...getDefaultSearchState("buy"),
      filters: { bhk: ["3BHK"], minPrice: 5000000, maxPrice: 12000000 } as BuyFilters,
    };
    const result = changeSearchMode(state, "rent");
    const rf = result.filters as Record<string, unknown>;
    expect(rf.minPrice).toBeUndefined();
    expect(rf.maxPrice).toBeUndefined();
  });

  it("buy → rent: possessionStatus, negotiable clear; furnishing, bhk preserved", () => {
    const state: SearchState = {
      ...getDefaultSearchState("buy"),
      filters: {
        bhk: ["3BHK"],
        furnishing: ["semi_furnished"],
        possessionStatus: ["ready_to_move"],
        negotiable: true,
      } as BuyFilters,
    };
    const result = changeSearchMode(state, "rent");
    const rf = result.filters as RentFilters & Record<string, unknown>;
    expect(rf.bhk).toEqual(["3BHK"]);
    expect(rf.furnishing).toEqual(["semi_furnished"]);
    expect(rf.possessionStatus).toBeUndefined();
    expect(rf.negotiable).toBeUndefined();
  });

  it("buy → rent: sort does not reset (all buy sorts valid in rent)", () => {
    const state = { ...getDefaultSearchState("buy"), sort: "price_desc" as const };
    expect(changeSearchMode(state, "rent").sort).toBe("price_desc");
  });

  it("buy → rent: preserves city and BHK", () => {
    const state: SearchState = {
      ...getDefaultSearchState("buy"),
      context: { mode: "buy", city: "mumbai", cities: [], locations: [], propertyTypes: [] },
      filters: { bhk: ["3BHK"], negotiable: true, possessionStatus: ["ready_to_move"] } as BuyFilters,
    };
    const result = changeSearchMode(state, "rent");
    expect(result.context.mode).toBe("rent");
    const rf = result.filters as RentFilters;
    expect(rf.bhk).toEqual(["3BHK"]);
    expect((rf as Record<string, unknown>).negotiable).toBeUndefined();
    expect((rf as Record<string, unknown>).possessionStatus).toBeUndefined();
  });

  it("does not mutate the input", () => {
    const state = getDefaultSearchState("rent");
    changeSearchMode(state, "buy");
    expect(state.context.mode).toBe("rent");
  });

  it("resets cursor to null on mode change", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      cursor: { sort: "newest" as const, listedAt: "2026-07-01T00:00:00Z", id: "abc" },
    };
    expect(changeSearchMode(state, "buy").cursor).toBeNull();
  });
});

describe("clearIncompatibleFilters", () => {
  it("removes buy-only fields when mode is buy then applied again", () => {
    // clearIncompatibleFilters re-applies changeSearchMode to current mode
    const state: SearchState = {
      ...getDefaultSearchState("buy"),
      filters: { bhk: ["2BHK"], possessionStatus: ["ready_to_move"] } as BuyFilters,
    };
    const result = clearIncompatibleFilters(state);
    expect(result.context.mode).toBe("buy");
    const bf = result.filters as BuyFilters;
    expect(bf.bhk).toEqual(["2BHK"]);
    expect(bf.possessionStatus).toEqual(["ready_to_move"]);
  });

  it("returns state unchanged when mode is null", () => {
    const state = getDefaultSearchState(null);
    expect(clearIncompatibleFilters(state)).toBe(state);
  });
});

describe("hasValidSearchContext", () => {
  it("returns true when mode and city are both set", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: "bengaluru", cities: [], locations: [], propertyTypes: [] },
    };
    expect(hasValidSearchContext(state)).toBe(true);
  });

  it("returns false when mode is null", () => {
    const state = getDefaultSearchState(null);
    expect(hasValidSearchContext(state)).toBe(false);
  });

  it("returns true when city is null (city is optional — mode alone is valid)", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: null, cities: [], locations: [], propertyTypes: [] },
    };
    expect(hasValidSearchContext(state)).toBe(true);
  });

  it("returns true when city is empty string (city is optional)", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: "", cities: [], locations: [], propertyTypes: [] },
    };
    expect(hasValidSearchContext(state)).toBe(true);
  });
});


describe("buildReturnUrl", () => {
  it("returns combined pathname + search", () => {
    expect(buildReturnUrl("/search", "?type=rent&city=bengaluru")).toBe(
      "/search?type=rent&city=bengaluru",
    );
  });

  it("works with empty search string", () => {
    expect(buildReturnUrl("/search", "")).toBe("/search");
  });

  it("throws for external http URL", () => {
    expect(() => buildReturnUrl("http://evil.com", "")).toThrow();
  });

  it("throws for https URL", () => {
    expect(() => buildReturnUrl("https://evil.com/path", "")).toThrow();
  });

  it("throws for protocol-relative URL", () => {
    expect(() => buildReturnUrl("//evil.com", "")).toThrow();
  });

  it("throws when pathname does not start with /", () => {
    expect(() => buildReturnUrl("evil.com/path", "")).toThrow();
  });

  it("preserves query string in returnTo", () => {
    expect(buildReturnUrl("/search", "?type=rent&city=bengaluru&bhk=2BHK,3BHK"))
      .toBe("/search?type=rent&city=bengaluru&bhk=2BHK,3BHK");
  });
});
