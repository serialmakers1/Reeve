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
import { resultHeaderLabel } from "../state/resultHeaderResolver";
import { getDefaultSearchState } from "../domain/searchDefaults";
import type { CityToken, LocationToken, SearchState } from "../domain/searchTypes";

const BLR: CityToken = { placeId: "city_blr", label: "Bengaluru", lat: 12.9716, lng: 77.5946, viewport: null };
const MUM: CityToken = { placeId: "city_mum", label: "Mumbai", lat: 19.076, lng: 72.8777, viewport: null };

const area = (id: string, label: string, cityId: string): LocationToken => ({
  id, label, type: "area", cityId, placeId: id, lat: 12.9, lng: 77.6,
  viewport: { sw: { lat: 12.85, lng: 77.55 }, ne: { lat: 12.95, lng: 77.65 } },
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
  it("matches canonical cityId === placeId", () => {
    expect(areaBelongsToCity(area("a", "Whitefield", "city_blr"), BLR)).toBe(true);
    expect(areaBelongsToCity(area("a", "Whitefield", "city_mum"), BLR)).toBe(false);
  });

  it("matches legacy label case-insensitively", () => {
    expect(areaBelongsToCity(area("a", "Whitefield", "bengaluru"), BLR)).toBe(true);
    expect(areaBelongsToCity(area("a", "Whitefield", "BENGALURU"), BLR)).toBe(true);
  });

  it("pruneOrphanAreas drops orphans when cities selected; drops ALL areas when no city", () => {
    const locs = [area("a", "Whitefield", "city_blr"), area("b", "Andheri", "city_mum")];
    expect(pruneOrphanAreas([MUM], locs).map((l) => l.id)).toEqual(["b"]);
    // Locked invariant: no selected city ⇒ no area filters at all.
    expect(pruneOrphanAreas([], locs)).toEqual([]);
  });

  it("pruneAreasForRemovedCity removes only the removed city's areas (legacy label)", () => {
    const locs = [area("a", "Whitefield", "bengaluru"), area("b", "Andheri", "city_mum")];
    // Removing "Bengaluru" (placeId city_blr) drops the legacy cityId="bengaluru" area.
    expect(pruneAreasForRemovedCity(BLR, locs).map((l) => l.id)).toEqual(["b"]);
  });
});

// ─── Multi-city label ─────────────────────────────────────────────────────────

describe("formatCitiesLabel", () => {
  it("0/1/2/3 cities", () => {
    expect(formatCitiesLabel([])).toBeNull();
    expect(formatCitiesLabel([BLR])).toBe("Bengaluru");
    expect(formatCitiesLabel([BLR, MUM])).toBe("Bengaluru +1");
    expect(formatCitiesLabel([BLR, MUM, { ...BLR, placeId: "c3", label: "Pune" }])).toBe("Bengaluru +2");
  });
});

// ─── URL round-trip + hydration invariants ────────────────────────────────────

describe("URL round-trip (multi-city + areas + distance)", () => {
  it("round-trips 2 cities + an owned area + distance", () => {
    const s = stateWith([BLR, MUM], [area("a", "Andheri", "city_mum")], 5);
    const back = parseSearchUrl(serializeSearchState(s));
    expect(back.context.cities.map((c) => c.placeId)).toEqual(["city_blr", "city_mum"]);
    expect(back.context.locations.map((l) => l.id)).toEqual(["a"]);
    expect(back.distanceKm).toBe(5);
  });

  it("drops an orphan area at hydration (Mumbai selected, Bengaluru area present)", () => {
    const s = stateWith([MUM], [area("a", "Whitefield", "city_blr")]);
    const back = parseSearchUrl(serializeSearchState(s));
    expect(back.context.cities.map((c) => c.placeId)).toEqual(["city_mum"]);
    expect(back.context.locations).toEqual([]);
  });

  it("normalizes distance to Auto when there is no anchor (raw ?dist=)", () => {
    const back = parseSearchUrl(new URLSearchParams("type=rent&dist=5"));
    expect(back.context.cities).toEqual([]);
    expect(back.distanceKm).toBeNull();
  });

  it("omits an inert distance from the serialized URL when no anchor", () => {
    const s: SearchState = { ...getDefaultSearchState("rent"), distanceKm: 5 };
    expect(serializeSearchState(s).has("dist")).toBe(false);
  });

  // Item 1 — crafted/stale/hostile URL reaching hydration DIRECTLY (no serializer in
  // the path, so it cannot sanitize the invalid state before parseSearchUrl sees it):
  // an Area + dist but NO cities_data must yield no areas and Auto distance.
  it("rejects an area-only crafted URL at hydration (no cities → no areas, distance Auto)", () => {
    const items = [{ id: "loc1", label: "Whitefield", type: "area", cityId: "city_blr", placeId: "loc1", lat: 12.97, lng: 77.75 }];
    const locationsData = btoa(JSON.stringify({ v: 1, items }));
    const params = new URLSearchParams();
    params.set("type", "rent");
    params.set("locations", "loc1");
    params.set("locations_data", locationsData);
    params.set("dist", "5");
    const back = parseSearchUrl(params);
    expect(back.context.cities).toEqual([]);
    expect(back.context.locations).toEqual([]);
    expect(back.distanceKm).toBeNull();
  });

  // Item 3 — normal persistence: valid Bengaluru + Mumbai, each owning one area,
  // survives a serialize→parse round-trip intact.
  it("preserves 2 cities and their respective areas across a round-trip", () => {
    const s = stateWith([BLR, MUM], [area("a", "Whitefield", "city_blr"), area("b", "Andheri", "city_mum")], null);
    const back = parseSearchUrl(serializeSearchState(s));
    expect(back.context.cities.map((c) => c.placeId)).toEqual(["city_blr", "city_mum"]);
    expect(back.context.locations.map((l) => l.id).sort()).toEqual(["a", "b"]);
  });
});

// ─── Anchors reach the RPC input ──────────────────────────────────────────────

describe("buildSearchInput — multi-city anchors", () => {
  it("emits every selected city as an anchor", () => {
    const input = buildSearchInput(stateWith([BLR, MUM]))!;
    expect(input.cityAnchors).toEqual([
      { placeId: "city_blr", lat: 12.9716, lng: 77.5946 },
      { placeId: "city_mum", lat: 19.076, lng: 72.8777 },
    ]);
  });
});

// ─── Header never collapses a multi-city search to one city ───────────────────

describe("resultHeaderLabel — multi-city", () => {
  it("shows the multi-city label, not just the first city", () => {
    expect(resultHeaderLabel(stateWith([BLR, MUM]), 30)).toBe("30 homes in Bengaluru +1");
  });
});
