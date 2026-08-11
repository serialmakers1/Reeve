import { describe, it, expect } from "vitest";
import { parseSearchUrl } from "../state/parseSearchUrl";

function p(qs: string): URLSearchParams {
  return new URLSearchParams(qs);
}

// A selected Bengaluru city so legacy `cityId:"bengaluru"` area tokens satisfy the
// Area→City invariant (no city ⇒ no areas). Appended to area-survival URLs.
const CITIES_BLR = btoa(JSON.stringify({
  v: 1,
  items: [{ placeId: "city_blr", label: "Bengaluru", lat: 12.9716, lng: 77.5946 }],
}));
const withBlr = (qs: string): string => `${qs}&cities=city_blr&cities_data=${CITIES_BLR}`;

describe("parseSearchUrl", () => {
  // Map/Split are gated off (SEARCH_MAP_ENABLED=false) → any view normalizes to list.
  it("normalizes view=map to list (Map/Split gated off)", () => {
    expect(parseSearchUrl(p("type=rent&view=map")).view).toBe("list");
  });
  it("normalizes view=split to list (Map/Split gated off)", () => {
    expect(parseSearchUrl(p("type=rent&view=split")).view).toBe("list");
  });

  it("returns default state for empty params (mode defaults to rent)", () => {
    const state = parseSearchUrl(p(""));
    expect(state.context.mode).toBe("rent");
    expect(state.context.city).toBeNull();
    expect(state.context.locations).toEqual([]);
    expect(state.sort).toBe("newest");
    expect(state.view).toBe("list");
    expect(state.cursor).toBeNull();
    expect(state.mapBounds).toBeNull();
    expect(state.selectedPropertyId).toBeNull();
  });

  it("parses type=rent", () => {
    expect(parseSearchUrl(p("type=rent")).context.mode).toBe("rent");
  });

  it("parses type=buy", () => {
    expect(parseSearchUrl(p("type=buy")).context.mode).toBe("buy");
  });

  it("normalizes type=sale to buy mode", () => {
    const state = parseSearchUrl(p("type=sale"));
    expect(state.context.mode).toBe("buy");
  });

  it("returns null mode for type=invalid", () => {
    expect(parseSearchUrl(p("type=invalid")).context.mode).toBeNull();
  });

  it("lowercases city", () => {
    const state = parseSearchUrl(p("type=rent&city=Bengaluru"));
    expect(state.context.city).toBe("bengaluru");
  });

  it("returns null city when city is missing", () => {
    expect(parseSearchUrl(p("type=rent")).context.city).toBeNull();
  });

  it("filters invalid bhk values and deduplicates", () => {
    const state = parseSearchUrl(p("type=rent&bhk=2BHK,INVALID,3BHK,2BHK"));
    const rf = state.filters as { bhk?: string[] };
    expect(rf.bhk).toEqual(["2BHK", "3BHK"]);
  });

  it("keeps all five locations when exactly five are present", () => {
    // Build 5 tokens
    const tokens = Array.from({ length: 5 }, (_, i) => ({
      id: `loc${i}`,
      label: `Area ${i}`,
      type: "area",
      cityId: "bengaluru",
      placeId: null,
    }));
    const ids = tokens.map((t) => t.id).join(",");
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=${ids}&locations_data=${data}`)));
    expect(state.context.locations).toHaveLength(5);
  });

  it("parses an area viewport from locations_data (persisted for geographic filtering)", () => {
    const tokens = [
      {
        id: "loc1", label: "Whitefield", type: "area", cityId: "bengaluru", placeId: "p1",
        viewport: { sw: { lat: 12.9, lng: 77.7 }, ne: { lat: 13.0, lng: 77.8 } },
      },
    ];
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=loc1&locations_data=${data}`)));
    expect(state.context.locations[0].viewport).toEqual({
      sw: { lat: 12.9, lng: 77.7 },
      ne: { lat: 13.0, lng: 77.8 },
    });
  });

  it("sets viewport null when locations_data omits/has malformed viewport", () => {
    const tokens = [{ id: "loc1", label: "A", type: "area", cityId: "bengaluru", placeId: "p1" }];
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=loc1&locations_data=${data}`)));
    expect(state.context.locations[0].viewport).toBeNull();
  });

  it("trims to five locations when six are provided", () => {
    const tokens = Array.from({ length: 6 }, (_, i) => ({
      id: `loc${i}`,
      label: `Area ${i}`,
      type: "area",
      cityId: "bengaluru",
      placeId: null,
    }));
    const ids = tokens.map((t) => t.id).join(",");
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=${ids}&locations_data=${data}`)));
    expect(state.context.locations).toHaveLength(5);
    expect(state.context.locations[0].id).toBe("loc0");
    expect(state.context.locations[4].id).toBe("loc4");
  });

  it("swaps minPrice/maxPrice when min > max", () => {
    const state = parseSearchUrl(p("type=rent&min=50000&max=30000"));
    const rf = state.filters as { minPrice?: number; maxPrice?: number };
    expect(rf.minPrice).toBe(30000);
    expect(rf.maxPrice).toBe(50000);
  });

  it("clamps negative minPrice to 0", () => {
    const state = parseSearchUrl(p("type=rent&min=-1000"));
    const rf = state.filters as { minPrice?: number };
    expect(rf.minPrice).toBe(0);
  });

  it("accepts availability_confirmed sort for rent mode", () => {
    const state = parseSearchUrl(p("type=rent&sort=availability_confirmed"));
    expect(state.sort).toBe("availability_confirmed");
  });

  it("resets availability_confirmed sort to newest for buy mode", () => {
    const state = parseSearchUrl(p("type=buy&sort=availability_confirmed"));
    expect(state.sort).toBe("newest");
  });

  it("accepts price_asc sort for both modes", () => {
    expect(parseSearchUrl(p("type=rent&sort=price_asc")).sort).toBe("price_asc");
    expect(parseSearchUrl(p("type=buy&sort=price_asc")).sort).toBe("price_asc");
  });

  it('resets unknown sort to "newest"', () => {
    const state = parseSearchUrl(p("type=rent&sort=bogus"));
    expect(state.sort).toBe("newest");
  });

  it('view=split normalizes to list while Map/Split are gated off', () => {
    expect(parseSearchUrl(p("type=rent&view=split")).view).toBe("list");
  });

  it('resets nonsense view to "list"', () => {
    expect(parseSearchUrl(p("type=rent&view=nonsense")).view).toBe("list");
  });

  it("null cursor when cursor param absent (first page)", () => {
    expect(parseSearchUrl(p("type=rent&city=bengaluru")).cursor).toBeNull();
  });

  it("parses valid cursor from URL", () => {
    const cur = { sort: "newest", listedAt: "2026-07-01T00:00:00Z", id: "abc-123" };
    const encoded = btoa(JSON.stringify(cur));
    const state = parseSearchUrl(p(`type=rent&city=bengaluru&cursor=${encoded}`));
    expect(state.cursor).toEqual(cur);
  });

  it("returns null cursor for corrupted base64", () => {
    const state = parseSearchUrl(p("type=rent&cursor=!invalid!"));
    expect(state.cursor).toBeNull();
  });

  it("returns null cursor when listedAt missing", () => {
    const encoded = btoa(JSON.stringify({ id: "abc" }));
    const state = parseSearchUrl(p(`type=rent&cursor=${encoded}`));
    expect(state.cursor).toBeNull();
  });

  it("returns null cursor when sort field missing", () => {
    const encoded = btoa(JSON.stringify({ listedAt: "2026-07-01T00:00:00Z", id: "abc" }));
    const state = parseSearchUrl(p(`type=rent&cursor=${encoded}`));
    expect(state.cursor).toBeNull();
  });

  it("returns null cursor when sort/cursor sort mismatch (cursor=newest, URL sort=price_asc)", () => {
    const cur = { sort: "newest", listedAt: "2026-07-01T00:00:00Z", id: "abc" };
    const encoded = btoa(JSON.stringify(cur));
    const state = parseSearchUrl(p(`type=rent&sort=price_asc&cursor=${encoded}`));
    expect(state.cursor).toBeNull();
  });

  it("parses valid price_asc cursor", () => {
    const cur = { sort: "price_asc", listedAt: "2026-07-01T00:00:00Z", id: "abc", priceAmount: 30000 };
    const encoded = btoa(JSON.stringify(cur));
    const state = parseSearchUrl(p(`type=rent&sort=price_asc&cursor=${encoded}`));
    expect(state.cursor).toEqual(cur);
  });

  it("parses valid availability_confirmed cursor for rent", () => {
    const cur = { sort: "availability_confirmed", listedAt: "2026-07-01T00:00:00Z", id: "abc", availabilityConfirmedAt: "2026-07-20T00:00:00Z" };
    const encoded = btoa(JSON.stringify(cur));
    const state = parseSearchUrl(p(`type=rent&sort=availability_confirmed&cursor=${encoded}`));
    expect(state.cursor).toEqual(cur);
  });

  it("returns null for availability_confirmed cursor on buy mode (incompatible sort)", () => {
    const cur = { sort: "availability_confirmed", listedAt: "2026-07-01T00:00:00Z", id: "abc", availabilityConfirmedAt: null };
    const encoded = btoa(JSON.stringify(cur));
    // buy mode doesn't allow availability_confirmed sort, so sort defaults to newest → mismatch
    const state = parseSearchUrl(p(`type=buy&cursor=${encoded}`));
    expect(state.cursor).toBeNull();
  });

  it("rejects locations_data with old raw-array format (v1 envelope required)", () => {
    const tokens = [{ id: "loc1", label: "Area 1", type: "area", cityId: "bengaluru", placeId: null }];
    const data = btoa(JSON.stringify(tokens));
    const state = parseSearchUrl(p(`type=rent&locations=loc1&locations_data=${data}`));
    expect(state.context.locations).toHaveLength(0);
  });

  it("accepts valid v1 envelope locations_data", () => {
    const tokens = [{ id: "loc1", label: "Koramangala", type: "area", cityId: "bengaluru", placeId: null }];
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=loc1&locations_data=${data}`)));
    expect(state.context.locations).toHaveLength(1);
    expect(state.context.locations[0].label).toBe("Koramangala");
  });

  it("rejects location token with injection pattern in label", () => {
    const tokens = [{ id: "loc1", label: "<script>alert(1)</script>", type: "area", cityId: "bengaluru", placeId: null }];
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(`type=rent&locations=loc1&locations_data=${data}`));
    expect(state.context.locations).toHaveLength(0);
  });

  it("parses all four map bounds", () => {
    const state = parseSearchUrl(
      p("type=rent&ne_lat=13.1&ne_lng=77.8&sw_lat=12.8&sw_lng=77.4"),
    );
    expect(state.mapBounds).toEqual({
      ne: { lat: 13.1, lng: 77.8 },
      sw: { lat: 12.8, lng: 77.4 },
    });
  });

  it("returns null mapBounds when one bound is missing", () => {
    const state = parseSearchUrl(p("type=rent&ne_lat=13.1&ne_lng=77.8&sw_lat=12.8"));
    expect(state.mapBounds).toBeNull();
  });

  it("ignores locations when locations_data is missing (Option C: no location tokens)", () => {
    const state = parseSearchUrl(p("type=rent&locations=id1,id2"));
    expect(state.context.locations).toHaveLength(0);
  });

  it("rejects location tokens with invalid type (hardened decoder)", () => {
    const tokens = [{ id: "loc1", label: "Area 1", type: "invalid_type", cityId: "bengaluru", placeId: null }];
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(`type=rent&locations=loc1&locations_data=${data}`));
    expect(state.context.locations).toHaveLength(0);
  });

  it("silently ignores unknown params", () => {
    const state = parseSearchUrl(p("type=rent&totally_unknown=xyz&another=123"));
    expect(state.context.mode).toBe("rent");
    expect(state.sort).toBe("newest");
  });

  it("parses a full rent URL", () => {
    const state = parseSearchUrl(
      p("type=rent&city=bengaluru&bhk=2BHK,3BHK&furn=semi_furnished&sort=price_asc&view=split"),
    );
    expect(state.context.mode).toBe("rent");
    expect(state.context.city).toBe("bengaluru");
    const rf = state.filters as { bhk?: string[]; furnishing?: string[] };
    expect(rf.bhk).toEqual(["2BHK", "3BHK"]);
    expect(rf.furnishing).toEqual(["semi_furnished"]);
    expect(state.sort).toBe("price_asc");
    expect(state.view).toBe("list"); // view=split normalized to list (Map/Split gated off)
  });

  it("parses a full buy URL", () => {
    const state = parseSearchUrl(
      p("type=buy&city=mumbai&bhk=3BHK&poss=ready_to_move&neg=1&sort=price_desc"),
    );
    expect(state.context.mode).toBe("buy");
    const bf = state.filters as { possessionStatus?: string[]; negotiable?: boolean };
    expect(bf.possessionStatus).toEqual(["ready_to_move"]);
    expect(bf.negotiable).toBe(true);
    expect(state.sort).toBe("price_desc");
  });
});
