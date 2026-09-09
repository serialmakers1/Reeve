/**
 * SEC-AUDIT-01 — cross-property R2 deletion.
 *
 * These tests exercise the SINGLE shared security rule (getOwnedR2ObjectKey) that the
 * delete-property-image Edge Function uses on BOTH its staged and normal branches, and
 * whose predicate the accompanying DB CHECK constraint mirrors exactly. The rule must
 * yield a canonical R2 object key ONLY when the stored url provably belongs to the
 * authorized property; every foreign / malformed / non-canonical url must return null
 * (fail closed — no DB delete, no R2 delete).
 *
 * The import reaches directly into the Edge Function module so there is exactly one
 * implementation of the rule under test (no divergent copy).
 */
import { describe, it, expect } from "vitest";
import {
  getOwnedR2ObjectKey,
  R2_PUBLIC_URL,
} from "../../supabase/functions/delete-property-image/r2ObjectKey";

const PROP_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PROP_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// Reeve's canonical server-generated object segment: <Date.now()>-<uuid>.<ext>
function canonicalObject(ext = "webp"): string {
  return `1699999999999-${crypto.randomUUID()}.${ext}`;
}
function urlFor(propertyId: string, object: string): string {
  return `${R2_PUBLIC_URL}/properties/${propertyId}/photos/${object}`;
}

describe("getOwnedR2ObjectKey — canonical / owned URLs are accepted", () => {
  it("returns the canonical key for an owned canonical URL", () => {
    const object = canonicalObject();
    const url = urlFor(PROP_A, object);
    expect(getOwnedR2ObjectKey(url, PROP_A)).toBe(`properties/${PROP_A}/photos/${object}`);
  });

  it("accepts future extensions (no jpg/png/webp allow-list)", () => {
    const object = canonicalObject("avif");
    expect(getOwnedR2ObjectKey(urlFor(PROP_A, object), PROP_A)).toBe(
      `properties/${PROP_A}/photos/${object}`,
    );
  });

  it("accepts jpg and png too", () => {
    for (const ext of ["jpg", "png"]) {
      const object = canonicalObject(ext);
      expect(getOwnedR2ObjectKey(urlFor(PROP_A, object), PROP_A)).toBe(
        `properties/${PROP_A}/photos/${object}`,
      );
    }
  });
});

describe("getOwnedR2ObjectKey — cross-property and foreign origins are rejected", () => {
  it("rejects Property B's canonical URL when authorized for Property A (the exploit)", () => {
    const url = urlFor(PROP_B, canonicalObject());
    expect(getOwnedR2ObjectKey(url, PROP_A)).toBeNull();
  });

  it("rejects a lookalike host (images.reeve.in.evil.example)", () => {
    const object = canonicalObject();
    const url = `https://images.reeve.in.evil.example/properties/${PROP_A}/photos/${object}`;
    expect(getOwnedR2ObjectKey(url, PROP_A)).toBeNull();
  });

  it("rejects a wrong scheme (http)", () => {
    const object = canonicalObject();
    const url = `http://images.reeve.in/properties/${PROP_A}/photos/${object}`;
    expect(getOwnedR2ObjectKey(url, PROP_A)).toBeNull();
  });

  it("rejects a malformed URL", () => {
    expect(getOwnedR2ObjectKey("not a url", PROP_A)).toBeNull();
    expect(getOwnedR2ObjectKey("", PROP_A)).toBeNull();
  });
});

describe("getOwnedR2ObjectKey — query/fragment/path ambiguity is rejected", () => {
  it("rejects a query string that smuggles the authorized id (position-based evasion)", () => {
    const url = `${urlFor(PROP_B, canonicalObject())}?${PROP_A}`;
    expect(getOwnedR2ObjectKey(url, PROP_A)).toBeNull();
  });

  it("rejects a fragment", () => {
    const url = `${urlFor(PROP_A, canonicalObject())}#${PROP_A}`;
    expect(getOwnedR2ObjectKey(url, PROP_A)).toBeNull();
  });

  it("rejects an extra path segment after the object", () => {
    const url = urlFor(PROP_A, `${canonicalObject()}/y`);
    expect(getOwnedR2ObjectKey(url, PROP_A)).toBeNull();
  });

  it("rejects an empty object segment", () => {
    const url = `${R2_PUBLIC_URL}/properties/${PROP_A}/photos/`;
    expect(getOwnedR2ObjectKey(url, PROP_A)).toBeNull();
  });
});

describe("getOwnedR2ObjectKey — non-canonical object segments are rejected", () => {
  it("rejects '.' and '..' object segments", () => {
    expect(getOwnedR2ObjectKey(`${R2_PUBLIC_URL}/properties/${PROP_A}/photos/.`, PROP_A)).toBeNull();
    expect(getOwnedR2ObjectKey(`${R2_PUBLIC_URL}/properties/${PROP_A}/photos/..`, PROP_A)).toBeNull();
  });

  it("rejects percent-encoded separators and unusual characters", () => {
    const base = `${R2_PUBLIC_URL}/properties/${PROP_A}/photos/`;
    expect(getOwnedR2ObjectKey(`${base}foo%2Fbar.webp`, PROP_A)).toBeNull();
    expect(getOwnedR2ObjectKey(`${base}foo%2e%2e.webp`, PROP_A)).toBeNull();
    expect(getOwnedR2ObjectKey(`${base}foo bar.webp`, PROP_A)).toBeNull();
    expect(getOwnedR2ObjectKey(`${base}foo\\bar.webp`, PROP_A)).toBeNull();
  });

  it("rejects an object that does not match <digits>-<uuid>.<ext>", () => {
    const base = `${R2_PUBLIC_URL}/properties/${PROP_A}/photos/`;
    expect(getOwnedR2ObjectKey(`${base}foo.webp`, PROP_A)).toBeNull();
    expect(getOwnedR2ObjectKey(`${base}${crypto.randomUUID()}.webp`, PROP_A)).toBeNull(); // missing timestamp-
    expect(getOwnedR2ObjectKey(`${base}1699999999999-not-a-uuid.webp`, PROP_A)).toBeNull();
    expect(getOwnedR2ObjectKey(`${base}1699999999999-${crypto.randomUUID()}`, PROP_A)).toBeNull(); // missing .ext
  });
});
