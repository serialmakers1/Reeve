import { describe, it, expect } from "vitest";
import { resolveComparisonFacts } from "../resolvers/comparisonFactsResolver";
import type { SearchPropertyResult } from "../data/searchResultContract";

function base(): SearchPropertyResult {
  return {
    id: "1",
    detailUrl: "/property/1",
    listingMode: "rent",
    propertyType: null,
    bhk: null,
    primaryImageUrl: null,
    photoCount: 0,
    price: null,
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
    isNewOnReeve: true,
    viewCount: 0,
    commentCount: 0,
    experienceFeedback: null,
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

describe("resolveComparisonFacts — Rent", () => {
  it("returns empty array when all fields null", () => {
    expect(resolveComparisonFacts(base(), "rent")).toHaveLength(0);
  });

  it("returns at most 3 facts", () => {
    const r = {
      ...base(),
      carpetAreaSqft: 800,
      superBuiltUpSqft: 1000,
      furnishing: "fully_furnished" as const,
      bathrooms: 2,
      floorNumber: 3,
      totalFloors: 10,
    };
    expect(resolveComparisonFacts(r, "rent").length).toBeLessThanOrEqual(3);
  });

  it("carpet area is fact 1 when non-null", () => {
    const r = { ...base(), carpetAreaSqft: 900 };
    const facts = resolveComparisonFacts(r, "rent");
    expect(facts[0]?.label).toBe("900 sq.ft");
  });

  it("super-built-up appears after carpet when values differ", () => {
    const r = { ...base(), carpetAreaSqft: 800, superBuiltUpSqft: 1000 };
    const facts = resolveComparisonFacts(r, "rent");
    expect(facts.some((f) => f.label === "800 sq.ft")).toBe(true);
    expect(facts.some((f) => f.label === "1000 sq.ft SBA")).toBe(true);
  });

  it("super-built-up skipped when numeric value equals carpet (area-value duplicate)", () => {
    const r = { ...base(), carpetAreaSqft: 800, superBuiltUpSqft: 800 };
    const facts = resolveComparisonFacts(r, "rent");
    expect(facts.filter((f) => f.label.includes("sq.ft")).length).toBe(1);
    expect(facts.some((f) => f.label.includes("SBA"))).toBe(false);
  });

  it("super-built-up becomes fact 1 when carpet is null", () => {
    const r = { ...base(), superBuiltUpSqft: 1100 };
    const facts = resolveComparisonFacts(r, "rent");
    expect(facts[0]?.label).toBe("1100 sq.ft SBA");
  });

  it("building age NOT included in rent facts", () => {
    const r = { ...base(), buildingAgeYears: 5 };
    const facts = resolveComparisonFacts(r, "rent");
    expect(facts.some((f) => f.label.includes("yr old"))).toBe(false);
  });

  it("furnishing label rendered correctly", () => {
    const r = { ...base(), furnishing: "semi_furnished" };
    const facts = resolveComparisonFacts(r, "rent");
    expect(facts.some((f) => f.label === "Semi-furnished")).toBe(true);
  });

  it("4W parking preferred over 2W", () => {
    const r = { ...base(), parking4w: "covered", parking2w: "uncovered" };
    const facts = resolveComparisonFacts(r, "rent");
    expect(facts.some((f) => f.label === "4W parking")).toBe(true);
    expect(facts.some((f) => f.label === "2W parking")).toBe(false);
  });

  it("2W parking used when 4W is none", () => {
    const r = { ...base(), parking4w: "none", parking2w: "covered" };
    const facts = resolveComparisonFacts(r, "rent");
    expect(facts.some((f) => f.label === "2W parking")).toBe(true);
  });
});

describe("resolveComparisonFacts — Buy", () => {
  it("carpet area is fact 1, possession status fact 2", () => {
    const r = { ...base(), carpetAreaSqft: 1200, possessionStatus: "ready_to_move" };
    const facts = resolveComparisonFacts(r, "buy");
    expect(facts[0]?.label).toBe("1200 sq.ft");
    expect(facts[1]?.label).toBe("Ready to move");
  });

  it("building age takes slot 3 when carpet + possession fill 1+2", () => {
    const r = {
      ...base(),
      carpetAreaSqft: 1000,
      possessionStatus: "ready_to_move",
      buildingAgeYears: 8,
    };
    const facts = resolveComparisonFacts(r, "buy");
    expect(facts.map((f) => f.label)).toEqual(["1000 sq.ft", "Ready to move", "8 yr old"]);
  });

  it("furnishing NOT in buy output", () => {
    const r = { ...base(), furnishing: "fully_furnished", carpetAreaSqft: 900 };
    const facts = resolveComparisonFacts(r, "buy");
    expect(facts.some((f) => f.label.toLowerCase().includes("furnished"))).toBe(false);
  });

  it("super-built-up NOT in buy output", () => {
    const r = { ...base(), superBuiltUpSqft: 1400 };
    const facts = resolveComparisonFacts(r, "buy");
    expect(facts.some((f) => f.label.includes("SBA"))).toBe(false);
  });

  it("under_construction status rendered correctly", () => {
    const r = { ...base(), possessionStatus: "under_construction" };
    const facts = resolveComparisonFacts(r, "buy");
    expect(facts.some((f) => f.label === "Under construction")).toBe(true);
  });
});
