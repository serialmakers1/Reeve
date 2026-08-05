import { describe, it, expect } from "vitest";
import { normalizePropertyTypes, propertyTypesToCsv } from "../domain/propertyTypes";
import { parseSearchUrl } from "../state/parseSearchUrl";
import { serializeSearchState } from "../state/serializeSearchState";
import { getDefaultSearchState } from "../domain/searchDefaults";

describe("normalizePropertyTypes", () => {
  it("drops invalid values", () => {
    expect(normalizePropertyTypes(["apartment", "spaceship"])).toEqual(["apartment"]);
  });

  it("deduplicates", () => {
    expect(normalizePropertyTypes(["villa", "villa"])).toEqual(["villa"]);
  });

  it("orders by canonical option order regardless of input order", () => {
    expect(normalizePropertyTypes(["plot", "apartment"])).toEqual(["apartment", "plot"]);
  });

  it("empty input → empty", () => {
    expect(normalizePropertyTypes([])).toEqual([]);
  });
});

describe("propertyTypesToCsv", () => {
  it("empty → null (no filter)", () => {
    expect(propertyTypesToCsv([])).toBeNull();
  });
  it("single → value", () => {
    expect(propertyTypesToCsv(["apartment"])).toBe("apartment");
  });
  it("multiple → deterministic csv", () => {
    expect(propertyTypesToCsv(["duplex_apartment", "apartment"])).toBe("apartment,duplex_apartment");
  });
});

describe("URL round-trip", () => {
  it("legacy single ?pt=villa parses to array", () => {
    const state = parseSearchUrl(new URLSearchParams("type=rent&pt=villa"));
    expect(state.context.propertyTypes).toEqual(["villa"]);
  });

  it("multi ?pt=apartment,duplex_apartment parses to normalized array", () => {
    const state = parseSearchUrl(new URLSearchParams("type=rent&pt=duplex_apartment,apartment"));
    expect(state.context.propertyTypes).toEqual(["apartment", "duplex_apartment"]);
  });

  it("invalid + duplicate values are removed", () => {
    const state = parseSearchUrl(new URLSearchParams("type=rent&pt=apartment,apartment,nope"));
    expect(state.context.propertyTypes).toEqual(["apartment"]);
  });

  it("serialize is deterministic and omits empty", () => {
    const base = getDefaultSearchState("rent");
    const empty = serializeSearchState(base);
    expect(empty.get("pt")).toBeNull();

    const multi = serializeSearchState({
      ...base,
      context: { ...base.context, propertyTypes: ["duplex_apartment", "apartment"] },
    });
    expect(multi.get("pt")).toBe("apartment,duplex_apartment");
  });

  it("round-trips back to the same normalized array", () => {
    const state = parseSearchUrl(new URLSearchParams("type=buy&pt=plot,apartment"));
    const params = serializeSearchState(state);
    const again = parseSearchUrl(params);
    expect(again.context.propertyTypes).toEqual(["apartment", "plot"]);
  });
});
