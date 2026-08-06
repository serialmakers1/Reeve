/**
 * Pure helpers for the admin listing-review page — kept framework-free so they
 * can be unit-tested directly (no component render, no mocks).
 *
 *  - isCustomAmenity: a building amenity is "custom" when its value is not one of
 *    the canonical BUILDING_AMENITIES values. No fuzzy matching.
 *  - normalizeFurnishingForDisplay / normalizeAmenitiesForDisplay: defensively
 *    turn possibly-malformed JSONB into readable, de-duplicated display rows,
 *    flagging custom entries and surfacing a `malformed` fallback flag rather
 *    than crashing on unexpected shapes.
 */

import { BUILDING_AMENITIES, FURNISHING_ITEM_OPTIONS } from "@/config/property-form";

const CANONICAL_AMENITY_VALUES: Set<string> = new Set(
  BUILDING_AMENITIES.map((a) => a.value as string),
);

const FURNISHING_LABELS: Map<string, string> = new Map(
  FURNISHING_ITEM_OPTIONS.map((o) => [o.value as string, o.label]),
);

const AMENITY_LABELS: Map<string, string> = new Map(
  BUILDING_AMENITIES.map((a) => [a.value as string, a.label]),
);

/** True when the amenity value is not part of the curated BUILDING_AMENITIES set. */
export function isCustomAmenity(value: string): boolean {
  return !CANONICAL_AMENITY_VALUES.has(value);
}

export interface FurnishingDisplayItem {
  label: string;
  count?: number;
  size?: string;
  rooms?: string;
  custom: boolean;
}

export interface FurnishingDisplay {
  items: FurnishingDisplayItem[];
  malformed: boolean;
}

export function normalizeFurnishingForDisplay(raw: unknown): FurnishingDisplay {
  if (raw == null) return { items: [], malformed: false };
  if (!Array.isArray(raw)) return { items: [], malformed: true };

  const items: FurnishingDisplayItem[] = [];
  for (const entry of raw) {
    if (entry == null || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const itemKey = typeof e.item === "string" ? e.item : "";
    if (!itemKey) continue;
    const custom = e.custom === true;
    const label = custom ? itemKey : FURNISHING_LABELS.get(itemKey) ?? itemKey;
    const out: FurnishingDisplayItem = { label, custom };
    if (typeof e.count === "number" && Number.isFinite(e.count)) out.count = e.count;
    if (typeof e.size === "string" && e.size.trim()) out.size = e.size;
    if (typeof e.rooms === "string" && e.rooms.trim()) out.rooms = e.rooms;
    items.push(out);
  }
  return { items, malformed: false };
}

export interface AmenityDisplayItem {
  value: string;
  label: string;
  custom: boolean;
}

export interface AmenitiesDisplay {
  building: AmenityDisplayItem[];
  furnishingItems: AmenityDisplayItem[];
  malformed: boolean;
}

/** De-duplicate a string[] preserving first-seen order; drops non-strings/empties. */
function cleanStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string") continue;
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function normalizeAmenitiesForDisplay(raw: unknown): AmenitiesDisplay {
  if (raw == null) return { building: [], furnishingItems: [], malformed: false };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { building: [], furnishingItems: [], malformed: true };
  }
  const obj = raw as Record<string, unknown>;

  const building = cleanStringList(obj.building).map((v) => ({
    value: v,
    label: AMENITY_LABELS.get(v) ?? v,
    custom: isCustomAmenity(v),
  }));

  // furnishing_items are curated FURNISHING_ITEM_OPTIONS values (owner UI only
  // toggles canonical entries) — treated as curated, never flagged custom.
  const furnishingItems = cleanStringList(obj.furnishing_items).map((v) => ({
    value: v,
    label: FURNISHING_LABELS.get(v) ?? v,
    custom: false,
  }));

  return { building, furnishingItems, malformed: false };
}
