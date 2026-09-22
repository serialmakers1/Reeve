// Per-property lister/owner contact override resolution (pure).
//
// A property may carry its own real-owner display name and phone (columns
// listing_contact_name / listing_contact_phone on public.properties). When a
// non-blank override is present it takes precedence over the operator account's
// users.full_name / users.phone; otherwise the existing account value (and, for
// phone, the downstream get_phone_fallback chain) is used unchanged.
//
// This helper only decides override-vs-base. Whitespace-only overrides are
// treated as absent so they fall through to today's behavior. No DB/network.
//
// NOTE: an identical copy lives in resend-reveal/ownerContactOverride.ts. There
// is no cross-function shared-module directory in this repo (see fetchPhoneFallback,
// duplicated per function), so the copies are kept in lockstep and both are
// exercised by the same parameterized test (src/test/ownerContactOverride.test.ts).
export function pickOverride(
  raw: string | null | undefined,
  base: string | null,
): string | null {
  const trimmed = (raw ?? "").trim();
  return trimmed !== "" ? trimmed : base;
}
