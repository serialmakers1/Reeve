import { describe, it, expect } from "vitest";
import { pickOverride as revealPickOverride } from "../../supabase/functions/reveal-contact/ownerContactOverride";
import { pickOverride as resendPickOverride } from "../../supabase/functions/resend-reveal/ownerContactOverride";

// Per-property lister/owner contact override precedence + fallback (pure).
// Both Edge Functions keep their own copy of pickOverride (no cross-function
// shared-module directory in the repo), so the same case table is run against
// BOTH copies here to prove they cannot silently drift. These tests cover the
// reveal + resend owner name/phone resolution ONLY — the get_owner_card SQL
// function (same trim/empty->null semantics) is verified separately by static
// review + one live SQL call after the migration is deployed.
const helpers: Array<[string, typeof revealPickOverride]> = [
  ["reveal-contact", revealPickOverride],
  ["resend-reveal", resendPickOverride],
];

describe.each(helpers)("pickOverride (%s)", (_name, pickOverride) => {
  it("prefers a non-blank override (name precedence)", () => {
    expect(pickOverride("Real Owner", "Reeve")).toBe("Real Owner");
  });

  it("prefers a non-blank override (phone precedence)", () => {
    expect(pickOverride("919900000123", "919900000002")).toBe("919900000123");
  });

  it("trims a non-blank override", () => {
    expect(pickOverride("  Real Owner  ", "Reeve")).toBe("Real Owner");
  });

  it("falls back when override is null (name)", () => {
    expect(pickOverride(null, "Reeve")).toBe("Reeve");
  });

  it("falls back when override is undefined (name)", () => {
    expect(pickOverride(undefined, "Reeve")).toBe("Reeve");
  });

  it("falls back when override is empty string", () => {
    expect(pickOverride("", "919900000002")).toBe("919900000002");
  });

  it("falls back when override is whitespace-only", () => {
    expect(pickOverride("   ", "919900000002")).toBe("919900000002");
  });

  it("returns null when both override and base are absent (existing-row behavior)", () => {
    expect(pickOverride(null, null)).toBe(null);
    expect(pickOverride("  ", null)).toBe(null);
  });
});
