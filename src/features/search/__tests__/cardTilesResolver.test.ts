import { describe, it, expect } from "vitest";
import type { SearchPropertyResult } from "../data/searchResultContract";
import {
  isFiniteNumber,
  resolveDepositTile,
  resolveSecondaryRentTerm,
  resolveSaleBrokerageTile,
  resolveRentFeatureTiles,
  resolveSaleFeatureTiles,
  resolveListerRoleLabel,
  resolveFreshnessInfo,
  resolveFooterSegments,
} from "../resolvers/cardTilesResolver";

function makeResult(overrides: Partial<SearchPropertyResult> = {}): SearchPropertyResult {
  return {
    id: "p1",
    detailUrl: "/property/p1",
    listingMode: "rent",
    propertyType: "apartment",
    bhk: "2BHK",
    primaryImageUrl: null,
    photoCount: 0,
    price: { kind: "rent_total", amount: 35000, currency: "INR" },
    buildingName: "Sunrise",
    locality: "Koramangala",
    city: "bengaluru",
    locationMode: "exact",
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
    responseHandledCount: 10,
    responseRatePct: null,
    viewCount: 0,
    commentCount: 0,
    listedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
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

describe("isFiniteNumber", () => {
  it("narrows correctly", () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(5)).toBe(true);
    expect(isFiniteNumber(null)).toBe(false);
    expect(isFiniteNumber(NaN)).toBe(false);
    expect(isFiniteNumber(Infinity)).toBe(false);
    expect(isFiniteNumber("5")).toBe(false);
  });
});

describe("resolveDepositTile", () => {
  it("null → no tile", () => expect(resolveDepositTile(makeResult({ securityDepositAmount: null }))).toBeNull());
  it("-1 → no tile", () => expect(resolveDepositTile(makeResult({ securityDepositAmount: -1 }))).toBeNull());
  it("NaN → no tile", () => expect(resolveDepositTile(makeResult({ securityDepositAmount: NaN }))).toBeNull());
  it("0 → ₹0 (explicit zero stays visible)", () => {
    const t = resolveDepositTile(makeResult({ securityDepositAmount: 0 }));
    expect(t?.line2).toBe("₹0");
  });
  it("60000 → ₹60,000", () => {
    const t = resolveDepositTile(makeResult({ securityDepositAmount: 60000 }));
    expect(t?.line2).toBe("₹60,000");
  });
});

describe("resolveSecondaryRentTerm — brokerage amount → lock-in → none", () => {
  it("0 → Zero brokerage", () => {
    expect(resolveSecondaryRentTerm(makeResult({ rentBrokerageFixed: 0 }))?.line1).toBe("Zero brokerage");
  });
  it("40000 → Brokerage ₹40,000", () => {
    const t = resolveSecondaryRentTerm(makeResult({ rentBrokerageFixed: 40000 }));
    expect(t?.line1).toBe("Brokerage");
    expect(t?.line2).toBe("₹40,000");
  });
  it("null amount falls through to lock-in", () => {
    const t = resolveSecondaryRentTerm(makeResult({ rentBrokerageFixed: null, lockInMonths: 6 }));
    expect(t?.line1).toBe("Lock-in period");
    expect(t?.line2).toBe("6 months");
  });
  it("NaN amount falls through to lock-in", () => {
    const t = resolveSecondaryRentTerm(makeResult({ rentBrokerageFixed: NaN, lockInMonths: 0 }));
    expect(t?.line1).toBe("No lock-in");
  });
  it("lock-in 0 → No lock-in; 1 → singular", () => {
    expect(resolveSecondaryRentTerm(makeResult({ lockInMonths: 0 }))?.line1).toBe("No lock-in");
    expect(resolveSecondaryRentTerm(makeResult({ lockInMonths: 1 }))?.line2).toBe("1 month");
  });
  it("null brokerage + null lock-in → null (never infer)", () => {
    expect(resolveSecondaryRentTerm(makeResult({ rentBrokerageFixed: null, lockInMonths: null }))).toBeNull();
  });
});

describe("resolveSaleBrokerageTile", () => {
  it("0 → Zero brokerage", () => expect(resolveSaleBrokerageTile(makeResult({ saleBrokeragePct: 0 }))?.line1).toBe("Zero brokerage"));
  it("1 → Brokerage 1%", () => {
    const t = resolveSaleBrokerageTile(makeResult({ saleBrokeragePct: 1 }));
    expect(t?.line2).toBe("1%");
  });
  it("100 → Brokerage 100%", () => expect(resolveSaleBrokerageTile(makeResult({ saleBrokeragePct: 100 }))?.line2).toBe("100%"));
  it("101 → skip", () => expect(resolveSaleBrokerageTile(makeResult({ saleBrokeragePct: 101 }))).toBeNull());
  it("NaN → skip", () => expect(resolveSaleBrokerageTile(makeResult({ saleBrokeragePct: NaN }))).toBeNull());
  it("null → skip", () => expect(resolveSaleBrokerageTile(makeResult({ saleBrokeragePct: null }))).toBeNull());
});

describe("resolveRentFeatureTiles", () => {
  it("carpet area wins the home-spec slot", () => {
    const tiles = resolveRentFeatureTiles(makeResult({ carpetAreaSqft: 900, superBuiltUpSqft: 1100 }));
    expect(tiles[0].line1).toBe("900 sq ft");
    expect(tiles[0].line2).toBe("Carpet");
    expect(tiles.some((t) => t.line2 === "Super built-up")).toBe(false);
  });
  it("furnishing always appears when supplied", () => {
    const tiles = resolveRentFeatureTiles(makeResult({ carpetAreaSqft: 900, furnishing: "semi_furnished", petPolicy: "all_welcome" }));
    expect(tiles.some((t) => t.line1 === "Semi-furnished")).toBe(true);
  });
  it("pets all_welcome → Pets allowed (green)", () => {
    const tiles = resolveRentFeatureTiles(makeResult({ carpetAreaSqft: 900, furnishing: "semi_furnished", petPolicy: "all_welcome" }));
    const pet = tiles.find((t) => t.concept === "pets");
    expect(pet?.line1).toBe("Pets allowed");
    expect(pet?.scheme).toBe("petsAllowed");
  });
  it("small_only / case_by_case / not_allowed map correctly", () => {
    expect(resolveRentFeatureTiles(makeResult({ petPolicy: "small_only" })).find((t) => t.concept === "pets")?.line1).toBe("Small pets only");
    expect(resolveRentFeatureTiles(makeResult({ petPolicy: "case_by_case" })).find((t) => t.concept === "pets")?.line1).toBe("Pets case by case");
    const na = resolveRentFeatureTiles(makeResult({ petPolicy: "not_allowed" })).find((t) => t.concept === "pets");
    expect(na?.line1).toBe("Pets not allowed");
    expect(na?.scheme).toBe("neutralRestriction");
  });
  it("unknown pet_policy → no pet tile", () => {
    const tiles = resolveRentFeatureTiles(makeResult({ petPolicy: "unexpected_value" }));
    expect(tiles.some((t) => t.concept === "pets")).toBe(false);
  });
  it("excludes financial concepts (brokerage) from feature tiles", () => {
    const tiles = resolveRentFeatureTiles(makeResult({ carpetAreaSqft: 900 }), ["brokerage", "deposit"]);
    expect(tiles.some((t) => t.concept === "brokerage")).toBe(false);
  });
  it("area 0 is skipped", () => {
    const tiles = resolveRentFeatureTiles(makeResult({ carpetAreaSqft: 0, bathrooms: 2 }));
    expect(tiles.some((t) => t.concept === "size")).toBe(false);
  });
  it("floor 0 → Ground floor", () => {
    const tiles = resolveRentFeatureTiles(makeResult({ floorNumber: 0 }));
    expect(tiles.some((t) => t.line1 === "Ground floor")).toBe(true);
  });
  it("parking count null → type only, no space count", () => {
    const tiles = resolveRentFeatureTiles(makeResult({ parking4w: "covered", parking4wCount: null }));
    const p = tiles.find((t) => t.concept === "parking");
    expect(p?.line1).toBe("Covered car parking");
    expect(p?.line2).toBeUndefined();
  });
});

describe("resolveSaleFeatureTiles", () => {
  it("ready_to_move wins possession slot (no date dup)", () => {
    const tiles = resolveSaleFeatureTiles(makeResult({ listingMode: "buy", possessionStatus: "ready_to_move", possessionDate: "2026-12-01" }));
    const p = tiles.find((t) => t.concept === "possession");
    expect(p?.line1).toBe("Ready to move");
    expect(p?.line2).toBeUndefined();
  });
  it("under_construction keeps status without a valid date; adds secondary when valid", () => {
    const noDate = resolveSaleFeatureTiles(makeResult({ listingMode: "buy", possessionStatus: "under_construction", possessionDate: null }));
    expect(noDate.find((t) => t.concept === "possession")?.line1).toBe("Under construction");
    const withDate = resolveSaleFeatureTiles(makeResult({ listingMode: "buy", possessionStatus: "under_construction", possessionDate: "2026-12-01" }));
    expect(withDate.find((t) => t.concept === "possession")?.line2).toContain("Dec 2026");
  });
  it("new_launch preserved", () => {
    const tiles = resolveSaleFeatureTiles(makeResult({ listingMode: "buy", possessionStatus: "new_launch" }));
    expect(tiles.find((t) => t.concept === "possession")?.line1).toBe("New launch");
  });
  it("invalid possession date + no status → no possession tile", () => {
    const tiles = resolveSaleFeatureTiles(makeResult({ listingMode: "buy", possessionStatus: null, possessionDate: "not-a-date" }));
    expect(tiles.some((t) => t.concept === "possession")).toBe(false);
  });
  it("open to offers wins the differentiator slot", () => {
    const tiles = resolveSaleFeatureTiles(makeResult({ listingMode: "buy", priceNegotiable: true, carpetAreaSqft: 1200 }));
    expect(tiles.some((t) => t.concept === "negotiable")).toBe(true);
  });
});

describe("resolveListerRoleLabel", () => {
  it("maps known roles", () => {
    expect(resolveListerRoleLabel("owner")).toBe("Owner");
    expect(resolveListerRoleLabel("property_manager")).toBe("Property Manager");
    expect(resolveListerRoleLabel("builder")).toBe("Builder");
  });
});

describe("resolveFreshnessInfo", () => {
  it("rent prefers availability confirmation", () => {
    const f = resolveFreshnessInfo(makeResult({ availabilityConfirmedAt: new Date(Date.now() - 2 * 86_400_000).toISOString() }));
    expect(f?.kind).toBe("confirmed");
    expect(f?.text).toBe("Confirmed 2d");
    expect(f?.ariaLabel).toBe("Availability confirmed 2 days ago");
  });
  it("falls back to listed", () => {
    const f = resolveFreshnessInfo(makeResult({ availabilityConfirmedAt: null }));
    expect(f?.kind).toBe("listed");
    expect(f?.text).toBe("Listed 2d");
  });
  it("invalid date → null", () => {
    expect(resolveFreshnessInfo(makeResult({ availabilityConfirmedAt: null, listedAt: "garbage" }))).toBeNull();
  });
});

describe("resolveFooterSegments", () => {
  it("response rate finite 0-100 only", () => {
    const seg = (pct: number | null) => resolveFooterSegments(makeResult({ responseRatePct: pct }), null, "Owner").find((s) => s.key === "response");
    expect(seg(0)?.text).toBe("Responds 0%");
    expect(seg(100)?.text).toBe("Responds 100%");
    expect(seg(-1)).toBeUndefined();
    expect(seg(101)).toBeUndefined();
    expect(seg(NaN)).toBeUndefined();
    expect(seg(null)).toBeUndefined();
  });
  it("response aria label is complete", () => {
    const s = resolveFooterSegments(makeResult({ responseRatePct: 100 }), null, "Owner").find((x) => x.key === "response");
    expect(s?.ariaLabel).toBe("Responds to 100 percent of enquiries");
  });
  it("assembles lister always; freshness when provided", () => {
    const segs = resolveFooterSegments(makeResult(), { kind: "listed", days: 2, text: "Listed 2d", ariaLabel: "Listed 2 days ago" }, "Owner");
    expect(segs.map((s) => s.key)).toEqual(["lister", "listed"]);
  });
});
