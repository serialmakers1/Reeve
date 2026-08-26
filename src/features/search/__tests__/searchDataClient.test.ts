import { describe, it, expect, vi, beforeEach } from "vitest";
import { overlayFavourites, buildSearchCursor, searchProperties } from "../data/searchDataClient";
import type { SearchPropertiesInput } from "../data/searchContracts";
import type { SearchPropertyResult } from "../data/searchResultContract";
import type { SearchPropertyRpcRow } from "../data/searchResultContract";

function baseInput(overrides: Partial<SearchPropertiesInput> = {}): SearchPropertiesInput {
  return {
    mode: "rent", geoPlaceIds: ["blr-root"], distanceKm: null, propertyTypes: [],
    minPrice: null, maxPrice: null, bhk: [], furnishing: [], possessionStatus: [],
    availableBy: null, listedWithin: null, availabilityConfirmedWithin: null, maxDeposit: null,
    maxLockIn: null, maxNotice: null, maxAnnualIncrease: null, maxMoveInCharges: null, petPolicy: [],
    maxBrokerage: null, rentBrokerageMaxFixed: null, rentBrokerageMaxMonths: null,
    zeroRentBrokerage: null, minCarpetArea: null, maxCarpetArea: null, minSuperBuiltUp: null,
    maxSuperBuiltUp: null, possessionBefore: null, negotiable: null, buyBrokerageMaxPct: null,
    reraDisclosed: null, khataType: [], propertyTaxPaid: null, parking4w: [], parking2w: [],
    amenities: [], hasVideoWalkthrough: null,
    sort: "newest", cursor: null, limit: 20,
    ...overrides,
  } as SearchPropertiesInput;
}

describe("searchProperties — RPC payload", () => {
  function mockClient() {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { client: { rpc } as any, rpc };
  }

  it("sends p_bhk with selected BHK values (filter reaches the request)", async () => {
    const { client, rpc } = mockClient();
    await searchProperties(baseInput({ bhk: ["1BHK"] }), client);
    expect(rpc).toHaveBeenCalledWith("search_compact_properties_v4", expect.objectContaining({ p_bhk: ["1BHK"] }));
  });

  it("sends p_bhk null when no BHK selected (empty default does not filter)", async () => {
    const { client, rpc } = mockClient();
    await searchProperties(baseInput({ bhk: [] }), client);
    expect(rpc).toHaveBeenCalledWith("search_compact_properties_v4", expect.objectContaining({ p_bhk: null }));
  });

  it("sends limit+1 (21) to the RPC for the hasNextPage lookahead", async () => {
    const { client, rpc } = mockClient();
    await searchProperties(baseInput({ limit: 20 }), client);
    expect(rpc).toHaveBeenCalledWith(
      "search_compact_properties_v4",
      expect.objectContaining({ p_limit: 21 }),
    );
  });

  it("hasNextPage=true and nextCursor!=null when RPC returns 21 rows (page size 20)", async () => {
    const rows = Array.from({ length: 21 }, (_, i) =>
      makeRpcRow({ property_id: `prop-${i}`, listed_at: `2026-07-0${(i % 9) + 1}T00:00:00Z` }),
    );
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = { rpc } as any;
    const result = await searchProperties(baseInput({ limit: 20 }), client);
    expect(result.results).toHaveLength(20);
    expect(result.hasNextPage).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it("hasNextPage=false and nextCursor=null when RPC returns <=20 rows", async () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      makeRpcRow({ property_id: `prop-${i}`, listed_at: `2026-07-0${(i % 9) + 1}T00:00:00Z` }),
    );
    const rpc = vi.fn().mockResolvedValue({ data: rows, error: null });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = { rpc } as any;
    const result = await searchProperties(baseInput({ limit: 20 }), client);
    expect(result.results).toHaveLength(20);
    expect(result.hasNextPage).toBe(false);
    expect(result.nextCursor).toBeNull();
  });

  it("maps furnishing + price + geo anchors + distance to the correct RPC args", async () => {
    const { client, rpc } = mockClient();
    await searchProperties(
      baseInput({
        furnishing: ["semi_furnished"], minPrice: 10000, maxPrice: 40000,
        geoPlaceIds: ["blr-root", "kora-loc"],
        distanceKm: 5,
      }),
      client,
    );
    expect(rpc).toHaveBeenCalledWith(
      "search_compact_properties_v4",
      expect.objectContaining({
        p_furnishing: ["semi_furnished"],
        p_min_price: 10000,
        p_max_price: 40000,
        p_geo_place_ids: ["blr-root", "kora-loc"],
        p_distance_km: 5,
      }),
    );
  });
});

function makeResult(overrides: Partial<SearchPropertyResult> = {}): SearchPropertyResult {
  return {
    id: "prop-1",
    detailUrl: "/property/prop-1",
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
    ...overrides,
  };
}

function makeRpcRow(overrides: Partial<SearchPropertyRpcRow> = {}): SearchPropertyRpcRow {
  return {
    property_id: "prop-1",
    listing_type: "rent",
    property_type: "apartment",
    bhk: "2BHK",
    owner_id: "owner-1",
    primary_image_url: null,
    photo_count: 0,
    price_kind: null,
    price_amount: null,
    building_name: "Test Building",
    locality: null,
    city: "bengaluru",
    location_mode: null,
    latitude: null,
    longitude: null,
    carpet_area_sqft: null,
    super_built_up_sqft: null,
    furnishing: null,
    bathrooms: null,
    floor_number: null,
    total_floors: null,
    parking_4w: null,
    parking_2w: null,
    parking_4w_count: null,
    parking_2w_count: null,
    building_age_years: null,
    possession_status: null,
    possession_date: null,
    lister_role: "owner",
    response_handled_count: 0,
    response_rate_pct: null,
    listed_at: "2026-07-01T00:00:00Z",
    availability_confirmed_at: null,
    rent_brokerage_type: null,
    rent_brokerage_fixed_amount: null,
    rent_brokerage_months: null,
    sale_brokerage_pct: null,
    security_deposit_amount: null,
    lock_in_months: null,
    notice_period_days: null,
    pet_policy: null,
    youtube_walkthrough_url: null,
    price_negotiable: null,
    ...overrides,
  };
}

describe("overlayFavourites (pure function)", () => {
  it("marks isFavourited=true for IDs in the favourite set", () => {
    const results = [makeResult({ id: "prop-1" }), makeResult({ id: "prop-2" })];
    const favs = new Set(["prop-1"]);
    const out = overlayFavourites(results, favs);
    expect(out[0].isFavourited).toBe(true);
    expect(out[1].isFavourited).toBe(false);
  });

  it("returns isFavourited=false for all when set is empty", () => {
    const results = [makeResult({ id: "prop-1" }), makeResult({ id: "prop-2" })];
    const out = overlayFavourites(results, new Set());
    expect(out.every((r) => r.isFavourited === false)).toBe(true);
  });

  it("does not mutate input results", () => {
    const results = [makeResult({ id: "prop-1", isFavourited: false })];
    const favs = new Set(["prop-1"]);
    overlayFavourites(results, favs);
    expect(results[0].isFavourited).toBe(false);
  });

  it("returns a new array, not the same reference", () => {
    const results = [makeResult()];
    const out = overlayFavourites(results, new Set());
    expect(out).not.toBe(results);
  });
});

describe("buildSearchCursor", () => {
  it("builds newest cursor from row", () => {
    const row = makeRpcRow({ property_id: "p1", listed_at: "2026-07-15T00:00:00Z" });
    const cursor = buildSearchCursor(row, "newest");
    expect(cursor).toEqual({ sort: "newest", listedAt: "2026-07-15T00:00:00Z", id: "p1" });
  });

  it("builds price_asc cursor from row", () => {
    const row = makeRpcRow({ property_id: "p2", listed_at: "2026-07-10T00:00:00Z", price_amount: 45000 });
    const cursor = buildSearchCursor(row, "price_asc");
    expect(cursor).toEqual({ sort: "price_asc", listedAt: "2026-07-10T00:00:00Z", id: "p2", priceAmount: 45000 });
  });

  it("builds price_desc cursor from row", () => {
    const row = makeRpcRow({ property_id: "p3", listed_at: null, price_amount: 12000000 });
    const cursor = buildSearchCursor(row, "price_desc");
    expect(cursor).toEqual({ sort: "price_desc", listedAt: null, id: "p3", priceAmount: 12000000 });
  });

  it("builds availability_confirmed cursor from row", () => {
    const row = makeRpcRow({
      property_id: "p4",
      listed_at: "2026-07-01T00:00:00Z",
      availability_confirmed_at: "2026-07-20T00:00:00Z",
    });
    const cursor = buildSearchCursor(row, "availability_confirmed");
    expect(cursor).toEqual({
      sort: "availability_confirmed",
      listedAt: "2026-07-01T00:00:00Z",
      availabilityConfirmedAt: "2026-07-20T00:00:00Z",
      id: "p4",
    });
  });
});
