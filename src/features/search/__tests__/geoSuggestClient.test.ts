import { describe, it, expect, vi } from "vitest";
import {
  selectCanonicalCityCandidate,
  dedupeSameNameRegion,
  rowToCityToken,
  rowToLocationToken,
  availableGeoIds,
  type GeoSuggestRow,
} from "../data/geoSuggestClient";

function row(overrides: Partial<GeoSuggestRow> & Pick<GeoSuggestRow, "id" | "display_name" | "kind">): GeoSuggestRow {
  return {
    settlement_subtype: null,
    parent_geo_place_id: null,
    parent_display_name: null,
    search_region_id: null,
    search_region_display_name: null,
    ...overrides,
  };
}

const blrRegion = row({ id: "region-blr", display_name: "Bengaluru", kind: "search_region" });
const blrSettlement = row({ id: "settlement-blr", display_name: "Bengaluru", kind: "settlement" });
const blrRural = row({ id: "settlement-blr-rural", display_name: "Bangalore Rural", kind: "settlement" });
const pune = row({ id: "settlement-pune", display_name: "Pune", kind: "settlement" });
const indoreA = row({ id: "indore-a", display_name: "Indore", kind: "settlement" });
const indoreB = row({ id: "indore-b", display_name: "Indore", kind: "settlement" });

describe("selectCanonicalCityCandidate", () => {
  it("prefers the search_region over a same-name settlement on an exact match (Bengaluru)", () => {
    const token = selectCanonicalCityCandidate("Bengaluru", [blrSettlement, blrRegion]);
    expect(token?.geoPlaceId).toBe("region-blr");
    expect(token?.kind).toBe("search_region");
  });

  it("resolves an alias-only region over a lower-ranked prefix settlement (Bangalore)", () => {
    // "Bangalore" matches the region by alias (no display_name match) and "Bangalore Rural" by prefix.
    const token = selectCanonicalCityCandidate("Bangalore", [blrRegion, blrRural]);
    expect(token?.geoPlaceId).toBe("region-blr");
    expect(token?.kind).toBe("search_region");
  });

  it("returns an unrelated single settlement unchanged", () => {
    const token = selectCanonicalCityCandidate("Pune", [pune]);
    expect(token?.geoPlaceId).toBe("settlement-pune");
    expect(token?.kind).toBe("settlement");
  });

  it("stays ambiguous (null) for two same-name settlements with no region", () => {
    expect(selectCanonicalCityCandidate("Indore", [indoreA, indoreB])).toBeNull();
  });

  it("accepts a single candidate via the alias path", () => {
    const token = selectCanonicalCityCandidate("Bengaluru Urban", [
      row({ id: "blr-urban", display_name: "Bengaluru Urban", kind: "settlement" }),
    ]);
    expect(token?.geoPlaceId).toBe("blr-urban");
  });

  it("returns null for no rows", () => {
    expect(selectCanonicalCityCandidate("Nowhere", [])).toBeNull();
  });
});

describe("dedupeSameNameRegion", () => {
  it("drops a settlement that collides by name with a present region", () => {
    const out = dedupeSameNameRegion([blrRegion, blrSettlement, blrRural]);
    expect(out.map((r) => r.id)).toEqual(["region-blr", "settlement-blr-rural"]);
  });

  it("keeps everything when no region is present", () => {
    const out = dedupeSameNameRegion([blrSettlement, blrRural]);
    expect(out.map((r) => r.id)).toEqual(["settlement-blr", "settlement-blr-rural"]);
  });

  it("never removes unrelated settlements", () => {
    const out = dedupeSameNameRegion([blrRegion, pune]);
    expect(out.map((r) => r.id)).toEqual(["region-blr", "settlement-pune"]);
  });
});

describe("rowToCityToken / rowToLocationToken", () => {
  it("maps a search_region row to a CityToken (new region tokens hydrate)", () => {
    const token = rowToCityToken(blrRegion);
    expect(token?.kind).toBe("search_region");
    expect(token?.geoPlaceId).toBe("region-blr");
  });

  it("maps a settlement row to a CityToken (old settlement tokens hydrate)", () => {
    const token = rowToCityToken(blrSettlement);
    expect(token?.kind).toBe("settlement");
  });

  it("returns null when a detail kind is passed to rowToCityToken", () => {
    expect(rowToCityToken(row({ id: "loc", display_name: "Thirumalashettyhally", kind: "locality" }))).toBeNull();
  });

  it("maps a locality row to a LocationToken stamped with its root", () => {
    const loc = row({ id: "loc", display_name: "Thirumalashettyhally", kind: "locality" });
    const token = rowToLocationToken(loc, "region-blr");
    expect(token?.geoPlaceId).toBe("loc");
    expect(token?.scopeRootId).toBe("region-blr");
  });
});

describe("availableGeoIds (Phase 3 inventory availability)", () => {
  const client = (rpc: ReturnType<typeof vi.fn>) => ({ rpc }) as never;

  it("maps buy→sale and rent→rent, passes optional root, returns the id Set", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "a" }, { id: "b" }], error: null });
    const out = await availableGeoIds(["a", "b"], "buy", client(rpc), "root-1");
    expect(out).toEqual(new Set(["a", "b"]));
    expect(rpc).toHaveBeenCalledWith("reeve_geo_ids_with_inventory", {
      p_geo_place_ids: ["a", "b"],
      p_listing_type: "sale",
      p_root_geo_place_id: "root-1",
    });

    const rpc2 = vi.fn().mockResolvedValue({ data: [], error: null });
    await availableGeoIds(["a"], "rent", client(rpc2));
    expect(rpc2).toHaveBeenCalledWith("reeve_geo_ids_with_inventory", {
      p_geo_place_ids: ["a"],
      p_listing_type: "rent",
      p_root_geo_place_id: null,
    });
  });

  it("dedupes ids and short-circuits an empty input without calling the RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ id: "a" }], error: null });
    await availableGeoIds(["a", "a", "", "a"], "rent", client(rpc));
    expect(rpc).toHaveBeenCalledWith(
      "reeve_geo_ids_with_inventory",
      expect.objectContaining({ p_geo_place_ids: ["a"] }),
    );

    const rpc2 = vi.fn();
    expect(await availableGeoIds([], "rent", client(rpc2))).toEqual(new Set());
    expect(rpc2).not.toHaveBeenCalled();
  });

  it("throws on RPC error (fail-open contract lives in the callers)", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(availableGeoIds(["a"], "rent", client(rpc))).rejects.toBeTruthy();
  });
});
