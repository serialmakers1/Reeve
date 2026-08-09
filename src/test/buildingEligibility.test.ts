import { describe, it, expect } from "vitest";
import { isBuildingResult } from "@/components/property-address/buildingEligibility";

describe("isBuildingResult (Path A building filter)", () => {
  it("accepts a genuine building/premise/POI result", () => {
    expect(isBuildingResult(["premise", "establishment"])).toBe(true);
    expect(isBuildingResult(["point_of_interest", "establishment"])).toBe(true);
    expect(isBuildingResult(["subpremise"])).toBe(true);
  });

  it("rejects a purely geographic/area result (locality, sublocality)", () => {
    expect(isBuildingResult(["locality", "political"])).toBe(false);
    expect(isBuildingResult(["sublocality_level_1", "political"])).toBe(false);
    expect(isBuildingResult(["neighborhood", "political"])).toBe(false);
  });

  it("rejects a street/route/address-only result", () => {
    expect(isBuildingResult(["route"])).toBe(false);
    expect(isBuildingResult(["street_address"])).toBe(false);
    expect(isBuildingResult(["street_number", "route"])).toBe(false);
  });

  it("rejects a postal code / admin area", () => {
    expect(isBuildingResult(["postal_code"])).toBe(false);
    expect(isBuildingResult(["administrative_area_level_2", "political"])).toBe(false);
    expect(isBuildingResult(["country", "political"])).toBe(false);
  });

  it("accepts a mixed result that includes any non-geographic type", () => {
    expect(isBuildingResult(["establishment", "political"])).toBe(true);
  });

  it("fails open for empty/unknown types (never silently drops a legit result)", () => {
    expect(isBuildingResult([])).toBe(true);
    expect(isBuildingResult(null)).toBe(true);
    expect(isBuildingResult(undefined)).toBe(true);
    expect(isBuildingResult(["some_new_google_type"])).toBe(true);
  });
});
