import { describe, it, expect } from "vitest";
import { resolveContextualSignal } from "../resolvers/contextualSignalResolver";
import type { SearchPropertyResult } from "../data/searchResultContract";

function base(mode: "rent" | "buy" = "rent"): SearchPropertyResult {
  return {
    id: "1",
    detailUrl: "/property/1",
    listingMode: mode,
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

describe("resolveContextualSignal — Rent", () => {
  it("returns null when no signals apply", () => {
    expect(resolveContextualSignal(base("rent"))).toBeNull();
  });

  it("zero brokerage is highest priority, intent neutral", () => {
    const r = {
      ...base("rent"),
      rentBrokerageType: "zero",
      hasVideoWalkthrough: true, // lower priority, should not win
    };
    const signal = resolveContextualSignal(r);
    expect(signal?.type).toBe("zero_brokerage");
    expect(signal?.intent).toBe("neutral");
  });

  it("video tour second priority when brokerage non-zero", () => {
    const r = { ...base("rent"), hasVideoWalkthrough: true };
    const signal = resolveContextualSignal(r);
    expect(signal?.type).toBe("video");
    expect(signal?.intent).toBe("neutral");
  });

  it("pets OK third priority", () => {
    const r = { ...base("rent"), petPolicy: "allowed" };
    expect(resolveContextualSignal(r)?.type).toBe("pets");
  });

  it("no lock-in fourth priority", () => {
    const r = { ...base("rent"), lockInMonths: 0 };
    expect(resolveContextualSignal(r)?.type).toBe("no_lockin");
  });

  it("negotiable fifth priority, intent neutral (not positive)", () => {
    const r = { ...base("rent"), priceNegotiable: true };
    const signal = resolveContextualSignal(r);
    expect(signal?.type).toBe("negotiable");
    expect(signal?.intent).toBe("neutral");
    expect((signal?.intent as string)).not.toBe("positive");
  });
});

describe("resolveContextualSignal — Buy", () => {
  it("returns null when no signals apply", () => {
    expect(resolveContextualSignal(base("buy"))).toBeNull();
  });

  it("video tour is highest priority for buy, intent neutral", () => {
    const r = {
      ...base("buy"),
      hasVideoWalkthrough: true,
      priceNegotiable: true,
      saleBrokeragePct: 0,
    };
    const signal = resolveContextualSignal(r);
    expect(signal?.type).toBe("video");
    expect(signal?.intent).toBe("neutral");
  });

  it("negotiable second for buy", () => {
    const r = { ...base("buy"), priceNegotiable: true, saleBrokeragePct: 0 };
    expect(resolveContextualSignal(r)?.type).toBe("negotiable");
  });

  it("zero brokerage (saleBrokeragePct === 0) third for buy", () => {
    const r = { ...base("buy"), saleBrokeragePct: 0 };
    expect(resolveContextualSignal(r)?.type).toBe("zero_brokerage");
  });

  it("non-zero saleBrokeragePct does not trigger zero_brokerage", () => {
    const r = { ...base("buy"), saleBrokeragePct: 2 };
    expect(resolveContextualSignal(r)).toBeNull();
  });
});

describe("resolveContextualSignal — intent contract", () => {
  it("no signal returns 'positive' intent in any case", () => {
    // Exhaustive check: all returned signals must be neutral or warning
    const cases = [
      { ...base("rent"), rentBrokerageType: "zero" },
      { ...base("rent"), hasVideoWalkthrough: true },
      { ...base("rent"), petPolicy: "allowed" },
      { ...base("rent"), lockInMonths: 0 },
      { ...base("rent"), priceNegotiable: true },
      { ...base("buy"), hasVideoWalkthrough: true },
      { ...base("buy"), priceNegotiable: true },
      { ...base("buy"), saleBrokeragePct: 0 },
    ];
    for (const r of cases) {
      const signal = resolveContextualSignal(r);
      if (signal) {
        expect(["neutral", "warning"]).toContain(signal.intent);
        expect(signal.intent).not.toBe("positive");
      }
    }
  });
});
