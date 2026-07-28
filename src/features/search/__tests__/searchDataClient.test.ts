import { describe, it, expect, vi, beforeEach } from "vitest";
import { overlayFavourites, buildSearchCursor } from "../data/searchDataClient";
import type { SearchPropertyResult } from "../data/searchResultContract";
import type { SearchPropertyRpcRow } from "../data/searchResultContract";

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
    isNewOnReeve: true,
    viewCount: 0,
    commentCount: 0,
    experienceFeedback: null,
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
    experience_feedback: null,
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
