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

const labels = (facts: { label: string }[]) => facts.map((f) => f.label);
const concepts = (facts: { concept: string }[]) => facts.map((f) => f.concept);

// ── Rent ────────────────────────────────────────────────────────────────────

describe("resolveComparisonFacts — Rent", () => {
  it("returns empty array when all fields null (fewer than 3 is allowed)", () => {
    expect(resolveComparisonFacts(base(), "rent")).toHaveLength(0);
  });

  it("returns at most 3 facts even when many are disclosed", () => {
    const r: SearchPropertyResult = {
      ...base(),
      carpetAreaSqft: 800,
      superBuiltUpSqft: 1000,
      furnishing: "fully_furnished",
      parking4w: "covered",
      rentBrokerageType: "zero",
      securityDepositAmount: 100000,
      lockInMonths: 6,
      petPolicy: "allowed",
    };
    expect(resolveComparisonFacts(r, "rent").length).toBe(3);
  });

  it("carpet area is the first fact (Space group), with an explicit label", () => {
    const facts = resolveComparisonFacts({ ...base(), carpetAreaSqft: 900 }, "rent");
    expect(facts[0].label).toBe("900 sq.ft carpet");
    expect(facts[0].concept).toBe("size");
  });

  it("size is exclusive: carpet present → super built-up is NOT also shown", () => {
    const facts = resolveComparisonFacts(
      { ...base(), carpetAreaSqft: 800, superBuiltUpSqft: 1000 },
      "rent",
    );
    expect(labels(facts)).toContain("800 sq.ft carpet");
    expect(labels(facts).some((l) => l.includes("super built-up"))).toBe(false);
    expect(concepts(facts).filter((c) => c === "size")).toHaveLength(1);
  });

  it("super built-up is used only when carpet is null", () => {
    const facts = resolveComparisonFacts({ ...base(), superBuiltUpSqft: 1100 }, "rent");
    expect(facts[0].label).toBe("1,100 sq.ft super built-up");
  });

  it("picks one fact per group first: Space + Move-in friction + Utility", () => {
    const r: SearchPropertyResult = {
      ...base(),
      carpetAreaSqft: 900,
      rentBrokerageType: "zero",
      furnishing: "semi_furnished",
    };
    const facts = resolveComparisonFacts(r, "rent");
    expect(labels(facts)).toEqual(["900 sq.ft carpet", "Zero brokerage", "Semi-furnished"]);
  });

  it("brokerage is exclusive: zero brokerage wins over a brokerage amount", () => {
    const r: SearchPropertyResult = {
      ...base(),
      rentBrokerageType: "zero",
      rentBrokerageFixed: 20000,
    };
    const facts = resolveComparisonFacts(r, "rent");
    expect(labels(facts)).toContain("Zero brokerage");
    expect(concepts(facts).filter((c) => c === "brokerage")).toHaveLength(1);
  });

  it("parking is exclusive: 4W preferred over 2W", () => {
    const facts = resolveComparisonFacts(
      { ...base(), parking4w: "covered", parking2w: "uncovered" },
      "rent",
    );
    expect(labels(facts)).toContain("4W parking");
    expect(labels(facts)).not.toContain("2W parking");
  });

  it("2W parking used when 4W is none", () => {
    const facts = resolveComparisonFacts(
      { ...base(), parking4w: "none", parking2w: "covered" },
      "rent",
    );
    expect(labels(facts)).toContain("2W parking");
  });

  it("deposit surfaces as move_in_cost when no brokerage present", () => {
    const facts = resolveComparisonFacts({ ...base(), securityDepositAmount: 50000 }, "rent");
    expect(labels(facts).some((l) => l.includes("deposit"))).toBe(true);
  });

  it("excludeConcepts drops a concept already shown elsewhere (e.g. the signal chip)", () => {
    const r: SearchPropertyResult = {
      ...base(),
      carpetAreaSqft: 900,
      rentBrokerageType: "zero",
      furnishing: "semi_furnished",
      parking4w: "covered",
    };
    const withBrokerage = resolveComparisonFacts(r, "rent");
    expect(labels(withBrokerage)).toContain("Zero brokerage");

    const excluded = resolveComparisonFacts(r, "rent", ["brokerage"]);
    expect(labels(excluded)).not.toContain("Zero brokerage");
    // Slot is backfilled by the next distinct-concept candidate (parking).
    expect(labels(excluded)).toEqual(["900 sq.ft carpet", "Semi-furnished", "4W parking"]);
  });

  it("is deterministic across repeated calls", () => {
    const r: SearchPropertyResult = {
      ...base(),
      carpetAreaSqft: 900,
      rentBrokerageType: "zero",
      furnishing: "semi_furnished",
      parking4w: "covered",
      petPolicy: "allowed",
    };
    const a = labels(resolveComparisonFacts(r, "rent"));
    const b = labels(resolveComparisonFacts(r, "rent"));
    expect(a).toEqual(b);
  });

  it("never returns a Property-tax fact", () => {
    const r: SearchPropertyResult = { ...base(), carpetAreaSqft: 900, furnishing: "semi_furnished" };
    const facts = resolveComparisonFacts(r, "rent");
    expect(labels(facts).some((l) => /tax/i.test(l))).toBe(false);
  });
});

// ── Buy ─────────────────────────────────────────────────────────────────────

describe("resolveComparisonFacts — Buy", () => {
  it("carpet is fact 1; readiness (ready to move) follows", () => {
    const facts = resolveComparisonFacts(
      { ...base(), carpetAreaSqft: 1200, possessionStatus: "ready_to_move" },
      "buy",
    );
    expect(facts[0].label).toBe("1,200 sq.ft carpet");
    expect(facts[1].label).toBe("Ready to move");
  });

  it("readiness is exclusive: ready-to-move OR possession date, not both", () => {
    const facts = resolveComparisonFacts(
      { ...base(), possessionStatus: "ready_to_move", possessionDate: "2027-06-01" },
      "buy",
    );
    expect(concepts(facts).filter((c) => c === "readiness")).toHaveLength(1);
    expect(labels(facts)).toContain("Ready to move");
  });

  it("possession date used when not ready-to-move", () => {
    const facts = resolveComparisonFacts(
      { ...base(), possessionStatus: "under_construction", possessionDate: "2027-06-01" },
      "buy",
    );
    expect(labels(facts).some((l) => l.startsWith("Possession:"))).toBe(true);
  });

  it("zero brokerage wins over a brokerage percentage", () => {
    const facts = resolveComparisonFacts({ ...base(), saleBrokeragePct: 0 }, "buy");
    expect(labels(facts)).toContain("Zero brokerage");
  });

  it("brokerage percentage shown when non-zero", () => {
    const facts = resolveComparisonFacts({ ...base(), saleBrokeragePct: 1.5 }, "buy");
    expect(labels(facts)).toContain("1.5% brokerage");
  });

  it("negotiable surfaces as a transaction-friction fact", () => {
    const facts = resolveComparisonFacts({ ...base(), priceNegotiable: true }, "buy");
    expect(labels(facts)).toContain("Negotiable");
  });

  it("furnishing is a valid buy utility fact", () => {
    const facts = resolveComparisonFacts(
      { ...base(), carpetAreaSqft: 900, furnishing: "fully_furnished" },
      "buy",
    );
    expect(labels(facts)).toContain("Fully furnished");
  });

  it("caps at 3 and stays deterministic", () => {
    const r: SearchPropertyResult = {
      ...base(),
      carpetAreaSqft: 1000,
      possessionStatus: "ready_to_move",
      saleBrokeragePct: 0,
      parking4w: "covered",
      furnishing: "semi_furnished",
    };
    const facts = resolveComparisonFacts(r, "buy");
    expect(facts.length).toBe(3);
    expect(labels(facts)).toEqual(labels(resolveComparisonFacts(r, "buy")));
  });
});
