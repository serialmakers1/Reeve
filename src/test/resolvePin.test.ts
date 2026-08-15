import { describe, it, expect } from "vitest";
import {
  mapFactual, indiaStatus, classifyCandidates, buildingDecision,
  chooseRootSettlement, buildFinalAssociations, computeBuildingIntent,
  classifyExtraPlace, resolveAdminDiscovery,
} from "../../supabase/functions/confirm-property-location/resolvePin.ts";
import type { FinalPinResolution, PlaceDetails, LatLng } from "../../supabase/functions/confirm-property-location/types.ts";

const comp = (types: string[], long: string, short = long) => ({ types, long_name: long, short_name: short });

function rg(partial: Partial<FinalPinResolution>): FinalPinResolution {
  return {
    status: "ok", country: "IN", components: [], formatted_address: null, plus_code: null,
    cityResults: [], routeCandidate: null, areas: [], ...partial,
  };
}

function bldPlace(partial: Partial<PlaceDetails>): PlaceDetails {
  return {
    id: "PID", displayName: "Prestige Lakeside", formattedAddress: "addr",
    location: { lat: 12.9716, lng: 77.5946 }, types: ["premise", "point_of_interest"],
    viewport: null, plusCode: null, addressComponents: [], ...partial,
  } as PlaceDetails;
}

describe("mapFactual", () => {
  it("maps a full urban IN address", () => {
    const f = mapFactual(rg({
      country: "IN", formatted_address: "12 MG Road, Bengaluru 560001",
      components: [
        comp(["country"], "India", "IN"), comp(["administrative_area_level_1"], "Karnataka"),
        comp(["administrative_area_level_2"], "Bengaluru Urban"), comp(["postal_code"], "560001"),
        comp(["locality"], "Bengaluru"), comp(["sublocality_level_1"], "Shivajinagar"),
        comp(["route"], "MG Road"), comp(["street_number"], "12"),
      ],
    }));
    expect(f.country_code).toBe("IN");
    expect(f.state).toBe("Karnataka");
    expect(f.district).toBe("Bengaluru Urban");
    expect(f.pincode).toBe("560001");
    expect(f.city).toBe("Bengaluru");
    expect(f.locality).toBe("Shivajinagar");
    expect(f.route).toBe("MG Road");
    expect(f.street_address).toBe("12 MG Road");
  });

  it("sparse rural pin: city = deterministic root display name (not array order)", () => {
    const r = rg({
      country: "IN", formatted_address: "Unnamed Road, Karnataka",
      components: [comp(["country"], "India", "IN"), comp(["administrative_area_level_1"], "Karnataka")],
      cityResults: [{ place_id: "V1", display_name: "Devanahalli", types: ["locality"] }],
    });
    const root = chooseRootSettlement(r.cityResults);
    const f = mapFactual(r, root?.display_name ?? null);
    expect(f.country_code).toBe("IN");
    expect(f.city).toBe("Devanahalli"); // from the chosen root
    expect(f.locality).toBeNull();
    expect(f.route).toBeNull();
    expect(f.pincode).toBeNull();
    expect(f.formatted_address).toBe("Unnamed Road, Karnataka");
  });

  it("city is null when there is no deterministic root (no cityResults[0] fabrication)", () => {
    const f = mapFactual(rg({
      country: "IN",
      components: [comp(["country"], "India", "IN"), comp(["administrative_area_level_1"], "Karnataka")],
      cityResults: [{ place_id: "X", display_name: "SomethingNonCanonical", types: ["postal_town"] }],
    }));
    expect(f.city).toBeNull(); // postal_town is not a canonical settlement; no root → city null
  });
});

describe("indiaStatus", () => {
  it("confirmed for IN", () => expect(indiaStatus(rg({ country: "IN" }))).toBe("confirmed"));
  it("outside for an explicit foreign country", () => expect(indiaStatus(rg({ country: "US" }))).toBe("outside"));
  it("unresolved for ZERO_RESULTS (not outside)", () =>
    expect(indiaStatus(rg({ status: "zero_results", country: null }))).toBe("unresolved"));
  it("unresolved for OK with no country component", () =>
    expect(indiaStatus(rg({ status: "ok", country: null }))).toBe("unresolved"));
});

describe("classifyCandidates", () => {
  it("classifies settlement/locality/road; excludes NEAR; OUTSKIRTS is suggestion", () => {
    const cands = classifyCandidates(rg({
      cityResults: [
        { place_id: "S1", display_name: "Bengaluru", types: ["locality"] },
        { place_id: "X", display_name: "NotCity", types: ["postal_town"] }, // not canonical-city → excluded
      ],
      areas: [
        { place_id: "L1", display_name: "Whitefield", containment: "WITHIN" },
        { place_id: "L2", display_name: "Marathahalli", containment: "OUTSKIRTS" },
        { place_id: "L3", display_name: "FarArea", containment: "NEAR" }, // excluded
      ],
      routeCandidate: { place_id: "R1", display_name: "Sarjapur Road" },
    }));
    const byKind = (k: string) => cands.filter((c) => c.kind === k);
    expect(byKind("settlement").map((c) => c.provider_place_id)).toEqual(["S1"]);
    expect(byKind("settlement")[0].root_eligible).toBe(true);
    expect(byKind("locality").map((c) => c.provider_place_id).sort()).toEqual(["L1", "L2"]);
    expect(cands.find((c) => c.provider_place_id === "L1")!.recommendation).toBe("recommended");
    expect(cands.find((c) => c.provider_place_id === "L2")!.recommendation).toBe("suggestion");
    expect(cands.find((c) => c.provider_place_id === "L3")).toBeUndefined();
    expect(byKind("road").map((c) => c.provider_place_id)).toEqual(["R1"]);
  });
});

describe("buildingDecision", () => {
  const pin = { lat: 12.9716, lng: 77.5946 };
  const factual = mapFactual(rg({ components: [comp(["postal_code"], "560103"), comp(["sublocality_level_1"], "Whitefield")] }));

  it("SAME when the pin is inside the provider viewport", () => {
    const p = bldPlace({ viewport: { ne: { lat: 12.98, lng: 77.60 }, sw: { lat: 12.96, lng: 77.59 } } });
    expect(buildingDecision(p, pin, factual, { placeIdSupplied: true }).outcome).toBe("SAME");
  });

  it("UNCERTAIN for a moderate move with no strong conflict", () => {
    const p = bldPlace({ location: { lat: 12.9743, lng: 77.5946 } }); // ~300m
    expect(buildingDecision(p, pin, factual, { placeIdSupplied: true }).outcome).toBe("UNCERTAIN");
  });

  it("CONFLICT for a large move with PIN + locality both inconsistent", () => {
    const p = bldPlace({
      location: { lat: 13.05, lng: 77.65 }, // far
      addressComponents: [{ types: ["postal_code"], longText: "560001" }, { types: ["sublocality_level_1"], longText: "Indiranagar" }],
    });
    expect(buildingDecision(p, pin, factual, { placeIdSupplied: true }).outcome).toBe("CONFLICT");
  });

  it("NOT_APPLICABLE when no provider place", () => {
    expect(buildingDecision(null, pin, factual, { placeIdSupplied: false }).outcome).toBe("NOT_APPLICABLE");
  });

  it("NOT_APPLICABLE for a geographic-only selected place (locality)", () => {
    const p = bldPlace({ displayName: "Whitefield", types: ["locality", "political"] });
    expect(buildingDecision(p, pin, factual, { placeIdSupplied: true }).outcome).toBe("NOT_APPLICABLE");
  });

  it("UNCERTAIN reduced-evidence when Place Details failed but a place_id was supplied", () => {
    expect(buildingDecision(null, pin, factual, { placeIdSupplied: true, placeFetchFailed: true }).outcome).toBe("UNCERTAIN");
  });
});

describe("chooseRootSettlement", () => {
  it("prefers a locality-typed result over administrative_area_level_3, stable by place_id", () => {
    const chosen = chooseRootSettlement([
      { place_id: "Z_aal3", display_name: "SubDistrict", types: ["administrative_area_level_3", "political"] },
      { place_id: "A_loc", display_name: "Bengaluru", types: ["locality", "political"] },
    ]);
    expect(chosen?.place_id).toBe("A_loc");
  });
  it("stable tie-break by place_id among equal-strength localities", () => {
    const chosen = chooseRootSettlement([
      { place_id: "B", display_name: "B", types: ["locality"] },
      { place_id: "A", display_name: "A", types: ["locality"] },
    ]);
    expect(chosen?.place_id).toBe("A");
  });
  it("null when there is no canonical-city result", () => {
    expect(chooseRootSettlement([{ place_id: "X", display_name: "PT", types: ["postal_town"] }])).toBeNull();
  });
});

describe("classifyCandidates — provider-less locality path", () => {
  it("adds a recommended, settlement-scoped locality from sublocality when descriptor areas are empty", () => {
    const cands = classifyCandidates(rg({
      cityResults: [{ place_id: "S1", display_name: "Bengaluru", types: ["locality"] }],
      areas: [],
      components: [comp(["sublocality_level_1"], "Whitefield")],
    }));
    const loc = cands.find((c) => c.kind === "locality");
    expect(loc).toBeDefined();
    expect(loc!.provider).toBeNull();
    expect(loc!.recommendation).toBe("recommended");
    expect(loc!.candidate_key).toBe("locality:name:S1:whitefield"); // scoped by the root settlement's Google id
  });
  it("marks the provider-less locality suggestion-only when there is no settlement root", () => {
    const cands = classifyCandidates(rg({
      cityResults: [], areas: [], components: [comp(["sublocality_level_1"], "Sector 1")],
    }));
    const loc = cands.find((c) => c.kind === "locality");
    expect(loc?.recommendation).toBe("suggestion");
  });
  it("does not duplicate when a WITHIN descriptor already supplies the same locality", () => {
    const cands = classifyCandidates(rg({
      cityResults: [{ place_id: "S1", display_name: "Bengaluru", types: ["locality"] }],
      areas: [{ place_id: "L1", display_name: "Whitefield", containment: "WITHIN" }],
      components: [comp(["sublocality_level_1"], "Whitefield")],
    }));
    const locs = cands.filter((c) => c.kind === "locality");
    expect(locs.length).toBe(1);
    expect(locs[0].provider_place_id).toBe("L1"); // provider-backed kept
  });
  it("upgrades a suggestion-only OUTSKIRTS descriptor to recommended when factual corroborates", () => {
    const cands = classifyCandidates(rg({
      cityResults: [{ place_id: "S1", display_name: "Bengaluru", types: ["locality"] }],
      areas: [{ place_id: "L1", display_name: "Whitefield", containment: "OUTSKIRTS" }],
      components: [comp(["sublocality_level_1"], "Whitefield")],
    }));
    const locs = cands.filter((c) => c.kind === "locality");
    expect(locs.length).toBe(1);
    expect(locs[0].provider_place_id).toBe("L1");
    expect(locs[0].recommendation).toBe("recommended"); // upgraded
  });
});

describe("buildFinalAssociations", () => {
  it("sets is_primary only on the root, source=system", () => {
    const out = buildFinalAssociations(
      [{ geo_place_id: "root", evidence_type: "provider_address" }, { geo_place_id: "loc", evidence_type: "provider_address" }],
      "root",
    );
    expect(out.find((a) => a.geo_place_id === "root")!.is_primary).toBe(true);
    expect(out.find((a) => a.geo_place_id === "loc")!.is_primary).toBe(false);
    expect(out.every((a) => a.source === "system")).toBe(true);
  });
  it("no primary when root is null", () => {
    const out = buildFinalAssociations([{ geo_place_id: "loc", evidence_type: "provider_route" }], null);
    expect(out.every((a) => !a.is_primary)).toBe(true);
  });

  it("owner-added locality keeps source='owner' while system rows stay 'system'", () => {
    // system settlement root + owner-added locality (Prompt 3 P2 provenance)
    const out = buildFinalAssociations(
      [
        { geo_place_id: "set", evidence_type: "provider_address" },
        { geo_place_id: "own", evidence_type: "owner_added", source: "owner" },
      ],
      "set",
    );
    expect(out.find((a) => a.geo_place_id === "set")!.source).toBe("system");
    expect(out.find((a) => a.geo_place_id === "set")!.is_primary).toBe(true);
    const own = out.find((a) => a.geo_place_id === "own")!;
    expect(own.source).toBe("owner");
    expect(own.evidence_type).toBe("owner_added");
    expect(own.is_primary).toBe(false);
  });

  it("missing-root rural recovery: an owner-added settlement can be the primary root (source owner)", () => {
    const out = buildFinalAssociations([{ geo_place_id: "vil", evidence_type: "owner_added", source: "owner" }], "vil");
    expect(out).toEqual([{ geo_place_id: "vil", is_primary: true, source: "owner", evidence_type: "owner_added" }]);
  });
});

describe("classifyExtraPlace", () => {
  const inCountry = { types: ["country"], longText: "India", shortText: "IN" };
  const extra = (partial: Partial<PlaceDetails>): PlaceDetails => ({
    id: "EX", displayName: null, formattedAddress: null, location: { lat: 12.98, lng: 77.60 },
    types: [], viewport: null, plusCode: null, addressComponents: [inCountry], ...partial,
  } as PlaceDetails);
  const pin: LatLng = { lat: 12.9716, lng: 77.5946 };

  it("accepts a nearby locality (owner-added Discovery Geography)", () => {
    expect(classifyExtraPlace(extra({ displayName: "Whitefield", types: ["sublocality_level_1", "political"] }), pin))
      .toEqual({ kind: "locality" });
  });
  it("accepts a nearby settlement (rural root candidate)", () => {
    const ruralPin: LatLng = { lat: 15.35, lng: 75.14 };
    const village = extra({ displayName: "Annigeri", types: ["locality", "political"], location: { lat: 15.34, lng: 75.15 } });
    expect(classifyExtraPlace(village, ruralPin)).toEqual({ kind: "settlement" });
  });
  it("accepts a nearby road", () => {
    expect(classifyExtraPlace(extra({ displayName: "Sarjapur Road", types: ["route"] }), pin)).toEqual({ kind: "road" });
  });
  it("rejects a building-eligible place (extras are geography, never building evidence)", () => {
    const bld = extra({ displayName: "Prestige Tower", types: ["premise", "point_of_interest"] });
    expect(classifyExtraPlace(bld, pin)).toEqual({ kind: null, reason: "building_not_geography" });
  });
  it("rejects an out-of-India place", () => {
    const foreign = extra({ types: ["sublocality_level_1"], addressComponents: [{ types: ["country"], longText: "USA", shortText: "US" }] });
    expect(classifyExtraPlace(foreign, pin)).toEqual({ kind: null, reason: "outside_india" });
  });
  it("rejects an unsupported geographic type (postal_code / admin areas)", () => {
    expect(classifyExtraPlace(extra({ types: ["postal_code"] }), pin)).toEqual({ kind: null, reason: "unsupported_type" });
  });
  it("rejects a locality that is implausibly far from the pin", () => {
    const far = extra({ types: ["sublocality_level_1"], location: { lat: 13.9, lng: 78.6 } }); // ~150km
    expect(classifyExtraPlace(far, pin)).toEqual({ kind: null, reason: "implausible_distance" });
  });
  it("rejects a settlement ~30 km away (tightened to the canonical 25 km gate)", () => {
    const ruralPin: LatLng = { lat: 15.35, lng: 75.14 };
    const farVillage = extra({ types: ["locality", "political"], location: { lat: 15.62, lng: 75.14 } }); // ~30km
    expect(classifyExtraPlace(farVillage, ruralPin)).toEqual({ kind: null, reason: "implausible_distance" });
  });
  it("rejects when Place Details has no usable location", () => {
    expect(classifyExtraPlace(extra({ types: ["sublocality_level_1"], location: null }), pin)).toEqual({ kind: null, reason: "no_location" });
  });
});

describe("computeBuildingIntent", () => {
  const gplace = bldPlace({ id: "PID_G", displayName: "Prestige" });
  it("adopts a credible Google building on a fresh property (keep)", () => {
    const bi = computeBuildingIntent({ building_name: null, building_name_source: null, place_id: null }, gplace, "keep", null, "owner");
    expect(bi).toEqual({ building_name: "Prestige", building_name_source: "google", place_id: "PID_G" });
  });
  it("owner set → owner provenance, retains existing place_id evidence", () => {
    const bi = computeBuildingIntent({ building_name: "Prestige", building_name_source: "google", place_id: "PID_G" }, gplace, "set", "My Name", "owner");
    expect(bi).toEqual({ building_name: "My Name", building_name_source: "owner", place_id: "PID_G" });
  });
  it("admin set → admin provenance", () => {
    const bi = computeBuildingIntent({ building_name: "X", building_name_source: "owner", place_id: null }, null, "set", "AdminName", "admin");
    expect(bi.building_name_source).toBe("admin");
  });
  it("keep preserves existing owner provenance (no silent google adoption)", () => {
    const bi = computeBuildingIntent({ building_name: "Owner Edited", building_name_source: "owner", place_id: "PID_G" }, gplace, "keep", null, "owner");
    expect(bi).toEqual({ building_name: "Owner Edited", building_name_source: "owner", place_id: "PID_G" });
  });
  it("clear → nulls name/source/place", () => {
    expect(computeBuildingIntent({ building_name: "X", building_name_source: "owner", place_id: "P" }, null, "clear", null, "owner"))
      .toEqual({ building_name: null, building_name_source: null, place_id: null });
  });
  it("owner cannot change/clear an admin-sourced building (no-op for every owner choice)", () => {
    const admin = { building_name: "Admin Tower", building_name_source: "admin", place_id: "PA" };
    expect(computeBuildingIntent(admin, gplace, "set", "Owner New", "owner")).toEqual(admin);
    expect(computeBuildingIntent(admin, gplace, "clear", null, "owner")).toEqual(admin);
    expect(computeBuildingIntent(admin, gplace, "keep", null, "owner")).toEqual(admin);
  });
  it("owner set on a FRESH credible-Google building retains the verified place.id (stays google_place)", () => {
    const bi = computeBuildingIntent({ building_name: null, building_name_source: null, place_id: null }, gplace, "set", "My Name", "owner");
    expect(bi).toEqual({ building_name: "My Name", building_name_source: "owner", place_id: "PID_G" });
  });
  it("owner set when the place is NOT a credible building keeps place_id null", () => {
    const geo = bldPlace({ id: "GEO", displayName: "Whitefield", types: ["locality", "political"] });
    const bi = computeBuildingIntent({ building_name: null, building_name_source: null, place_id: null }, geo, "set", "My Name", "owner");
    expect(bi).toEqual({ building_name: "My Name", building_name_source: "owner", place_id: null });
  });
  it("admin set with a fresh credible building REPLACES the old provider place_id", () => {
    const fresh = bldPlace({ id: "NEW_PID", displayName: "Correct Tower", types: ["premise", "point_of_interest"] });
    const bi = computeBuildingIntent({ building_name: "Wrong", building_name_source: "google", place_id: "OLD_PID" }, fresh, "set", "Correct Tower", "admin");
    expect(bi).toEqual({ building_name: "Correct Tower", building_name_source: "admin", place_id: "NEW_PID" });
  });
  it("admin text-only set (no fresh credible building) preserves existing provider evidence", () => {
    const bi = computeBuildingIntent({ building_name: "X", building_name_source: "google", place_id: "OLD_PID" }, null, "set", "Renamed", "admin");
    expect(bi).toEqual({ building_name: "Renamed", building_name_source: "admin", place_id: "OLD_PID" });
  });
});

describe("resolveAdminDiscovery", () => {
  const cur = [
    { geo_place_id: "SET", kind: "settlement", source: "system", evidence_type: "provider_address", is_primary: true },
    { geo_place_id: "LOC", kind: "locality", source: "owner", evidence_type: "owner_added", is_primary: false },
  ];
  it("keeps rows with their provenance and stamps admin additions admin/admin_override", () => {
    const r = resolveAdminDiscovery({ current: cur, keepIds: ["SET", "LOC"], adds: [{ geo_place_id: "ROAD", kind: "road" }] });
    expect("payload" in r).toBe(true);
    if (!("payload" in r)) return;
    const byId = Object.fromEntries(r.payload.map((p) => [p.geo_place_id, p]));
    expect(byId["LOC"]).toMatchObject({ source: "owner", evidence_type: "owner_added", is_primary: false });
    expect(byId["ROAD"]).toMatchObject({ source: "admin", evidence_type: "admin_override" });
    expect(byId["SET"].is_primary).toBe(true); // preserved current primary
    expect(r.payload.filter((p) => p.is_primary).length).toBe(1);
  });
  it("rejects a root that is a locality (not settlement/search_region)", () => {
    const r = resolveAdminDiscovery({ current: cur, keepIds: ["SET", "LOC"], adds: [], rootGeoPlaceId: "LOC" });
    expect(r).toEqual({ error: "invalid_root" });
  });
  it("rejects a root not present in the resulting set", () => {
    const r = resolveAdminDiscovery({ current: cur, keepIds: ["SET"], adds: [], rootGeoPlaceId: "GHOST" });
    expect(r).toEqual({ error: "invalid_root" });
  });
  it("rejects a locality with no settlement/search_region context in the resulting set", () => {
    const r = resolveAdminDiscovery({ current: cur, keepIds: ["LOC"], adds: [], rootGeoPlaceId: "LOC" });
    // LOC alone → no root-kind member → locality_no_context (checked before root)
    expect(r).toEqual({ error: "locality_no_context" });
  });
  it("preserves the current primary when it survives and no explicit root is given", () => {
    const r = resolveAdminDiscovery({ current: cur, keepIds: ["SET", "LOC"], adds: [] });
    if (!("payload" in r)) throw new Error("expected payload");
    expect(r.payload.find((p) => p.is_primary)?.geo_place_id).toBe("SET");
  });
  it("root_required when the current primary was removed and no explicit root supplied", () => {
    const r = resolveAdminDiscovery({ current: cur, keepIds: ["LOC"], adds: [{ geo_place_id: "SET2", kind: "settlement" }] });
    // has settlement context (SET2) so not locality_no_context, but no explicit root + old primary removed
    expect(r).toEqual({ error: "root_required" });
  });
  it("rejects keeping a UUID not currently associated", () => {
    const r = resolveAdminDiscovery({ current: cur, keepIds: ["SET", "NOPE"], adds: [] });
    expect(r).toEqual({ error: "not_kept" });
  });
  it("dedups an addition that equals a kept canonical row (kept wins)", () => {
    const r = resolveAdminDiscovery({ current: cur, keepIds: ["SET", "LOC"], adds: [{ geo_place_id: "LOC", kind: "locality" }] });
    if (!("payload" in r)) throw new Error("expected payload");
    expect(r.payload.filter((p) => p.geo_place_id === "LOC").length).toBe(1);
    expect(r.payload.find((p) => p.geo_place_id === "LOC")?.source).toBe("owner"); // kept provenance, not admin
  });
});
