import { describe, it, expect } from "vitest";
import {
  parseSearchMode,
  serializeSearchMode,
  isValidMode,
} from "../domain/searchMode";

describe("parseSearchMode", () => {
  it('returns "rent" for "rent"', () => {
    expect(parseSearchMode("rent")).toBe("rent");
  });

  it('returns "buy" for "buy"', () => {
    expect(parseSearchMode("buy")).toBe("buy");
  });

  it('normalizes "sale" alias to "buy"', () => {
    expect(parseSearchMode("sale")).toBe("buy");
  });

  it("returns null for null", () => {
    expect(parseSearchMode(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSearchMode("")).toBeNull();
  });

  it('is case-insensitive: "RENT" → "rent"', () => {
    expect(parseSearchMode("RENT")).toBe("rent");
  });

  it('is case-insensitive: "Rent" → "rent"', () => {
    expect(parseSearchMode("Rent")).toBe("rent");
  });

  it('is case-insensitive: "BUY" → "buy"', () => {
    expect(parseSearchMode("BUY")).toBe("buy");
  });

  it('is case-insensitive: "SALE" → "buy"', () => {
    expect(parseSearchMode("SALE")).toBe("buy");
  });

  it("returns null for unrecognized string", () => {
    expect(parseSearchMode("invalid")).toBeNull();
  });

  it('returns null for "lease"', () => {
    expect(parseSearchMode("lease")).toBeNull();
  });
});

describe("serializeSearchMode", () => {
  it('serializes "rent" → "rent"', () => {
    expect(serializeSearchMode("rent")).toBe("rent");
  });

  it('serializes "buy" → "buy" (never "sale")', () => {
    expect(serializeSearchMode("buy")).toBe("buy");
  });
});

describe("isValidMode", () => {
  it('returns true for "rent"', () => {
    expect(isValidMode("rent")).toBe(true);
  });

  it('returns true for "buy"', () => {
    expect(isValidMode("buy")).toBe(true);
  });

  it('returns false for "sale"', () => {
    expect(isValidMode("sale")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isValidMode(null)).toBe(false);
  });

  it("returns false for number", () => {
    expect(isValidMode(1)).toBe(false);
  });
});
