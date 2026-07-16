/**
 * Sync Prompt 1 (D-167) — formatDeposit precedence.
 * amount > 0 → prefer amount (annotate months when present)
 * amount null/0 → months × rent (fall back to 2 × rent when months null)
 */
import { describe, it, expect } from "vitest";
import { formatDeposit } from "@/pages/PropertyDetail";

describe("formatDeposit (D-167)", () => {
  it("prefers owner-entered amount when set, annotates months as context", () => {
    expect(formatDeposit(70000, 2, 30000)).toBe("₹70,000 (2 months)");
  });

  it("renders amount alone when months is null", () => {
    expect(formatDeposit(70000, null, 30000)).toBe("₹70,000");
    expect(formatDeposit(70000, undefined, 30000)).toBe("₹70,000");
  });

  it("falls back to months × rent when amount is null", () => {
    expect(formatDeposit(null, 2, 30000)).toBe("₹60,000");
    expect(formatDeposit(undefined, 3, 30000)).toBe("₹90,000");
  });

  it("falls back to 2 × rent when both amount and months are null (preserves prior default)", () => {
    expect(formatDeposit(null, null, 30000)).toBe("₹60,000");
    expect(formatDeposit(undefined, undefined, 30000)).toBe("₹60,000");
  });

  it("treats amount = 0 as unset, falls back to months × rent", () => {
    expect(formatDeposit(0, 2, 30000)).toBe("₹60,000");
  });
});
