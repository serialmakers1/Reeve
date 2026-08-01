import React from "react";
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useSearchState } from "../state/useSearchState";
import type { RentFilters } from "../domain/searchTypes";

function wrapper(initial: string) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries: [initial] }, children);
}

describe("useSearchState.applyFilters", () => {
  it("replaces filters atomically AND preserves the externally-selected sort", () => {
    const { result } = renderHook(() => useSearchState(), {
      wrapper: wrapper("/search?type=rent&sort=price_asc&bhk=2BHK"),
    });
    expect(result.current.state.sort).toBe("price_asc");
    expect((result.current.state.filters as RentFilters).bhk).toEqual(["2BHK"]);

    act(() => result.current.applyFilters({ bhk: ["1BHK"] }));

    // BHK applied (not clobbered) and sort untouched — filters + sort coexist.
    expect((result.current.state.filters as RentFilters).bhk).toEqual(["1BHK"]);
    expect(result.current.state.sort).toBe("price_asc");
  });

  it("clearing a filter in the applied draft removes only that filter (replace, not merge)", () => {
    const { result } = renderHook(() => useSearchState(), {
      wrapper: wrapper("/search?type=rent&bhk=2BHK&furnishing=semi_furnished"),
    });
    // Draft omits bhk (user unchecked it) but keeps furnishing.
    act(() => result.current.applyFilters({ furnishing: ["semi_furnished"] }));

    expect((result.current.state.filters as RentFilters).bhk).toBeUndefined();
    expect((result.current.state.filters as RentFilters).furnishing).toEqual(["semi_furnished"]);
  });
});
