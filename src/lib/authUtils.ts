// ─────────────────────────────────────────────
// AUTH UTILITIES
// ─────────────────────────────────────────────

/** Prevents open redirect attacks on returnTo param */
export function getSafeReturnTo(returnTo: string | null | undefined): string {
  if (!returnTo) return '/tenant-dashboard';
  if (returnTo.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }
  return '/tenant-dashboard';
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
