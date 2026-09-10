// ─────────────────────────────────────────────
// AUTH UTILITIES
// ─────────────────────────────────────────────

/**
 * Canonical open-redirect guard for any attacker-controllable `returnTo`
 * value (query param, sessionStorage, localStorage) before it reaches
 * navigation, OAuth `redirectTo`, or `<Link to>`.
 *
 * Resolves the candidate against the current origin with the WHATWG URL
 * parser, which normalizes backslashes (`/\host`), protocol-relative
 * (`//host`), and encoded variants. Only a same-origin internal path
 * survives; anything else — off-origin, non-`/` schemes (`javascript:`,
 * `data:`), or unparseable input — returns `fallback`. Query and hash on a
 * valid internal path are preserved.
 *
 * @param fallback value returned for any rejected/empty input. Callers that
 *   must NOT navigate on an invalid value pass `""` and gate on the result.
 */
export function getSafeReturnTo(
  returnTo: string | null | undefined,
  fallback = '/',
): string {
  if (!returnTo || !returnTo.startsWith('/')) return fallback;
  try {
    const parsed = new URL(returnTo, window.location.origin);
    if (parsed.origin !== window.location.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * Extracts an OAuth/identity-link `error_description` from a callback URL.
 *
 * Supabase redirects back with an error when `linkIdentity`/`signInWithOAuth`
 * fails (e.g. "Identity is already linked to another user"). Under PKCE the
 * error arrives in the query string (`?error=...&error_description=...`); the
 * legacy implicit flow used the hash (`#error=...`). Reads both, query first,
 * so the caller behaves correctly regardless of flow shape.
 *
 * @returns the decoded `error_description`, or `null` when neither location
 *   carries one.
 */
export function getOAuthErrorDescription(
  search: string | null | undefined,
  hash: string | null | undefined,
): string | null {
  const fromQuery = (search ?? "").includes("error_description=");
  const fromHash = (hash ?? "").includes("error_description=");
  if (!fromQuery && !fromHash) return null;

  const params = fromQuery
    ? new URLSearchParams(search as string)
    : new URLSearchParams((hash as string).replace(/^#/, ""));
  const description = params.get("error_description") ?? "";
  return description || null;
}

/** Redirect based on user role after login */
export function getDefaultRouteForRole(role: string | null | undefined): string {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return '/admin/properties';
    case 'owner':
      return '/owner-dashboard';
    case 'user':
    case 'tenant':
    default:
      return '/tenant-dashboard';
  }
}
