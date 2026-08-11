import { describe, it, expect } from "vitest";
import {
  resolvePropertyLocation,
  type NormalizedGooglePlace,
  type GeoCandidate,
} from "@/lib/location/resolvePropertyLocation";

const BLR_CITY: GeoCandidate = {
  place_id: "place_blr",
  display_name: "Bengaluru",
  center: { lat: 12.9716, lng: 77.5946 },
  bbox: null,
};

const base = (over: Partial<NormalizedGooglePlace> = {}): NormalizedGooglePlace => ({
  place_id: "p1",
  display_name: "Prestige Lakeside Habitat",
  types: ["premise", "establishment"],
  location: { lat: 12.9081, lng: 77.6476 },
  formatted_address: "Prestige Lakeside Habitat, Varthur, Bengaluru 560087",
  addressComponents: [
    { types: ["route"], longText: "Gunjur Main Road" },
    { types: ["sublocality_level_1"], longText: "Varthur" },
    { types: ["locality"], longText: "Bengaluru" },
    { types: ["administrative_area_level_1"], longText: "Karnataka" },
    { types: ["postal_code"], longText: "560087" },
  ],
  primaryCityCandidate: BLR_CITY,
  ...over,
});

describe("resolvePropertyLocation", () => {
  it("credible Google building → source google, not owner-required", () => {
    const r = resolvePropertyLocation(base());
    expect(r.building_name).toBe("Prestige Lakeside Habitat");
    expect(r.building_name_source).toBe("google");
    expect(r.ownerBuildingRequired).toBe(false);
  });

  it("no credible building type → owner required; owner name → source owner", () => {
    const noName = base({ types: ["route"], display_name: "Gunjur Main Road", ownerBuildingName: undefined });
    const r1 = resolvePropertyLocation(noName);
    expect(r1.ownerBuildingRequired).toBe(true);
    expect(r1.building_name).toBeNull();
    expect(r1.building_name_source).toBeNull();

    const r2 = resolvePropertyLocation(base({ types: ["route"], display_name: "Gunjur Main Road", ownerBuildingName: "Green Residency" }));
    expect(r2.building_name).toBe("Green Residency");
    expect(r2.building_name_source).toBe("owner");
    expect(r2.ownerBuildingRequired).toBe(true);
  });

  it("uses the supplied verified primary-city candidate", () => {
    const r = resolvePropertyLocation(base());
    expect(r.primaryCity?.place_id).toBe("place_blr");
    expect(r.blockingIssues).not.toContain("google_city_unresolved");
    // City is the verified candidate — never the locality component text.
    expect(r.address.locality).toBe("Varthur");
  });

  it("no supplied city candidate → google_city_unresolved (admin-area never becomes city)", () => {
    const r = resolvePropertyLocation(
      base({
        primaryCityCandidate: null,
        addressComponents: [
          { types: ["administrative_area_level_2"], longText: "Bengaluru Urban" },
          { types: ["administrative_area_level_1"], longText: "Karnataka" },
        ],
      }),
    );
    expect(r.blockingIssues).toContain("google_city_unresolved");
    expect(r.primaryCity).toBeNull();
  });

  it("missing street/locality/pincode is NOT blocking", () => {
    const r = resolvePropertyLocation(
      base({
        addressComponents: [{ types: ["administrative_area_level_1"], longText: "Karnataka" }],
      }),
    );
    expect(r.address.street_address).toBeNull();
    expect(r.address.locality).toBeNull();
    expect(r.address.pincode).toBeNull();
    expect(r.blockingIssues).toEqual([]); // has coords + city candidate
  });

  it("no coordinates → no_coordinates blocking", () => {
    const r = resolvePropertyLocation(base({ location: null }));
    expect(r.blockingIssues).toContain("no_coordinates");
  });

  it("caps secondary cities at 2", () => {
    const c = (id: string): GeoCandidate => ({ place_id: id, display_name: id, center: { lat: 1, lng: 1 }, bbox: null });
    const r = resolvePropertyLocation(base({ secondaryCityCandidates: [c("a"), c("b"), c("c")] }));
    expect(r.secondaryCities).toHaveLength(2);
  });
});
