// F-08 — transition-proof for the reveal-contact approval PATCH.
//
// The approval PATCH is conditional (`?id=eq.<id>&status=eq.pending`). A default
// PostgREST PATCH returns 2xx even when it matches ZERO rows, so `updateRes.ok`
// alone cannot prove THIS invocation performed the pending→approved transition.
// If a tenant withdrawal (pending→withdrawn) wins the race, the PATCH matches no
// row yet the function would otherwise proceed to load and dispatch contact PII.
//
// This pure predicate is fed the parsed body of a PATCH sent with
// `Prefer: return=representation&select=id,status`. It returns true ONLY when the
// response proves exactly one row with the expected id transitioned to "approved".
// Any other shape (zero rows, multiple rows, wrong id, wrong status, malformed)
// fails closed so no PII work follows.
export function isApprovedTransitionProof(rows: unknown, expectedId: string): boolean {
  if (!Array.isArray(rows) || rows.length !== 1) return false;
  const row = rows[0] as { id?: unknown; status?: unknown } | null;
  if (!row || typeof row !== "object") return false;
  return row.id === expectedId && row.status === "approved";
}
