import { describe, it, expect } from "vitest";
import { interpretQuotaResult } from "../../supabase/functions/confirm-property-location/quota.ts";

// F-03: the Edge guard maps this decision to allow → engineResolve, rate_limited → 429,
// unavailable → 503 (fail closed). These tests pin the fail-closed contract so a future parsing
// change cannot silently become a fail-open bypass into billable Google calls.
describe("interpretQuotaResult (F-03 quota decision)", () => {
  it("strict true → allow (only path that reaches Google)", () => {
    expect(interpretQuotaResult(true, true)).toBe("allow");
    expect(interpretQuotaResult(true, [true])).toBe("allow"); // tolerate single-element array
  });

  it("strict false → rate_limited (→ 429)", () => {
    expect(interpretQuotaResult(true, false)).toBe("rate_limited");
    expect(interpretQuotaResult(true, [false])).toBe("rate_limited");
  });

  it("RPC HTTP failure → unavailable (→ 503, fail closed)", () => {
    expect(interpretQuotaResult(false, true)).toBe("unavailable");
    expect(interpretQuotaResult(false, false)).toBe("unavailable");
    expect(interpretQuotaResult(false, null)).toBe("unavailable");
  });

  it("malformed / non-boolean body → unavailable (→ 503, fail closed)", () => {
    for (const bad of [null, undefined, {}, [], "true", "false", 1, 0, [true, false], { allowed: true }]) {
      expect(interpretQuotaResult(true, bad)).toBe("unavailable");
    }
  });
});
