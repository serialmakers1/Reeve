import { describe, it, expect } from "vitest";
import { deriveConflictFieldResets } from "@/lib/adminConflictReset";

const LIVE_ROW = {
  bhk: "2BHK",
  property_type: "villa",
  rera_registration_number: "RERA-LIVE",
  youtube_walkthrough_url: "https://youtu.be/live",
  parking_notes: "live parking notes",
  building_rules: "live rules",
  building_notes: "live about",
  amenities: { building: ["lift", "gym"], furnishing_items: ["bed"] },
  furnishing_detail: [{ item: "sofa" }, { item: "fridge" }],
};

describe("deriveConflictFieldResets", () => {
  it("resets a scalar column to its live value", () => {
    expect(deriveConflictFieldResets(["bhk"], LIVE_ROW)).toEqual({ bhk: "2BHK" });
  });

  it("resets only the conflicting keys — unrelated fields are never included (preservation)", () => {
    const resets = deriveConflictFieldResets(["building_notes"], LIVE_ROW);
    expect(resets).toEqual({ buildingNotes: "live about" });
    // No other field key leaks in — the component leaves those states untouched.
    expect(Object.keys(resets)).toEqual(["buildingNotes"]);
  });

  it("extracts amenities.building array and furnishing_detail array for structured columns", () => {
    const resets = deriveConflictFieldResets(["amenities", "furnishing_detail"], LIVE_ROW);
    expect(resets.buildingAmenities).toEqual(["lift", "gym"]);
    expect(resets.furnishingDetail).toEqual([{ item: "sofa" }, { item: "fridge" }]);
  });

  it("uses safe empty/default values when live column is null/missing", () => {
    const resets = deriveConflictFieldResets(
      ["bhk", "property_type", "building_notes", "amenities", "furnishing_detail"],
      { bhk: null, property_type: null, building_notes: null, amenities: null, furnishing_detail: null },
    );
    expect(resets.bhk).toBe("");
    expect(resets.propertyType).toBe("apartment"); // form default
    expect(resets.buildingNotes).toBe("");
    expect(resets.buildingAmenities).toEqual([]);
    expect(resets.furnishingDetail).toEqual([]);
  });

  it("ignores unknown keys (no reset entry produced)", () => {
    expect(deriveConflictFieldResets(["some_other_column"], LIVE_ROW)).toEqual({});
  });

  it("maps every reviewable conflict column", () => {
    const all = deriveConflictFieldResets(
      [
        "bhk",
        "property_type",
        "rera_registration_number",
        "youtube_walkthrough_url",
        "parking_notes",
        "building_rules",
        "building_notes",
        "amenities",
        "furnishing_detail",
      ],
      LIVE_ROW,
    );
    expect(all).toEqual({
      bhk: "2BHK",
      propertyType: "villa",
      reraRegistrationNumber: "RERA-LIVE",
      youtubeWalkthroughUrl: "https://youtu.be/live",
      parkingNotes: "live parking notes",
      buildingRules: "live rules",
      buildingNotes: "live about",
      buildingAmenities: ["lift", "gym"],
      furnishingDetail: [{ item: "sofa" }, { item: "fridge" }],
    });
  });
});
