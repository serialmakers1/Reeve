import { describe, it, expect } from "vitest";
import { resolveDisplayPrice } from "../resolvers/priceResolver";
import type { SearchPropertyResult } from "../data/searchResultContract";

function makeResult(price: SearchPropertyResult["price"]): SearchPropertyResult {
  return {
    id: "1",
    detailUrl: "/property/1",
    listingMode: "rent",
    propertyType: null,
    bhk: null,
    primaryImageUrl: null,
    photoCount: 0,
    price,
    buildingName: "Test",
    locality: null,
    city: null,
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
    listedAt: null,
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
  };
}

describe("resolveDisplayPrice", () => {
  it("returns null when price is null", () => {
    expect(resolveDisplayPrice(makeResult(null))).toBeNull();
  });

  it("rent_total → isTotalMonthly:true and /mo suffix (no 'rent' word)", () => {
    const result = resolveDisplayPrice(makeResult({ kind: "rent_total", amount: 35000, currency: "INR" }));
    expect(result).not.toBeNull();
    expect(result!.isTotalMonthly).toBe(true);
    expect(result!.primary).toContain("/mo");
    expect(result!.primary).not.toContain("rent");
  });

  it("rent_total formats amount with formatIndianRupee", () => {
    const result = resolveDisplayPrice(makeResult({ kind: "rent_total", amount: 35000, currency: "INR" }));
    expect(result!.primary).toContain("35,000");
  });

  it("rent_monthly → isTotalMonthly:false and '/mo rent' suffix", () => {
    const result = resolveDisplayPrice(makeResult({ kind: "rent_monthly", amount: 25000, currency: "INR" }));
    expect(result).not.toBeNull();
    expect(result!.isTotalMonthly).toBe(false);
    expect(result!.primary).toContain("/mo rent");
  });

  it("sale → uses formatPriceShort, no /mo, isTotalMonthly undefined", () => {
    const result = resolveDisplayPrice(makeResult({ kind: "sale", amount: 5000000, currency: "INR" }));
    expect(result).not.toBeNull();
    expect(result!.primary).not.toContain("/mo");
    expect(result!.primary).toContain("L");
    expect(result!.isTotalMonthly).toBeUndefined();
  });

  it("sale formats crore-scale amounts with Cr", () => {
    const result = resolveDisplayPrice(makeResult({ kind: "sale", amount: 15000000, currency: "INR" }));
    expect(result!.primary).toContain("Cr");
  });
});
