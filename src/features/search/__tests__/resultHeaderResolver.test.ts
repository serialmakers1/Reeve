import { describe, it, expect } from "vitest";
import { resultHeaderLabel } from "../state/resultHeaderResolver";
import { getDefaultSearchState } from "../domain/searchDefaults";
import type { SearchState, LocationToken } from "../domain/searchTypes";

function stateWith(city: string | null, locations: LocationToken[] = []): SearchState {
  return {
    ...getDefaultSearchState("rent"),
    context: { mode: "rent", city, locations, propertyTypes: [] },
  };
}

const area = (id: string, label: string): LocationToken => ({
  id,
  label,
  type: "area",
  cityId: "bengaluru",
  placeId: id,
});

describe("resultHeaderLabel", () => {
  it("no city → Homes across India", () => {
    expect(resultHeaderLabel(stateWith(null), 12, true)).toBe("Homes across India");
  });

  it("city, no areas → N homes in City (title-cased)", () => {
    expect(resultHeaderLabel(stateWith("bengaluru"), 2, false)).toBe("2 homes in Bengaluru");
  });

  it("adds + when more pages exist", () => {
    expect(resultHeaderLabel(stateWith("bengaluru"), 20, true)).toBe("20+ homes in Bengaluru");
  });

  it("singular home when exactly one and no next page", () => {
    expect(resultHeaderLabel(stateWith("pune"), 1, false)).toBe("1 home in Pune");
  });

  it("single area → uses area label", () => {
    expect(resultHeaderLabel(stateWith("bengaluru", [area("a", "Whitefield")]), 47, false)).toBe(
      "47 homes in Whitefield",
    );
  });

  it("multiple areas → +k areas suffix", () => {
    const locs = [area("a", "Whitefield"), area("b", "Marathahalli"), area("c", "HSR")];
    expect(resultHeaderLabel(stateWith("bengaluru", locs), 30, false)).toBe(
      "30 homes in Whitefield +2 areas",
    );
  });
});
