import { describe, it, expect } from "vitest";
import { validateFlatNumber } from "../validateFlatNumber";

describe("validateFlatNumber", () => {
  it("returns null for null (optional field)", () => {
    expect(validateFlatNumber(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(validateFlatNumber(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(validateFlatNumber("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(validateFlatNumber("   ")).toBeNull();
  });

  it("accepts letters and numbers", () => {
    expect(validateFlatNumber("12A")).toBeNull();
  });

  it("accepts space (e.g. '12 A')", () => {
    expect(validateFlatNumber("12 A")).toBeNull();
  });

  it("accepts space + slash (e.g. '12 A/B')", () => {
    expect(validateFlatNumber("12 A/B")).toBeNull();
  });

  it("accepts hyphen (e.g. 'A-101')", () => {
    expect(validateFlatNumber("A-101")).toBeNull();
  });

  it("accepts multiple internal spaces", () => {
    expect(validateFlatNumber("A   603")).toBeNull();
  });

  it("trims before validating (leading/trailing spaces don't count toward length)", () => {
    // " A 603 " trims to "A 603" (5 chars) — valid
    expect(validateFlatNumber(" A 603 ")).toBeNull();
  });

  it("returns an error for invalid characters (@, !, #, etc.)", () => {
    const err = validateFlatNumber("12A!!!");
    expect(err).not.toBeNull();
    expect(err).toContain("letters");
  });

  it("returns a length error for 11+ character strings", () => {
    const err = validateFlatNumber("ABCDEFGHIJK"); // 11 chars
    expect(err).not.toBeNull();
    expect(err).toContain("10 characters");
  });

  it("accepts exactly 10 characters", () => {
    expect(validateFlatNumber("A123456789")).toBeNull();
  });

  it("returns an error for a character-valid but too-long string (after trim)", () => {
    // 11 valid chars after trim
    const err = validateFlatNumber(" A1234567890 ");
    expect(err).not.toBeNull();
    expect(err).toContain("10 characters");
  });
});
