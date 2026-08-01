import { describe, it, expect } from "vitest";
import { shouldAutoOpenSetup, canAdoptGeoCity, type GeoAdoptArgs } from "../state/searchSetupGating";

describe("shouldAutoOpenSetup — auto-open only when no committed location", () => {
  it("opens when both city and areas are absent (empty)", () => {
    expect(shouldAutoOpenSetup("")).toBe(true);
  });
  it("opens with a mode but no location (type=rent only)", () => {
    expect(shouldAutoOpenSetup("type=rent")).toBe(true);
  });
  it("does NOT open when a city is present", () => {
    expect(shouldAutoOpenSetup("city=bengaluru")).toBe(false);
  });
  it("does NOT open when areas (locations) are present", () => {
    expect(shouldAutoOpenSetup("locations=loc1")).toBe(false);
  });
  it("does NOT open when locations_data is present", () => {
    const data = btoa(JSON.stringify({ v: 1, items: [{ id: "loc1", label: "A", type: "area" }] }));
    expect(shouldAutoOpenSetup(`locations_data=${data}`)).toBe(false);
  });
});

describe("canAdoptGeoCity — Vercel seeds only a fully-empty search and never overwrites", () => {
  const base: GeoAdoptArgs = {
    hasApproxCity: true,
    alreadySeeded: false,
    userSelectedCity: false,
    committedCity: false,
    committedAreaCount: 0,
    panelOpen: false,
  };

  it("adopts when the search is fully empty (approx present, closed, not seeded)", () => {
    expect(canAdoptGeoCity(base)).toBe(true);
  });
  it("does NOT overwrite a restored/committed URL city", () => {
    expect(canAdoptGeoCity({ ...base, committedCity: true })).toBe(false);
  });
  it("does NOT overwrite selected Areas", () => {
    expect(canAdoptGeoCity({ ...base, committedAreaCount: 2 })).toBe(false);
  });
  it("does NOT overwrite a city the user selected/typed", () => {
    expect(canAdoptGeoCity({ ...base, userSelectedCity: true })).toBe(false);
  });
  it("does NOT apply while the Setup draft is open", () => {
    expect(canAdoptGeoCity({ ...base, panelOpen: true })).toBe(false);
  });
  it("seeds only once (already seeded → no)", () => {
    expect(canAdoptGeoCity({ ...base, alreadySeeded: true })).toBe(false);
  });
  it("no-ops when there is no approximate city", () => {
    expect(canAdoptGeoCity({ ...base, hasApproxCity: false })).toBe(false);
  });
});
