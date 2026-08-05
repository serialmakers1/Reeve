import { describe, it, expect } from "vitest";
import type { LocationToken } from "../domain/searchTypes";
import {
  confirmSelection,
  validateHistory,
  latestSelection,
  recentAreasForCity,
  cityMemory,
  mergeHistories,
  emptyHistory,
  MAX_HISTORY_CITIES,
  MAX_RECENT_AREAS_PER_CITY,
  type SearchLocationHistoryV1,
} from "../state/searchLocationHistory";

function area(id: string, label = id): LocationToken {
  return { id, label, type: "area", cityId: null, placeId: id, viewport: null };
}

describe("confirmSelection", () => {
  it("latest confirmed city becomes the default (first)", () => {
    let h = emptyHistory();
    h = confirmSelection(h, "bengaluru", [area("wf", "Whitefield")], 1);
    h = confirmSelection(h, "mumbai", [area("powai", "Powai")], 2);
    expect(latestSelection(h)).toEqual({ city: "mumbai", areas: [area("powai", "Powai")] });
  });

  it("restores only that city's last selected areas", () => {
    let h = emptyHistory();
    h = confirmSelection(h, "bengaluru", [area("wf"), area("mrt")], 1);
    h = confirmSelection(h, "mumbai", [area("powai")], 2);
    h = confirmSelection(h, "bengaluru", [area("wf"), area("mrt")], 3);
    const latest = latestSelection(h);
    expect(latest?.city).toBe("bengaluru");
    expect(latest?.areas.map((a) => a.id)).toEqual(["wf", "mrt"]);
  });

  it("empty areas is a valid whole-city confirmation", () => {
    const h = confirmSelection(emptyHistory(), "pune", [], 1);
    expect(latestSelection(h)).toEqual({ city: "pune", areas: [] });
  });

  it("recent areas are city-scoped (never mixed)", () => {
    let h = emptyHistory();
    h = confirmSelection(h, "bengaluru", [area("wf")], 1);
    h = confirmSelection(h, "mumbai", [area("powai")], 2);
    expect(recentAreasForCity(h, "bengaluru").map((a) => a.id)).toEqual(["wf"]);
    expect(recentAreasForCity(h, "mumbai").map((a) => a.id)).toEqual(["powai"]);
  });

  it("caps city history at MAX_HISTORY_CITIES", () => {
    let h = emptyHistory();
    for (let i = 0; i < MAX_HISTORY_CITIES + 3; i++) {
      h = confirmSelection(h, `city${i}`, [], i + 1);
    }
    expect(h.cities.length).toBe(MAX_HISTORY_CITIES);
  });

  it("caps recent areas per city and dedups", () => {
    let h = emptyHistory();
    for (let i = 0; i < MAX_RECENT_AREAS_PER_CITY + 4; i++) {
      h = confirmSelection(h, "bengaluru", [area(`a${i}`)], i + 1);
    }
    // duplicate id must not grow the pool
    h = confirmSelection(h, "bengaluru", [area("a0")], 999);
    expect(recentAreasForCity(h, "bengaluru").length).toBeLessThanOrEqual(MAX_RECENT_AREAS_PER_CITY);
  });
});

describe("validateHistory", () => {
  it("unsupported version → empty", () => {
    expect(validateHistory({ version: 2, cities: [] })).toEqual(emptyHistory());
  });
  it("malformed → empty", () => {
    expect(validateHistory("garbage")).toEqual(emptyHistory());
    expect(validateHistory(null)).toEqual(emptyHistory());
    expect(validateHistory({ cities: "x" })).toEqual(emptyHistory());
  });
  it("discards an invalid area individually without dropping a valid city", () => {
    const raw: unknown = {
      version: 1,
      cities: [
        {
          city: "bengaluru",
          confirmedAt: 1,
          lastSelectedAreas: [area("wf"), { id: "", label: "bad", type: "area" }],
          recentAreas: [],
        },
      ],
    };
    const h = validateHistory(raw);
    expect(h.cities.length).toBe(1);
    expect(h.cities[0].lastSelectedAreas.map((a) => a.id)).toEqual(["wf"]);
  });
  it("rejects injection-y area labels", () => {
    const raw: unknown = {
      version: 1,
      cities: [
        {
          city: "bengaluru",
          confirmedAt: 1,
          lastSelectedAreas: [{ id: "x", label: "<script>", type: "area" }],
          recentAreas: [],
        },
      ],
    };
    expect(validateHistory(raw).cities[0].lastSelectedAreas).toEqual([]);
  });
});

describe("cityMemory", () => {
  it("returns empty arrays for an unknown city", () => {
    expect(cityMemory(emptyHistory(), "nowhere")).toEqual({
      lastSelectedAreas: [],
      recentAreas: [],
    });
  });
});

describe("mergeHistories", () => {
  it("newer confirmedAt wins per city; later argument wins ties", () => {
    const server: SearchLocationHistoryV1 = {
      version: 1,
      cities: [{ city: "bengaluru", lastSelectedAreas: [area("old")], recentAreas: [area("old")], confirmedAt: 1 }],
    };
    const session: SearchLocationHistoryV1 = {
      version: 1,
      cities: [{ city: "bengaluru", lastSelectedAreas: [area("new")], recentAreas: [area("new")], confirmedAt: 5 }],
    };
    const merged = mergeHistories(server, session);
    expect(merged.cities[0].lastSelectedAreas.map((a) => a.id)).toEqual(["new"]);
  });
});
