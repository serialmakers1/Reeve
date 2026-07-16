/**
 * Shared property JSONB types (D-170).
 *
 * Consumed by owner form, admin form, public detail, and the shared editors
 * (<FurnishingEditor>, <AmenitiesEditor>). Extracted from ListProperty.tsx +
 * admin/PropertyEdit.tsx which each had their own inline definitions.
 */

export interface FurnishingDetailItem {
  /** Canonical item value (matches FURNISHING_ITEM_OPTIONS[].value) or owner-typed free-text for customs */
  item: string;
  count?: number;
  /** Free-text size descriptor (e.g. "Queen") — enabled per-item via FURNISHING_ITEM_OPTIONS.hasSizeText */
  size?: string;
  /** Free-text rooms descriptor (e.g. "Master + Living") — enabled per-item via FURNISHING_ITEM_OPTIONS.hasRooms */
  rooms?: string;
  /** True when owner added it via the "+ Add item" affordance; false/undefined for canonical items */
  custom?: boolean;
}

export interface AmenitiesJson {
  /** Flat list — canonical BUILDING_AMENITIES values + owner-added custom strings mixed together */
  building?: string[];
  /** Legacy denormalization of furnishing_detail item names — kept for downstream readers */
  furnishing_items?: string[];
}

/**
 * Derive the amenities JSONB from a flat building array + furnishing_detail.
 * `building` is written as-is (component owns canonical vs custom split for display).
 * `furnishing_items` is derived by mapping non-custom furnishing_detail entries.
 */
export function buildAmenitiesJson(
  building: string[],
  furnishingDetail: FurnishingDetailItem[],
): AmenitiesJson {
  return {
    building,
    furnishing_items: furnishingDetail.filter((f) => !f.custom).map((f) => f.item),
  };
}
