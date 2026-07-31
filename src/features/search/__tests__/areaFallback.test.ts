import { describe, it, expect } from "vitest";
import { shouldRecoverAreas } from "../state/useSearchResults";

describe("shouldRecoverAreas", () => {
  it("fires on success + 0 rows + areas selected", () => {
    expect(shouldRecoverAreas(true, 0, 2)).toBe(true);
  });

  it("does NOT fire while loading/not-yet-successful (even with 0 rows + areas)", () => {
    expect(shouldRecoverAreas(false, 0, 2)).toBe(false);
  });

  it("does NOT fire when the primary query returned results", () => {
    expect(shouldRecoverAreas(true, 5, 2)).toBe(false);
  });

  it("does NOT fire when no areas are selected", () => {
    expect(shouldRecoverAreas(true, 0, 0)).toBe(false);
  });
});
