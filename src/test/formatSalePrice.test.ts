import { describe, it, expect } from "vitest";
import { formatSalePrice } from "@/utils/property/formatSalePrice";

describe("formatSalePrice", () => {
  describe("null/invalid inputs → null", () => {
    it("returns null for null", () => expect(formatSalePrice(null)).toBeNull());
    it("returns null for undefined", () => expect(formatSalePrice(undefined)).toBeNull());
    it("returns null for 0", () => expect(formatSalePrice(0)).toBeNull());
    it("returns null for negative", () => expect(formatSalePrice(-1)).toBeNull());
    it("returns null for NaN", () => expect(formatSalePrice(NaN)).toBeNull());
    it("returns null for Infinity", () => expect(formatSalePrice(Infinity)).toBeNull());
  });

  describe("sub-lakh range (Indian grouping)", () => {
    it("formats ₹95,000", () => expect(formatSalePrice(95_000)).toBe("₹95,000"));
    it("formats ₹50,000", () => expect(formatSalePrice(50_000)).toBe("₹50,000"));
  });

  describe("lakh range", () => {
    it("formats exactly 1 lakh", () => expect(formatSalePrice(1_00_000)).toBe("₹1 Lakh"));
    it("formats ₹12.5 Lakh", () => expect(formatSalePrice(12_50_000)).toBe("₹12.5 Lakh"));
    it("formats ₹85 Lakh (no trailing zeros)", () => expect(formatSalePrice(85_00_000)).toBe("₹85 Lakh"));
  });

  describe("rounding boundary: ₹99,99,999 must NOT return ₹100 Lakh", () => {
    it("promotes 99_99_999 to ₹1 Cr (not ₹100 Lakh)", () => {
      const result = formatSalePrice(99_99_999);
      expect(result).not.toBe("₹100 Lakh");
      expect(result).toBe("₹1 Cr");
    });
  });

  describe("crore range", () => {
    it("formats exactly 1 crore", () => expect(formatSalePrice(1_00_00_000)).toBe("₹1 Cr"));
    it("formats ₹1.25 Cr", () => expect(formatSalePrice(1_25_00_000)).toBe("₹1.25 Cr"));
    it("formats ₹3 Cr (no trailing zeros)", () => expect(formatSalePrice(3_00_00_000)).toBe("₹3 Cr"));
  });
});
