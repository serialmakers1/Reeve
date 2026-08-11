import { describe, it, expect } from "vitest";
import { formatBuildingLine } from "@/lib/location/formatBuildingLine";

describe("formatBuildingLine", () => {
  it("uses building name when present", () => {
    expect(formatBuildingLine({ building_name: "Prestige Lakeside", locality: "Whitefield", city: "Bengaluru" }))
      .toBe("Prestige Lakeside");
  });

  it("falls back to locality when building name is null/blank", () => {
    expect(formatBuildingLine({ building_name: null, locality: "Whitefield", city: "Bengaluru" })).toBe("Whitefield");
    expect(formatBuildingLine({ building_name: "   ", locality: "Whitefield", city: "Bengaluru" })).toBe("Whitefield");
  });

  it("falls back to city when building + locality are absent", () => {
    expect(formatBuildingLine({ building_name: null, locality: null, city: "Bengaluru" })).toBe("Bengaluru");
  });

  it("uses the provided fallback when nothing is available", () => {
    expect(formatBuildingLine({ building_name: null, locality: null, city: null })).toBe("this property");
    expect(formatBuildingLine({}, "Your property")).toBe("Your property");
  });
});
