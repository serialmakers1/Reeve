import { describe, it, expect } from "vitest";
import { serializeSearchState } from "../state/serializeSearchState";
import { parseSearchUrl } from "../state/parseSearchUrl";
import { normalizeSearchState } from "../state/searchStateUtils";
import { getDefaultSearchState } from "../domain/searchDefaults";
import type { SearchState, SearchCursor, RentFilters, BuyFilters } from "../domain/searchTypes";

function stringify(state: SearchState): string {
  return serializeSearchState(state).toString();
}

describe("serializeSearchState", () => {
  it("default rent state → only type=rent param", () => {
    const state = getDefaultSearchState("rent");
    const out = serializeSearchState(state);
    expect(out.get("type")).toBe("rent");
    expect(out.get("sort")).toBeNull(); // default omitted
    expect(out.get("view")).toBeNull();
    expect(out.get("page")).toBeNull();
  });

  it("default buy state → only type=buy param", () => {
    const state = getDefaultSearchState("buy");
    const out = serializeSearchState(state);
    expect(out.get("type")).toBe("buy");
    expect(out.get("sort")).toBeNull();
  });

  it("null mode → no type param", () => {
    const state = getDefaultSearchState(null);
    const out = serializeSearchState(state);
    expect(out.has("type")).toBe(false);
  });

  it("never writes 'sale' as the type param", () => {
    const state = getDefaultSearchState("buy");
    expect(serializeSearchState(state).get("type")).toBe("buy");
  });

  it("non-default sort appears in output", () => {
    const state = { ...getDefaultSearchState("rent"), sort: "price_asc" as const };
    expect(serializeSearchState(state).get("sort")).toBe("price_asc");
  });

  it("null cursor: no cursor param in URL", () => {
    const state = getDefaultSearchState("rent");
    expect(serializeSearchState(state).has("cursor")).toBe(false);
    expect(serializeSearchState(state).has("page")).toBe(false);
  });

  it("non-null cursor: cursor param present and parseable", () => {
    const cur: SearchCursor = { sort: "newest", listedAt: "2026-07-01T00:00:00Z", id: "xyz" };
    const state: SearchState = { ...getDefaultSearchState("rent"), cursor: cur };
    const out = serializeSearchState(state);
    expect(out.has("cursor")).toBe(true);
    const decoded = JSON.parse(atob(out.get("cursor")!));
    expect(decoded).toEqual(cur);
  });

  it("cursor with sort mismatch is omitted from URL", () => {
    // cursor.sort=price_asc but state.sort=newest → omit cursor
    const cur: SearchCursor = { sort: "price_asc", listedAt: "2026-07-01T00:00:00Z", id: "xyz", priceAmount: null };
    const state: SearchState = { ...getDefaultSearchState("rent"), sort: "newest", cursor: cur };
    expect(serializeSearchState(state).has("cursor")).toBe(false);
  });

  it("locations_data is written as v1 envelope", () => {
    const token = { id: "loc1", label: "Koramangala", type: "area" as const, cityId: "bengaluru", placeId: null, lat: null, lng: null, viewport: null };
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: "bengaluru", cities: [], locations: [token], propertyTypes: [] },
    };
    const out = serializeSearchState(state);
    expect(out.has("locations_data")).toBe(true);
    const parsed = JSON.parse(atob(out.get("locations_data")!));
    expect(parsed.v).toBe(1);
    expect(Array.isArray(parsed.items)).toBe(true);
    expect(parsed.items[0].id).toBe("loc1");
  });

  it('view="list" is omitted (default)', () => {
    const state = { ...getDefaultSearchState("rent"), view: "list" as const };
    expect(serializeSearchState(state).has("view")).toBe(false);
  });

  it('view="map" appears in output', () => {
    const state = { ...getDefaultSearchState("rent"), view: "map" as const };
    expect(serializeSearchState(state).get("view")).toBe("map");
  });

  it("mapBounds omitted when view is not map", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      view: "list",
      mapBounds: { ne: { lat: 13.1, lng: 77.8 }, sw: { lat: 12.8, lng: 77.4 } },
    };
    const out = serializeSearchState(state);
    expect(out.has("ne_lat")).toBe(false);
  });

  it("mapBounds written when view is map", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      view: "map",
      mapBounds: { ne: { lat: 13.1, lng: 77.8 }, sw: { lat: 12.8, lng: 77.4 } },
    };
    const out = serializeSearchState(state);
    expect(out.get("ne_lat")).toBe("13.1");
    expect(out.get("sw_lng")).toBe("77.4");
  });

  it("empty bhk array is omitted", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      filters: { bhk: [] } as RentFilters,
    };
    expect(serializeSearchState(state).has("bhk")).toBe(false);
  });

  it("non-empty bhk array is written as comma-separated string", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      filters: { bhk: ["2BHK", "3BHK"] } as RentFilters,
    };
    expect(serializeSearchState(state).get("bhk")).toBe("2BHK,3BHK");
  });

  // ── Location serialization ────────────────────────────────────────────────

  it("serializes location tokens: ids in locations, full json in locations_data", () => {
    const token = { id: "loc1", label: "Koramangala", type: "area" as const, cityId: "bengaluru", placeId: null, lat: null, lng: null, viewport: null };
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: "bengaluru", cities: [], locations: [token], propertyTypes: [] },
    };
    const out = serializeSearchState(state);
    expect(out.get("locations")).toBe("loc1");
    expect(out.has("locations_data")).toBe(true);
  });

  it("round-trip: state with two location tokens", () => {
    const tokens = [
      { id: "loc1", label: "Koramangala", type: "area" as const, cityId: "bengaluru", placeId: null, lat: null, lng: null, viewport: null },
      { id: "loc2", label: "Indiranagar", type: "area" as const, cityId: "bengaluru", placeId: null, lat: null, lng: null, viewport: null },
    ];
    // Areas require an owning canonical city (no city ⇒ no areas). Bengaluru owns both.
    const blr = { placeId: "city_blr", label: "Bengaluru", lat: 12.9716, lng: 77.5946, viewport: null };
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: "bengaluru", cities: [blr], locations: tokens, propertyTypes: [] },
    };
    const rt = parseSearchUrl(serializeSearchState(state));
    expect(rt.context.locations).toHaveLength(2);
    expect(rt.context.locations[0].id).toBe("loc1");
    expect(rt.context.locations[1].label).toBe("Indiranagar");
  });

  // ── Round-trip tests ──────────────────────────────────────────────────────

  it("round-trip: default rent state", () => {
    const state = getDefaultSearchState("rent");
    const rt = parseSearchUrl(serializeSearchState(state));
    expect(rt.context.mode).toBe("rent");
    expect(rt.sort).toBe("newest");
    expect(rt.cursor).toBeNull();
  });

  it("round-trip: default buy state", () => {
    const state = getDefaultSearchState("buy");
    const rt = parseSearchUrl(serializeSearchState(state));
    expect(rt.context.mode).toBe("buy");
  });

  it("round-trip: rent state with filters", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: "bengaluru", cities: [], locations: [], propertyTypes: [] },
      filters: { bhk: ["2BHK", "3BHK"], minPrice: 20000, maxPrice: 50000 } as RentFilters,
      sort: "price_asc",
    };
    const rt = parseSearchUrl(serializeSearchState(state));
    expect(rt.context.city).toBe("bengaluru");
    const rf = rt.filters as RentFilters;
    expect(rf.bhk).toEqual(["2BHK", "3BHK"]);
    expect(rf.minPrice).toBe(20000);
    expect(rt.sort).toBe("price_asc");
  });

  it("round-trip: buy state with filters", () => {
    const state: SearchState = {
      ...getDefaultSearchState("buy"),
      context: { mode: "buy", city: "mumbai", cities: [], locations: [], propertyTypes: [] },
      filters: {
        possessionStatus: ["ready_to_move"],
        negotiable: true,
        bhk: ["3BHK"],
      } as BuyFilters,
      sort: "price_desc",
    };
    const rt = parseSearchUrl(serializeSearchState(state));
    expect(rt.context.mode).toBe("buy");
    const bf = rt.filters as BuyFilters;
    expect(bf.possessionStatus).toEqual(["ready_to_move"]);
    expect(bf.negotiable).toBe(true);
  });

  it("round-trip equality: parseSearchUrl(serializeSearchState(state)) equals normalizeSearchState(state)", () => {
    const state: SearchState = {
      ...getDefaultSearchState("rent"),
      context: { mode: "rent", city: "bengaluru", cities: [], locations: [], propertyTypes: [] },
      filters: { bhk: ["1BHK"], maxPrice: 35000 } as RentFilters,
      sort: "price_desc",
    };
    const serialized = serializeSearchState(state);
    const rt = parseSearchUrl(serialized);
    const normalized = normalizeSearchState(state);
    expect(rt.context.mode).toBe(normalized.context.mode);
    expect(rt.context.city).toBe(normalized.context.city);
    expect(rt.sort).toBe(normalized.sort);
    expect(rt.cursor).toEqual(normalized.cursor);
    const rtf = rt.filters as RentFilters;
    const nf = normalized.filters as RentFilters;
    expect(rtf.bhk).toEqual(nf.bhk);
    expect(rtf.maxPrice).toBe(nf.maxPrice);
  });

  it("round-trip preserves cursor", () => {
    const cur: SearchCursor = { sort: "price_asc", listedAt: "2026-07-15T10:00:00Z", id: "prop-1", priceAmount: 45000 };
    const state: SearchState = {
      ...getDefaultSearchState("buy"),
      sort: "price_asc",
      context: { mode: "buy", city: "mumbai", cities: [], locations: [], propertyTypes: [] },
      cursor: cur,
    };
    const rt = parseSearchUrl(serializeSearchState(state));
    expect(rt.cursor).toEqual(cur);
  });
});
