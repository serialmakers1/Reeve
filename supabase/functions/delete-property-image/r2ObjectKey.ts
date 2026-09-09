// SEC-AUDIT-01 — the SINGLE source of the "this R2 object belongs to this property"
// rule. Pure TypeScript with no Deno/Node globals, so it is imported unchanged by the
// Deno Edge Function (delete-property-image/index.ts) AND by the Vitest suite
// (src/test/*), guaranteeing the Edge check and the tests can never drift apart. The
// database CHECK constraint added in the accompanying migration encodes the identical
// object-segment predicate.
//
// Canonical Reeve image object key (see upload-property-image/index.ts):
//   properties/<propertyId>/photos/<Date.now() digits>-<crypto.randomUUID()>.<ext>
// The object segment is structurally pinned to <digits>-<uuid>.<ext> so a stored URL
// can never resolve to another property's R2 object, a dot-path segment, a
// percent-encoded separator, or any other unusual key that reaches R2 signing.

export const R2_PUBLIC_URL = "https://images.reeve.in";

// <digits>-<8-4-4-4-12 hex UUID>.<alphanumeric ext>. Extension is left open (no
// jpg/png/webp allow-list) so future formats work; every other character is rejected.
const CANONICAL_OBJECT_RE =
  /^[0-9]+-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.[A-Za-z0-9]+$/;

/**
 * Return the canonical R2 object key for `imageUrl` IFF it provably belongs to
 * `propertyId`; otherwise `null`. Identity is derived from `URL.pathname` (never a raw
 * string replace) so a query string or fragment cannot change which object is deleted.
 * A `null` result must be treated as fail-closed: no DB delete, no R2 delete.
 */
export function getOwnedR2ObjectKey(imageUrl: string, propertyId: string): string | null {
  let u: URL;
  try {
    u = new URL(imageUrl);
  } catch {
    return null;
  }
  // Exact origin — rejects scheme changes and lookalike hosts (e.g. images.reeve.in.evil.example).
  if (u.origin !== R2_PUBLIC_URL) return null;
  // No query string or fragment is ever legitimate on a stored image URL.
  if (u.search !== "" || u.hash !== "") return null;
  const prefix = `/properties/${propertyId}/photos/`;
  // URL() already normalizes dot-path segments, so `.`/`..` cannot survive here; the
  // prefix check and the canonical regex below are the belt-and-braces enforcement.
  if (!u.pathname.startsWith(prefix)) return null;
  const object = u.pathname.slice(prefix.length);
  if (!CANONICAL_OBJECT_RE.test(object)) return null;
  return `properties/${propertyId}/photos/${object}`;
}
