/**
 * Custom furniture / amenity name validation for the owner List Property form.
 *
 * Reuse-first: a single small Unicode-safe canonicalizer + a tiny explicit alias
 * map power duplicate detection against canonical options and existing custom
 * names. No fuzzy matching, no similarity library, no dependency.
 */

/** A canonical option as exposed by FURNISHING_ITEM_OPTIONS / BUILDING_AMENITIES. */
export interface CanonicalOption {
  value: string;
  label: string;
}

export const CUSTOM_NAME_MAX_WORDS = 3;
export const CUSTOM_NAME_MAX_CHARS = 30;

/**
 * Unicode-safe canonical form for comparison.
 * NFKC → lowercase → strip everything that is not a letter, number or combining
 * mark. `\p{M}` is kept so Indian-script matras/nuktas survive and distinct names
 * aren't merged or emptied. `a-z0-9`-only stripping is explicitly avoided.
 *   "Air Conditioner" / "air conditioner" / "AirConditioner" / "air-conditioner"
 *     → "airconditioner"
 */
export function canonicalizeLabel(s: string): string {
  return (s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, "");
}

/**
 * Small explicit alias map — only proven equivalents needed by existing canonical
 * options. Keys/values are already-canonicalized forms. Keep this tiny.
 */
const ALIAS_MAP: Record<string, string> = {
  ac: "airconditioner", // BUILDING/FURNISHING "AC" option ↔ "Air Conditioner"
};

/** Canonical comparison key (canonicalize + fold known aliases). */
function comparisonKey(s: string): string {
  const c = canonicalizeLabel(s);
  return ALIAS_MAP[c] ?? c;
}

/** Trim + collapse internal whitespace for display/length/word checks. */
function displayForm(s: string): string {
  return (s ?? "").trim().replace(/\s+/g, " ");
}

export type CustomNameCode =
  | "OK"
  | "BLANK"
  | "TOO_LONG"
  | "LIMIT"
  | "DUP_CANONICAL"
  | "DUP_CUSTOM";

export interface CustomNameResult {
  code: CustomNameCode;
  /** User-facing message; empty string for OK / BLANK (BLANK just disables Add). */
  message: string;
}

export interface ValidateCustomNameOptions {
  /** "add" enforces the count limit; "edit" never does and excludes the row itself. */
  mode: "add" | "edit";
  /** Current custom names already in the list. */
  existingCustoms: string[];
  /** Canonical options shown above (value + label). */
  canonicalOptions: readonly CanonicalOption[];
  /** Max custom items (only consulted in "add" mode). */
  limit: number;
  /** Noun for the limit message, e.g. "furniture items" / "amenities". */
  noun: string;
  /** Index of the row being edited (excluded from dup comparison in "edit" mode). */
  selfIndex?: number;
}

const OK: CustomNameResult = { code: "OK", message: "" };

/**
 * Validates a proposed custom name. In "add" mode it also enforces the 5-item
 * limit; in "edit" mode the limit is never applied (existing rows stay editable
 * even when the list is already at/over the limit) and the edited row is excluded
 * from duplicate comparison.
 */
export function validateCustomName(
  name: string,
  opts: ValidateCustomNameOptions,
): CustomNameResult {
  const { mode, existingCustoms, canonicalOptions, limit, noun, selfIndex } = opts;
  const display = displayForm(name);

  if (display === "") return { code: "BLANK", message: "" };

  // Count limit — add mode only.
  if (mode === "add" && existingCustoms.length >= limit) {
    return {
      code: "LIMIT",
      message: `You can add up to ${limit} custom ${noun}.`,
    };
  }

  // Length / word shape.
  const words = display.split(" ");
  if (words.length > CUSTOM_NAME_MAX_WORDS || display.length > CUSTOM_NAME_MAX_CHARS) {
    return {
      code: "TOO_LONG",
      message: `Use a short name of no more than ${CUSTOM_NAME_MAX_WORDS} words.`,
    };
  }

  const key = comparisonKey(display);

  // Duplicate of a canonical option (value or label).
  const canonicalMatch = canonicalOptions.find(
    (o) => comparisonKey(o.value) === key || comparisonKey(o.label) === key,
  );
  if (canonicalMatch) {
    return {
      code: "DUP_CANONICAL",
      message: `This is already available above as "${canonicalMatch.label}". Select that option instead.`,
    };
  }

  // Duplicate of another custom name (excluding the edited row).
  const customMatch = existingCustoms.find(
    (c, i) => i !== selfIndex && comparisonKey(c) === key,
  );
  if (customMatch) {
    return {
      code: "DUP_CUSTOM",
      message: `You have already added "${displayForm(customMatch)}".`,
    };
  }

  return OK;
}
