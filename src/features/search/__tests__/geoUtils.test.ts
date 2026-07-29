import { describe, it, expect } from "vitest";
import { viewportToBoundsLiteral } from "../domain/geoUtils";

describe("viewportToBoundsLiteral", () => {
  it("maps low/high to south/west/north/east", () => {
    expect(
      viewportToBoundsLiteral({
        low: { lat: 12.8, lng: 77.4 },
        high: { lat: 13.1, lng: 77.8 },
      }),
    ).toEqual({ south: 12.8, west: 77.4, north: 13.1, east: 77.8 });
  });

  it("returns null for null/undefined", () => {
    expect(viewportToBoundsLiteral(null)).toBeNull();
    expect(viewportToBoundsLiteral(undefined)).toBeNull();
  });

  it("returns null when a coordinate is missing/non-numeric", () => {
    // @ts-expect-error intentionally malformed
    expect(viewportToBoundsLiteral({ low: { lat: 12.8 }, high: { lat: 13.1, lng: 77.8 } })).toBeNull();
    // @ts-expect-error intentionally malformed
    expect(viewportToBoundsLiteral({ low: { lat: "x", lng: 77.4 }, high: { lat: 13.1, lng: 77.8 } })).toBeNull();
  });
});
