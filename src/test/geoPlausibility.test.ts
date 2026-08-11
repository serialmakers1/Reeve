import { describe, it, expect } from "vitest";
import { isGeoPlausible, haversineMeters, GEO_PLAUSIBILITY } from "@/lib/location/geoPlausibility";

const HARALUR = { lat: 12.9081, lng: 77.6476 };
const HSR = { lat: 12.9116, lng: 77.6446 }; // ~0.5 km
const INDIRANAGAR = { lat: 12.9719, lng: 77.6412 }; // ~7 km
const SARJAPUR_ROAD = { lat: 12.901, lng: 77.687 }; // ~2.3 km

describe("isGeoPlausible (owner extra area/road safety check)", () => {
  it("accepts a nearby area within 3 km", () => {
    expect(haversineMeters(HARALUR, HSR)).toBeLessThan(GEO_PLAUSIBILITY.areaMaxMeters);
    expect(isGeoPlausible(HARALUR, HSR, null, "area")).toBe(true);
  });

  it("rejects a distant area (Indiranagar for a Haralur pin)", () => {
    expect(haversineMeters(HARALUR, INDIRANAGAR)).toBeGreaterThan(GEO_PLAUSIBILITY.areaMaxMeters);
    expect(isGeoPlausible(HARALUR, INDIRANAGAR, null, "area")).toBe(false);
  });

  it("accepts a long road at the wider road threshold where an area would be rejected", () => {
    const d = haversineMeters(HARALUR, SARJAPUR_ROAD);
    expect(d).toBeGreaterThan(GEO_PLAUSIBILITY.areaMaxMeters);
    expect(d).toBeLessThan(GEO_PLAUSIBILITY.roadMaxMeters);
    expect(isGeoPlausible(HARALUR, SARJAPUR_ROAD, null, "road")).toBe(true);
    expect(isGeoPlausible(HARALUR, SARJAPUR_ROAD, null, "area")).toBe(false);
  });

  it("accepts when the pin is inside the bbox even if beyond centre distance", () => {
    const farCenter = { lat: 13.2, lng: 77.9 };
    const bbox = { sw: { lat: 12.8, lng: 77.5 }, ne: { lat: 13.0, lng: 77.7 } };
    expect(isGeoPlausible(HARALUR, farCenter, bbox, "area")).toBe(true);
  });

  it("returns false when either point is missing (cannot confirm)", () => {
    expect(isGeoPlausible(null, HSR, null, "area")).toBe(false);
    expect(isGeoPlausible(HARALUR, null, null, "area")).toBe(false);
  });
});
