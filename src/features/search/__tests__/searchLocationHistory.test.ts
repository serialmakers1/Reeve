import { describe, it, expect } from "vitest";
import type { LocationToken } from "../domain/searchTypes";
import {
  confirmSelection,
  validateHistory,
  latestSelection,
  recentAreasForCity,
  cityMemory,
  mergeHistories,
  removeCity,
  clearHistory,
  emptyHistory,
  MAX_HISTORY_CITIES,
  MAX_RECENT_AREAS_PER_CITY,
  type SearchLocationHistory,
} from "../state/searchLocationHistory";

function area(id: string, label = id): LocationToken {
  return { id, label, type: "area", cityId: null, placeId: id, viewport: null };
}

describe("confirmSelection (v2 — full setup)", () => {
  it("latest confirmed city becomes the default (first) with its mode + property types", () => {
    let h = emptyHistory();
    h = confirmSelection(h, "bengaluru", [area("wf")], "buy", ["apartment"], 1);
    h = confirmSelection(h, "mumbai", [area("powai")], "rent", ["villa"], 2);
    expect(latestSelection(h)).toEqual({
      city: "mumbai",
      areas: [area("powai")],
      mode: "rent",
      propertyTypes: ["villa"],
    });
  });

  it("restores only that city's own last areas/mode/types", () => {
    let h = emptyHistory();
    h = confirmSelection(h, "bengaluru", [area("wf"), area("mrt")], "buy", ["apartment", "duplex_apartment"], 1);
    h = confirmSelection(h, "mumbai", [area("powai")], "rent", [], 2);
    h = confirmSelection(h, "bengaluru", [area("wf"), area("mrt")], "buy", ["apartment", "duplex_apartment"], 3);
    const latest = latestSelection(h);
    expect(latest?.city).toBe("bengaluru");
    expect(latest?.areas.map((a) => a.id)).toEqual(["wf", "mrt"]);
    expect(latest?.mode).toBe("buy");
    expect(latest?.propertyTypes).toEqual(["apartment", "duplex_apartment"]);
  });

  it("empty areas + empty types is valid (whole city, all types)", () => {
    const h = confirmSelection(emptyHistory(), "pune", [], "rent", [], 1);
    expect(latestSelection(h)).toEqual({ city: "pune", areas: [], mode: "rent", propertyTypes: [] });
  });

  it("normalizes/dedupes/orders property types", () => {
    const h = confirmSelection(emptyHistory(), "pune", [], "buy", ["duplex_apartment", "apartment", "nope"], 1);
    expect(cityMemory(h, "pune").propertyTypes).toEqual(["apartment", "duplex_apartment"]);
  });

  it("recent areas are city-scoped", () => {
    let h = emptyHistory();
    h = confirmSelection(h, "bengaluru", [area("wf")], "rent", [], 1);
    h = confirmSelection(h, "mumbai", [area("powai")], "rent", [], 2);
    expect(recentAreasForCity(h, "bengaluru").map((a) => a.id)).toEqual(["wf"]);
    expect(recentAreasForCity(h, "mumbai").map((a) => a.id)).toEqual(["powai"]);
  });

  it("caps city history at MAX_HISTORY_CITIES (6th drops the oldest)", () => {
    let h = emptyHistory();
    for (let i = 0; i < MAX_HISTORY_CITIES + 1; i++) {
      h = confirmSelection(h, `city${i}`, [], "rent", [], i + 1);
    }
    expect(h.cities.length).toBe(MAX_HISTORY_CITIES);
    expect(h.cities.some((c) => c.city === "city0")).toBe(false); // oldest dropped
  });

  it("re-confirming an existing city moves it to front without duplication", () => {
    let h = emptyHistory();
    h = confirmSelection(h, "a", [], "rent", [], 1);
    h = confirmSelection(h, "b", [], "rent", [], 2);
    h = confirmSelection(h, "a", [], "buy", [], 3);
    expect(h.cities.map((c) => c.city)).toEqual(["a", "b"]);
    expect(h.cities[0].mode).toBe("buy");
  });

  it("caps recent areas per city and dedups", () => {
    let h = emptyHistory();
    for (let i = 0; i < MAX_RECENT_AREAS_PER_CITY + 4; i++) {
      h = confirmSelection(h, "bengaluru", [area(`a${i}`)], "rent", [], i + 1);
    }
    h = confirmSelection(h, "bengaluru", [area("a0")], "rent", [], 999);
    expect(recentAreasForCity(h, "bengaluru").length).toBeLessThanOrEqual(MAX_RECENT_AREAS_PER_CITY);
  });
});

describe("validateHistory — version compat", () => {
  it("accepts a v2 history", () => {
    const v2 = confirmSelection(emptyHistory(), "bengaluru", [area("wf")], "buy", ["apartment"], 1);
    const round = validateHistory(JSON.parse(JSON.stringify(v2)));
    expect(round.version).toBe(2);
    expect(latestSelection(round)).toEqual({
      city: "bengaluru",
      areas: [area("wf")],
      mode: "buy",
      propertyTypes: ["apartment"],
    });
  });

  it("normalizes a v1 history to v2 (mode=fallback, propertyTypes=[])", () => {
    const v1raw = {
      version: 1,
      cities: [
        { city: "bengaluru", lastSelectedAreas: [area("wf")], recentAreas: [area("wf")], confirmedAt: 5 },
      ],
    };
    const h = validateHistory(v1raw, "buy"); // fallback mode = explicit URL mode
    expect(h.version).toBe(2);
    expect(latestSelection(h)).toEqual({
      city: "bengaluru",
      areas: [area("wf")],
      mode: "buy",
      propertyTypes: [],
    });
  });

  it("v1 fallback defaults to rent when no fallback given", () => {
    const v1raw = { version: 1, cities: [{ city: "pune", lastSelectedAreas: [], recentAreas: [], confirmedAt: 1 }] };
    expect(validateHistory(v1raw).cities[0].mode).toBe("rent");
  });

  it("unsupported version → empty", () => {
    expect(validateHistory({ version: 9, cities: [] })).toEqual(emptyHistory());
  });
  it("malformed → empty", () => {
    expect(validateHistory("garbage")).toEqual(emptyHistory());
    expect(validateHistory(null)).toEqual(emptyHistory());
  });
  it("discards an invalid area individually without dropping a valid city", () => {
    const raw = {
      version: 2,
      cities: [
        {
          city: "bengaluru",
          confirmedAt: 1,
          mode: "rent",
          propertyTypes: [],
          lastSelectedAreas: [area("wf"), { id: "", label: "bad", type: "area" }],
          recentAreas: [],
        },
      ],
    };
    const h = validateHistory(raw);
    expect(h.cities[0].lastSelectedAreas.map((a) => a.id)).toEqual(["wf"]);
  });
});

describe("removeCity / clearHistory", () => {
  it("removeCity drops the city (and its setup); newest-removed → next becomes default", () => {
    let h = emptyHistory();
    h = confirmSelection(h, "bengaluru", [area("wf")], "buy", ["apartment"], 1);
    h = confirmSelection(h, "mumbai", [area("powai")], "rent", [], 2); // newest
    h = removeCity(h, "mumbai");
    expect(h.cities.map((c) => c.city)).toEqual(["bengaluru"]);
    expect(latestSelection(h)?.city).toBe("bengaluru");
  });
  it("removeCity is a no-op for an unknown city", () => {
    const h = confirmSelection(emptyHistory(), "a", [], "rent", [], 1);
    expect(removeCity(h, "zzz").cities.length).toBe(1);
  });
  it("clearHistory empties everything", () => {
    expect(clearHistory()).toEqual(emptyHistory());
  });
});

describe("mergeHistories", () => {
  it("newer confirmedAt wins per city incl mode/types; later arg wins ties", () => {
    const server: SearchLocationHistory = {
      version: 2,
      cities: [{ city: "bengaluru", lastSelectedAreas: [area("old")], recentAreas: [area("old")], mode: "rent", propertyTypes: ["villa"], confirmedAt: 1 }],
    };
    const session: SearchLocationHistory = {
      version: 2,
      cities: [{ city: "bengaluru", lastSelectedAreas: [area("new")], recentAreas: [area("new")], mode: "buy", propertyTypes: ["apartment"], confirmedAt: 5 }],
    };
    const merged = mergeHistories(server, session);
    expect(merged.cities[0].lastSelectedAreas.map((a) => a.id)).toEqual(["new"]);
    expect(merged.cities[0].mode).toBe("buy");
    expect(merged.cities[0].propertyTypes).toEqual(["apartment"]);
  });
});
