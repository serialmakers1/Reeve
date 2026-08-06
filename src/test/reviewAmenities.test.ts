import { describe, it, expect } from "vitest";
import {
  isCustomAmenity,
  normalizeFurnishingForDisplay,
  normalizeAmenitiesForDisplay,
} from "@/lib/reviewAmenities";

describe("isCustomAmenity", () => {
  it("does not mark a canonical amenity as custom", () => {
    expect(isCustomAmenity("lift")).toBe(false);
    expect(isCustomAmenity("power_backup")).toBe(false);
  });
  it("marks an unknown amenity as custom", () => {
    expect(isCustomAmenity("rooftop_infinity_pool")).toBe(true);
  });
});

describe("normalizeFurnishingForDisplay", () => {
  it("flags custom:true items and labels curated items", () => {
    const { items, malformed } = normalizeFurnishingForDisplay([
      { item: "ac", count: 2, rooms: "Master" },
      { item: "Study table", custom: true, count: 1 },
    ]);
    expect(malformed).toBe(false);
    expect(items[0]).toMatchObject({ label: "AC", count: 2, rooms: "Master", custom: false });
    expect(items[1]).toMatchObject({ label: "Study table", count: 1, custom: true });
  });

  it("does not crash on malformed (non-array) input", () => {
    expect(normalizeFurnishingForDisplay("nope")).toEqual({ items: [], malformed: true });
    expect(normalizeFurnishingForDisplay(null)).toEqual({ items: [], malformed: false });
  });
});

describe("normalizeAmenitiesForDisplay", () => {
  it("splits curated vs custom building amenities and de-duplicates", () => {
    const { building, malformed } = normalizeAmenitiesForDisplay({
      building: ["lift", "rooftop_garden", "lift"],
      furnishing_items: ["ac"],
    });
    expect(malformed).toBe(false);
    expect(building).toHaveLength(2);
    expect(building.find((b) => b.value === "lift")).toMatchObject({ custom: false });
    expect(building.find((b) => b.value === "rooftop_garden")).toMatchObject({ custom: true });
  });

  it("treats furnishing_items as curated (never custom)", () => {
    const { furnishingItems } = normalizeAmenitiesForDisplay({ furnishing_items: ["ac", "tv"] });
    expect(furnishingItems.every((f) => f.custom === false)).toBe(true);
  });

  it("does not crash on malformed shapes", () => {
    expect(normalizeAmenitiesForDisplay([1, 2, 3]).malformed).toBe(true);
    expect(normalizeAmenitiesForDisplay(null)).toEqual({
      building: [],
      furnishingItems: [],
      malformed: false,
    });
  });
});
