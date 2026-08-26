import { describe, it, expect } from "vitest";
import {
  areaBelongsToCity,
  pruneOrphanAreas,
  pruneAreasForRemovedCity,
  formatCitiesLabel,
} from "../state/searchStateUtils";
import { serializeSearchState } from "../state/serializeSearchState";
import { parseSearchUrl } from "../state/parseSearchUrl";
import { buildSearchInput } from "../state/buildSearchInput";
import { getDefaultSearchState } from "../domain/searchDefaults";
import type { CityToken, LocationToken, SearchState } from "../domain/searchTypes";

// Canonical geo_place UUIDs (validators require real UUIDs on the URL boundary).
const BLR_ID = "11111111-1111-1111-1111-111111111111";
const MUM_ID = "22222222-2222-2222-2222-222222222222";
const PUNE_ID = "55555555-5555-5555-5555-555555555555";
const A_ID = "33333333-3333-3333-3333-333333333333";
const B_ID = "44444444-4444-4444-4444-444444444444";

const BLR: CityToken = {
  geoPlaceId: BLR_ID, kind: "settlement", label: "Bengaluru", settlementSubtype: "city",
};
const MUM: CityToken = {
  geoPlaceId: MUM_ID, kind: "settlement", label: "Mumbai", settlementSubtype: "city",
};

const locality = (id: string, label: string, scopeRootId: string): LocationToken => ({
  id, geoPlaceId: id, kind: "locality", scopeRootId, label,
});

function stateWith(cities: CityToken[], locations: LocationToken[] = [], distanceKm: number | null = null): SearchState {
  return {
    ...getDefaultSearchState("rent"),
    context: { mode: "rent", city: cities[0]?.label.toLowerCase() ?? null, cities, locations, propertyTypes: [] },
    distanceKm,
  };
}

// ─── Ownership helper (shared by hydration + removal) ─────────────────────────

describe("areaBelongsToCity / pruning", () => {
  it("matches canonical scopeRootId === geoPlaceId", () => {
    expect(areaBelongsToCity(locality(A_ID, "Whitefield", BLR_ID), BLR)).toBe(true);
    expect(areaBelongsToCity(locality(A_ID, "Whitefield", MUM_ID), BLR)).toBe(false);
  });

  it("pruneOrphanAreas drops orphans when cities selected; drops ALL areas when no city", () => {
    const locs = [locality(A_ID, "Whitefield", BLR_ID), locality(B_ID, "Andheri", MUM_ID)];
    expect(pruneOrphanAreas([MUM], locs).map((l) => l.id)).toEqual([B_ID]);
    // Locked invariant: no selected city ⇒ no area filters at all.
    expect(pruneOrphanAreas([], locs)).toEqual([]);
  });

  it("pruneAreasForRemovedCity removes only the removed city's areas", () => {
    const locs = [locality(A_ID, "Whitefield", BLR_ID), locality(B_ID, "Andheri", MUM_ID)];
    expect(pruneAreasForRemovedCity(BLR, locs).map((l) => l.id)).toEqual([B_ID]);
  });
});

// ─── Multi-city label ─────────────────────────────────────────────────────────

describe("formatCitiesLabel", () => {
  it("0/1/2/3 cities", () => {
    expect(formatCitiesLabel([])).toBeNull();
    expect(formatCitiesLabel([BLR])).toBe("Bengaluru");
    expect(formatCitiesLabel([BLR, MUM])).toBe("Bengaluru +1");
    expect(formatCitiesLabel([BLR, MUM, { ...BLR, geoPlaceId: PUNE_ID, label: "Pune" }])).toBe("Bengaluru +2");
  });
});

// ─── URL round-trip + hydration invariants ────────────────────────────────────

describe("URL round-trip (multi-city + areas + distance)", () => {
  it("round-trips 2 cities + an owned locality + distance", () => {
    const s = stateWith([BLR, MUM], [locality(A_ID, "Andheri", MUM_ID)], 5);
    const back = parseSearchUrl(serializeSearchState(s));
    expect(back.context.cities.map((c) => c.geoPlaceId)).toEqual([BLR_ID, MUM_ID]);
    expect(back.context.locations.map((l) => l.id)).toEqual([A_ID]);
    expect(back.distanceKm).toBe(5);
  });

  it("drops an orphan area at hydration (Mumbai selected, Bengaluru locality present)", () => {
    const s = stateWith([MUM], [locality(A_ID, "Whitefield", BLR_ID)]);
    const back = parseSearchUrl(serializeSearchState(s));
    expect(back.context.cities.map((c) => c.geoPlaceId)).toEqual([MUM_ID]);
    expect(back.context.locations).toEqual([]);
  });

  it("normalizes distance to Auto when there is no locality anchor (raw ?dist=)", () => {
    const back = parseSearchUrl(new URLSearchParams("type=rent&dist=5"));
    expect(back.context.cities).toEqual([]);
    expect(back.distanceKm).toBeNull();
  });

  it("omits an inert distance from the serialized URL when no anchor", () => {
    const s: SearchState = { ...getDefaultSearchState("rent"), distanceKm: 5 };
    expect(serializeSearchState(s).has("dist")).toBe(false);
  });

  // Crafted/stale/hostile URL reaching hydration DIRECTLY: a detail + dist but NO
  // cities_data must yield no areas and Auto distance.
  it("rejects an area-only crafted URL at hydration (no cities → no areas, distance Auto)", () => {
    const items = [{ id: A_ID, kind: "locality", label: "Whitefield", scopeRootId: BLR_ID }];
    const locationsData = btoa(JSON.stringify({ v: 1, items }));
    const params = new URLSearchParams();
    params.set("type", "rent");
    params.set("locations", A_ID);
    params.set("locations_data", locationsData);
    params.set("dist", "5");
    const back = parseSearchUrl(params);
    expect(back.context.cities).toEqual([]);
    expect(back.context.locations).toEqual([]);
    expect(back.distanceKm).toBeNull();
  });

  it("preserves 2 cities and their respective localities across a round-trip", () => {
    const s = stateWith([BLR, MUM], [locality(A_ID, "Whitefield", BLR_ID), locality(B_ID, "Andheri", MUM_ID)], null);
    const back = parseSearchUrl(serializeSearchState(s));
    expect(back.context.cities.map((c) => c.geoPlaceId)).toEqual([BLR_ID, MUM_ID]);
    expect(back.context.locations.map((l) => l.id).sort()).toEqual([A_ID, B_ID].sort());
  });
});

// ─── Canonical UUIDs reach the RPC input ──────────────────────────────────────

describe("buildSearchInput — multi-city geoPlaceIds", () => {
  it("emits every selected root as a canonical UUID", () => {
    const input = buildSearchInput(stateWith([BLR, MUM]))!;
    expect(input.geoPlaceIds).toEqual([BLR_ID, MUM_ID]);
  });
});

