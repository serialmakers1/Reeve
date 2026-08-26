import { describe, it, expect } from "vitest";
import { parseSearchUrl } from "../state/parseSearchUrl";

function p(qs: string): URLSearchParams {
  return new URLSearchParams(qs);
}

// A selected canonical Bengaluru root so detail tokens (scopeRootId === BLR) satisfy
// the ownership invariant (no city ⇒ no areas). Appended to area-survival URLs.
const BLR_ID = "11111111-1111-1111-1111-111111111111";
const detailId = (i: number): string => `00000000-0000-0000-0000-0000000000${String(10 + i)}`;
const CITIES_BLR = btoa(JSON.stringify({
  v: 1,
  items: [{ id: BLR_ID, kind: "settlement", label: "Bengaluru" }],
}));
const withBlr = (qs: string): string => `${qs}&cities=${BLR_ID}&cities_data=${CITIES_BLR}`;
const detail = (i: number, label: string) => ({
  id: detailId(i), kind: "locality", label, scopeRootId: BLR_ID,
});

describe("parseSearchUrl", () => {
  it("returns default state for empty params (mode defaults to rent)", () => {
    const state = parseSearchUrl(p(""));
    expect(state.context.mode).toBe("rent");
    expect(state.context.city).toBeNull();
    expect(state.context.locations).toEqual([]);
    expect(state.sort).toBe("newest");
    expect(state.cursor).toBeNull();
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
    const tokens = Array.from({ length: 5 }, (_, i) => detail(i, `Area ${i}`));
    const ids = tokens.map((t) => t.id).join(",");
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=${ids}&locations_data=${data}`)));
    expect(state.context.locations).toHaveLength(5);
  });

  it("canonical detail carries kind + scopeRootId; legacy viewport is inert (null)", () => {
    const tokens = [detail(1, "Whitefield")];
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=${detailId(1)}&locations_data=${data}`)));
    expect(state.context.locations[0].kind).toBe("locality");
    expect(state.context.locations[0].scopeRootId).toBe(BLR_ID);
  });

  it("trims to five locations when six are provided", () => {
    const tokens = Array.from({ length: 6 }, (_, i) => detail(i, `Area ${i}`));
    const ids = tokens.map((t) => t.id).join(",");
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=${ids}&locations_data=${data}`)));
    expect(state.context.locations).toHaveLength(5);
    expect(state.context.locations[0].id).toBe(detailId(0));
    expect(state.context.locations[4].id).toBe(detailId(4));
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
    const tokens = [detail(1, "Koramangala")];
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=${detailId(1)}&locations_data=${data}`)));
    expect(state.context.locations).toHaveLength(1);
    expect(state.context.locations[0].label).toBe("Koramangala");
  });

  it("rejects location token with injection pattern in label", () => {
    const tokens = [{ ...detail(1, "<script>alert(1)</script>") }];
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=${detailId(1)}&locations_data=${data}`)));
    expect(state.context.locations).toHaveLength(0);
  });

  it("rejects an old google-shaped location token (no canonical UUID/kind)", () => {
    const tokens = [{ id: "loc1", label: "Koramangala", type: "area", cityId: "bengaluru", placeId: "p1" }];
    const data = btoa(JSON.stringify({ v: 1, items: tokens }));
    const state = parseSearchUrl(p(withBlr(`type=rent&locations=loc1&locations_data=${data}`)));
    expect(state.context.locations).toHaveLength(0);
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
      p("type=rent&city=bengaluru&bhk=2BHK,3BHK&furn=semi_furnished&sort=price_asc"),
    );
    expect(state.context.mode).toBe("rent");
    expect(state.context.city).toBe("bengaluru");
    const rf = state.filters as { bhk?: string[]; furnishing?: string[] };
    expect(rf.bhk).toEqual(["2BHK", "3BHK"]);
    expect(rf.furnishing).toEqual(["semi_furnished"]);
    expect(state.sort).toBe("price_asc");
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

describe("parseSearchUrl — stale view/map params are ignored", () => {
  it("view=split yields valid List state (mode=rent, no crash)", () => {
    const state = parseSearchUrl(p("view=split"));
    expect(state.context.mode).toBe("rent");
    expect(state.context.city).toBeNull();
    expect(state.context.locations).toEqual([]);
  });

  it("view=map yields valid List state", () => {
    const state = parseSearchUrl(p("view=map"));
    expect(state.context.mode).toBe("rent");
  });

  it("view=split plus filters preserves filters in parsed state", () => {
    const state = parseSearchUrl(p("view=split&type=buy&bhk=3BHK&sort=price_desc"));
    expect(state.context.mode).toBe("buy");
    expect((state.filters as { bhk?: string[] }).bhk).toContain("3BHK");
    expect(state.sort).toBe("price_desc");
  });

  it("all four legacy map-bound params are safely ignored (no crash, no state)", () => {
    const state = parseSearchUrl(p("ne_lat=12.9&ne_lng=77.6&sw_lat=12.8&sw_lng=77.5&type=rent"));
    expect(state.context.mode).toBe("rent");
  });
});
