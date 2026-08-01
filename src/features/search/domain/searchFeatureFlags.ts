// Reversible Search feature gates. Single source of truth.

/**
 * Temporarily disables Map + Split views everywhere (List-only Search).
 * The Map/Split implementation is kept dormant in the codebase; flip this to
 * true to re-enable all entry points (view toggle, FAB, marker queries, mount).
 */
export const SEARCH_MAP_ENABLED = false;
