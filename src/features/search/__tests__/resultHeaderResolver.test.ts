import { describe, it, expect } from "vitest";
import { resultHeaderLabel } from "../state/resultHeaderResolver";
import { getDefaultSearchState } from "../domain/searchDefaults";
import type { SearchState, LocationToken } from "../domain/searchTypes";

function stateWith(city: string | null, locations: LocationToken[] = []): SearchState {
  return {
    ...getDefaultSearchState("rent"),
    context: { mode: "rent", city, cities: [], locations, propertyTypes: [] },
  };
}

const area = (id: string, label: string): LocationToken => ({
  id,
  label,
  type: "area",
  cityId: "bengaluru",
  placeId: id,
  lat: null,
  lng: null,
  viewport: null,
});

describe("resultHeaderLabel", () => {
  it("no city → Homes across India", () => {
    expect(resultHeaderLabel(stateWith(null), 12)).toBe("Homes across India");
  });

  it("city, no areas → N homes in City (title-cased) using exact total", () => {
    expect(resultHeaderLabel(stateWith("bengaluru"), 2)).toBe("2 homes in Bengaluru");
  });

  it("exact total (no + suffix)", () => {
    expect(resultHeaderLabel(stateWith("bengaluru"), 247)).toBe("247 homes in Bengaluru");
  });

  it("singular home when exactly one", () => {
    expect(resultHeaderLabel(stateWith("pune"), 1)).toBe("1 home in Pune");
  });

  it("single area → uses area label", () => {
    expect(resultHeaderLabel(stateWith("bengaluru", [area("a", "Whitefield")]), 47)).toBe(
      "47 homes in Whitefield",
    );
  });

  it("multiple areas → +k areas suffix", () => {
    const locs = [area("a", "Whitefield"), area("b", "Marathahalli"), area("c", "HSR")];
    expect(resultHeaderLabel(stateWith("bengaluru", locs), 30)).toBe(
      "30 homes in Whitefield +2 areas",
    );
  });
});
