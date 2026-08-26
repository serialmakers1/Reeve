import { describe, it, expect } from "vitest";
import { mapRpcRowToResult } from "../data/searchResultContract";
import type { SearchPropertyRpcRow } from "../data/searchResultContract";

function makeRow(overrides: Partial<SearchPropertyRpcRow> = {}): SearchPropertyRpcRow {
  return {
    property_id: "prop-abc-123",
    listing_type: "rent",
    property_type: "apartment",
    bhk: "2BHK",
    owner_id: "owner-xyz",
    primary_image_url: "https://cdn.example.com/img.jpg",
    photo_count: 5,
    price_kind: "rent_total",
    price_amount: 35000,
    building_name: "Sunrise Apartments",
    locality: "Koramangala",
    city: "bengaluru",
    location_mode: "exact",
    latitude: 12.9352,
    longitude: 77.6245,
    carpet_area_sqft: 950,
    super_built_up_sqft: 1100,
    furnishing: "semi_furnished",
    bathrooms: 2,
    floor_number: 3,
    total_floors: 8,
    parking_4w: "covered",
    parking_2w: "uncovered",
    parking_4w_count: 1,
    parking_2w_count: 1,
    building_age_years: 5,
    possession_status: null,
    possession_date: null,
    lister_role: "owner",
    response_handled_count: 10,
    response_rate_pct: 80,
    listed_at: "2026-07-01T00:00:00Z",
    availability_confirmed_at: "2026-07-20T00:00:00Z",
    rent_brokerage_type: "fixed",
    rent_brokerage_fixed_amount: 35000,
    rent_brokerage_months: null,
    sale_brokerage_pct: null,
    security_deposit_amount: 70000,
    lock_in_months: 11,
    notice_period_days: 30,
    pet_policy: "not_allowed",
    youtube_walkthrough_url: null,
    price_negotiable: null,
    ...overrides,
  };
}

describe("mapRpcRowToResult — identity", () => {
  it("maps property_id to id", () => {
    const result = mapRpcRowToResult(makeRow(), 0, 0, false);
    expect(result.id).toBe("prop-abc-123");
  });

  it("constructs detailUrl as /property/:id", () => {
    const result = mapRpcRowToResult(makeRow(), 0, 0, false);
    expect(result.detailUrl).toBe("/property/prop-abc-123");
  });
});

describe("mapRpcRowToResult — listingMode", () => {
  it("maps listing_type=rent to listingMode=rent", () => {
    const result = mapRpcRowToResult(makeRow({ listing_type: "rent" }), 0, 0, false);
    expect(result.listingMode).toBe("rent");
  });

  it("maps listing_type=sale to listingMode=buy", () => {
    const result = mapRpcRowToResult(makeRow({ listing_type: "sale" }), 0, 0, false);
    expect(result.listingMode).toBe("buy");
  });
});

describe("mapRpcRowToResult — price", () => {
  it("resolves rent_total price correctly", () => {
    const result = mapRpcRowToResult(makeRow({ price_kind: "rent_total", price_amount: 35000 }), 0, 0, false);
    expect(result.price).toEqual({ kind: "rent_total", amount: 35000, currency: "INR" });
  });

  it("resolves rent_monthly price correctly", () => {
    const result = mapRpcRowToResult(makeRow({ price_kind: "rent_monthly", price_amount: 30000 }), 0, 0, false);
    expect(result.price).toEqual({ kind: "rent_monthly", amount: 30000, currency: "INR" });
  });

  it("resolves sale price correctly", () => {
    const result = mapRpcRowToResult(
      makeRow({ listing_type: "sale", price_kind: "sale", price_amount: 8500000 }),
      0, 0, false,
    );
    expect(result.price).toEqual({ kind: "sale", amount: 8500000, currency: "INR" });
  });

  it("returns null price when price_kind is null", () => {
    const result = mapRpcRowToResult(makeRow({ price_kind: null, price_amount: null }), 0, 0, false);
    expect(result.price).toBeNull();
  });

  it("returns null price when price_amount is null", () => {
    const result = mapRpcRowToResult(makeRow({ price_kind: "rent_total", price_amount: null }), 0, 0, false);
    expect(result.price).toBeNull();
  });

  it("coerces price_amount to Number (handles DB numeric type)", () => {
    const result = mapRpcRowToResult(makeRow({ price_kind: "rent_total", price_amount: 42000 }), 0, 0, false);
    expect(typeof result.price?.amount).toBe("number");
    expect(result.price?.amount).toBe(42000);
  });
});

describe("mapRpcRowToResult — overlaid values (from caller)", () => {
  it("passes through isFavourited=true", () => {
    const result = mapRpcRowToResult(makeRow(), 0, 0, true);
    expect(result.isFavourited).toBe(true);
  });

  it("passes through isFavourited=false", () => {
    const result = mapRpcRowToResult(makeRow(), 0, 0, false);
    expect(result.isFavourited).toBe(false);
  });

  it("passes through viewCount from caller", () => {
    const result = mapRpcRowToResult(makeRow(), 42, 0, false);
    expect(result.viewCount).toBe(42);
  });

  it("passes through commentCount from caller", () => {
    const result = mapRpcRowToResult(makeRow(), 0, 7, false);
    expect(result.commentCount).toBe(7);
  });
});

describe("mapRpcRowToResult — field mapping", () => {
  it("maps all location fields correctly", () => {
    const result = mapRpcRowToResult(makeRow(), 0, 0, false);
    expect(result.buildingName).toBe("Sunrise Apartments");
    expect(result.locality).toBe("Koramangala");
    expect(result.city).toBe("bengaluru");
    expect(result.locationMode).toBe("exact");
    expect(result.latitude).toBe(12.9352);
    expect(result.longitude).toBe(77.6245);
  });

  it("maps area fields correctly", () => {
    const result = mapRpcRowToResult(makeRow(), 0, 0, false);
    expect(result.carpetAreaSqft).toBe(950);
    expect(result.superBuiltUpSqft).toBe(1100);
  });

  it("maps contextual signal fields correctly", () => {
    const result = mapRpcRowToResult(makeRow(), 0, 0, false);
    expect(result.rentBrokerageType).toBe("fixed");
    expect(result.rentBrokerageFixed).toBe(35000);
    expect(result.lockInMonths).toBe(11);
    expect(result.noticePeriodDays).toBe(30);
    expect(result.securityDepositAmount).toBe(70000);
  });
});
