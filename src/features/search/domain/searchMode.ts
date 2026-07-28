export type SearchMode = "rent" | "buy";
export type UnresolvedMode = null;

export const VALID_MODES = ["rent", "buy"] as const;

export const listingTypeBySearchMode = {
  rent: "rent",
  buy: "sale",
} as const satisfies Record<SearchMode, "rent" | "sale">;

export type DbListingType = (typeof listingTypeBySearchMode)[SearchMode];

/**
 * Parses the raw `?type=` URL param into a canonical SearchMode.
 * "sale" is a compatibility alias → normalizes to "buy".
 * Case-insensitive. Returns null for unrecognized/empty values.
 */
export function parseSearchMode(raw: string | null): SearchMode | UnresolvedMode {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower === "rent") return "rent";
  if (lower === "buy") return "buy";
  if (lower === "sale") return "buy"; // DB alias — never surfaces in public URLs
  return null;
}

/** Always returns "rent" or "buy" — never "sale". */
export function serializeSearchMode(mode: SearchMode): "rent" | "buy" {
  return mode;
}

export function isValidMode(raw: unknown): raw is SearchMode {
  return raw === "rent" || raw === "buy";
}
