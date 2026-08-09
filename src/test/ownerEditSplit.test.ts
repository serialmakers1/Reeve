import { describe, it, expect } from "vitest";
import { splitAmenitiesChange, splitFurnishingChange } from "@/lib/reviewAmenities";
import { isBuildingResult } from "@/components/property-address/buildingEligibility";

describe("splitAmenitiesChange", () => {
  it("keeps predefined toggles live and routes a new custom name to review", () => {
    const oldAm = { building: ["lift", "gym"], furnishing_items: ["fan"] };
    const newAm = { building: ["lift", "gym", "garden", "rooftop lounge"], furnishing_items: ["fan"] };
    const { live, newCustomBuilding } = splitAmenitiesChange(oldAm, newAm);
    expect(live.building).toEqual(["lift", "gym", "garden"]); // predefined 'garden' stays live
    expect(newCustomBuilding).toEqual(["rooftop lounge"]);    // new custom → review
  });

  it("keeps an already-approved custom (and its removal) live", () => {
    const oldAm = { building: ["lift", "private helipad"], furnishing_items: [] };
    // removal of the approved custom → live, no review
    const removed = splitAmenitiesChange(oldAm, { building: ["lift"], furnishing_items: [] });
    expect(removed.newCustomBuilding).toEqual([]);
    expect(removed.live.building).toEqual(["lift"]);
    // keeping the approved custom → live, not re-flagged as new
    const kept = splitAmenitiesChange(oldAm, { building: ["lift", "private helipad"], furnishing_items: [] });
    expect(kept.newCustomBuilding).toEqual([]);
    expect(kept.live.building).toContain("private helipad");
  });
});

describe("splitFurnishingChange", () => {
  it("keeps predefined + count edits live, routes new custom item to review", () => {
    const oldFd = [{ item: "bed", count: 1 }, { item: "study table", count: 1 }];
    const newFd = [{ item: "bed", count: 2 }, { item: "study table", count: 2 }, { item: "hammock" }];
    const { live, newCustomItems } = splitFurnishingChange(oldFd, newFd);
    // bed (predefined, count changed) + study table (approved custom, count changed) stay live
    expect(live.map((e) => e.item)).toEqual(["bed", "study table"]);
    expect(newCustomItems.map((e) => e.item)).toEqual(["hammock"]);
  });
});

describe("isBuildingResult", () => {
  it("accepts building/premise/POI predictions", () => {
    expect(isBuildingResult(["premise"])).toBe(true);
    expect(isBuildingResult(["establishment", "point_of_interest"])).toBe(true);
    expect(isBuildingResult(["subpremise"])).toBe(true);
  });

  it("rejects purely geographic/address-only predictions", () => {
    expect(isBuildingResult(["locality", "political"])).toBe(false);
    expect(isBuildingResult(["route"])).toBe(false);
    expect(isBuildingResult(["postal_code"])).toBe(false);
    expect(isBuildingResult(["administrative_area_level_2", "political"])).toBe(false);
  });

  it("fails open on empty/unknown types", () => {
    expect(isBuildingResult([])).toBe(true);
    expect(isBuildingResult(null)).toBe(true);
  });
});
