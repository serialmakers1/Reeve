import { describe, it, expect } from "vitest";
import {
  isCanonicalCityType,
  buildCityEvidenceSet,
  pickPrimaryCityPid,
  deriveSecondaryCities,
  validateAdminSecondaries,
  CityClassifyError,
  type CityCandidate,
} from "../../supabase/functions/confirm-property-location/geoClassify";

const city = (
  placeId: string,
  types: string[] = ["locality"],
  extra: Partial<CityCandidate> = {},
): CityCandidate => ({ placeId, displayName: placeId, types, country: "IN", ...extra });

describe("isCanonicalCityType — Reeve India convention", () => {
  it("accepts locality and administrative_area_level_3", () => {
    expect(isCanonicalCityType(["locality"])).toBe(true);
    expect(isCanonicalCityType(["administrative_area_level_3", "political"])).toBe(true);
  });
  it("rejects postal_town, admin_area_level_2, non-city, and empty", () => {
    expect(isCanonicalCityType(["postal_town"])).toBe(false);
    expect(isCanonicalCityType(["administrative_area_level_2"])).toBe(false);
    expect(isCanonicalCityType(["route"])).toBe(false);
    expect(isCanonicalCityType([])).toBe(false);
    expect(isCanonicalCityType(undefined)).toBe(false);
  });
});

describe("buildCityEvidenceSet", () => {
  it("keeps canonical India cities, drops non-city / non-India / NEAR, dedupes", () => {
    const set = buildCityEvidenceSet([
      city("ahd", ["locality"], { containment: "WITHIN" }),
      city("ghn", ["locality"], { containment: "OUTSKIRTS" }),
      city("pt", ["postal_town"]),
      city("usa", ["locality"], { country: "US" }),
      city("near", ["locality"], { containment: "NEAR" }),
      city("ahd", ["locality"]), // duplicate
    ]);
    expect(set.map((c) => c.placeId)).toEqual(["ahd", "ghn"]);
  });
  it("ranks WITHIN before OUTSKIRTS before plain results, stable within a rank", () => {
    const set = buildCityEvidenceSet([
      city("b", ["locality"], { containment: "OUTSKIRTS" }),
      city("a", ["locality"], { containment: "WITHIN" }),
      city("c", ["locality"]),
    ]);
    expect(set.map((c) => c.placeId)).toEqual(["a", "b", "c"]);
  });
});

describe("pickPrimaryCityPid", () => {
  const evidence = new Set(["ahd", "ghn"]);

  it("admin explicit override in evidence wins over resolved google city", () => {
    expect(pickPrimaryCityPid("admin", "ahd", "ghn", evidence)).toEqual({ placeId: "ghn", source: "admin" });
  });
  it("admin explicit override NOT in evidence → city_not_associated", () => {
    expect(() => pickPrimaryCityPid("admin", "ahd", "delhi", evidence)).toThrow(CityClassifyError);
    try {
      pickPrimaryCityPid("admin", "ahd", "delhi", evidence);
    } catch (e) {
      expect((e as CityClassifyError).code).toBe("city_not_associated");
    }
  });
  it("admin override equal to grandfathered admin primary is accepted even if absent from evidence", () => {
    expect(pickPrimaryCityPid("admin", "ahd", "old", evidence, "old")).toEqual({ placeId: "old", source: "admin" });
  });
  it("admin null = reset to google primary", () => {
    expect(pickPrimaryCityPid("admin", "ahd", null, evidence)).toEqual({ placeId: "ahd", source: "google" });
    expect(pickPrimaryCityPid("admin", null, null, evidence)).toBeNull();
  });
  it("admin omitted → grandfathered admin primary, else google, else persisted", () => {
    expect(pickPrimaryCityPid("admin", "ahd", undefined, evidence, "gf")).toEqual({ placeId: "gf", source: "admin" });
    expect(pickPrimaryCityPid("admin", "ahd", undefined, evidence)).toEqual({ placeId: "ahd", source: "google" });
    expect(pickPrimaryCityPid("admin", null, undefined, evidence, null, "persisted")).toEqual({ placeId: "persisted", source: "google" });
  });
  it("owner override only applies when google unresolved; never overrides resolved city", () => {
    expect(pickPrimaryCityPid("owner", "ahd", "ghn", evidence)).toEqual({ placeId: "ahd", source: "google" });
    expect(pickPrimaryCityPid("owner", null, "ghn", evidence)).toEqual({ placeId: "ghn", source: "google" });
    expect(pickPrimaryCityPid("owner", null, "delhi", evidence)).toBeNull(); // not in evidence
  });
});

describe("deriveSecondaryCities — auto (after final primary)", () => {
  it("excludes the final primary, caps at 2, deterministic order", () => {
    const evidence = [city("ahd"), city("ghn"), city("nad"), city("kal")];
    expect(deriveSecondaryCities(evidence, "ahd").map((c) => c.placeId)).toEqual(["ghn", "nad"]);
  });
  it("admin-corrected primary frees the old google primary to become a secondary", () => {
    // Ahmedabad was google primary; admin corrects to Gandhinagar → Ahmedabad becomes secondary.
    const evidence = buildCityEvidenceSet([city("ahd", ["locality"], { containment: "WITHIN" }), city("ghn")]);
    expect(deriveSecondaryCities(evidence, "ghn").map((c) => c.placeId)).toEqual(["ahd"]);
  });
});

describe("validateAdminSecondaries — reject, never truncate", () => {
  const evidence = new Set(["ahd", "ghn", "nad"]);
  it("accepts evidence-backed cities, dedupes", () => {
    const out = validateAdminSecondaries([city("ghn"), city("ghn"), city("nad")], "ahd", evidence);
    expect(out.map((c) => c.placeId)).toEqual(["ghn", "nad"]);
  });
  it("rejects a secondary equal to the final primary", () => {
    try { validateAdminSecondaries([city("ahd")], "ahd", evidence); expect.unreachable(); }
    catch (e) { expect((e as CityClassifyError).code).toBe("secondary_is_primary"); }
  });
  it("rejects a city not in evidence", () => {
    try { validateAdminSecondaries([city("delhi")], "ahd", evidence); expect.unreachable(); }
    catch (e) { expect((e as CityClassifyError).code).toBe("city_not_associated"); }
  });
  it("rejects a non-city / non-India entity", () => {
    try { validateAdminSecondaries([city("ghn", ["postal_town"])], "ahd", evidence); expect.unreachable(); }
    catch (e) { expect((e as CityClassifyError).code).toBe("city_not_associated"); }
    try { validateAdminSecondaries([city("ghn", ["locality"], { country: "US" })], "ahd", evidence); expect.unreachable(); }
    catch (e) { expect((e as CityClassifyError).code).toBe("city_not_associated"); }
  });
  it("rejects >2 UNIQUE explicit cities (not capped)", () => {
    const four = new Set(["a", "b", "c", "d"]);
    try {
      validateAdminSecondaries([city("a"), city("b"), city("c")], "primary", four);
      expect.unreachable();
    } catch (e) { expect((e as CityClassifyError).code).toBe("too_many_secondaries"); }
  });
  it("accepts a grandfathered admin secondary absent from today's evidence (unchanged target)", () => {
    const out = validateAdminSecondaries([city("old")], "ahd", evidence, new Set(["old"]));
    expect(out.map((c) => c.placeId)).toEqual(["old"]);
  });
  it("relationship-specific: a grandfathered admin SECONDARY used as PRIMARY needs today's evidence", () => {
    // 'old' is grandfathered as a secondary, not primary → as primary it must be in evidence.
    expect(() => pickPrimaryCityPid("admin", "ahd", "old", evidence, null)).toThrow(CityClassifyError);
  });
});
