// ─────────────────────────────────────────────
// AUTH UTILITIES
// ─────────────────────────────────────────────

/** Prevents open redirect attacks on returnTo param */
export function getSafeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) return '/dashboard';
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }
  return '/dashboard';
}

/** Redirect based on user role after login */
export function getDefaultRouteForRole(role: string | null | undefined): string {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return '/admin';
    case 'owner':
      return '/owner';
    case 'tenant':
    default:
      return '/dashboard';
  }
}
