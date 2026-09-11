// F-03 — pure interpretation of the location-resolution quota RPC result.
// Kept Deno-free so it is unit-testable from vitest (like resolvePin.ts / types.ts).
//
// consume_location_resolution_quota(p_user_id) RETURNS boolean. Via PostgREST /rpc a scalar-returning
// function yields the bare JSON value (true/false). We interpret DEFENSIVELY and FAIL CLOSED: only a
// strict boolean `true` allows provider work; a strict `false` is rate-limited; ANYTHING else
// (null/undefined/non-boolean/malformed) is treated as the quota system being unavailable so a future
// parsing mistake can never become a fail-open bypass.

export type QuotaDecision = "allow" | "rate_limited" | "unavailable";

/**
 * @param rpcOk   whether the quota RPC HTTP call succeeded (Response.ok)
 * @param body    the parsed JSON body of the quota RPC response (unknown shape — treat as untrusted)
 */
export function interpretQuotaResult(rpcOk: boolean, body: unknown): QuotaDecision {
  if (!rpcOk) return "unavailable";
  // PostgREST returns a scalar boolean directly; tolerate a single-element array just in case.
  const value = Array.isArray(body) && body.length === 1 ? body[0] : body;
  if (value === true) return "allow";
  if (value === false) return "rate_limited";
  return "unavailable";
}
