export interface NormalizedAmenities {
  building: string[];
  furnishing_items: string[];
}

export function normalizeAmenities(raw: unknown): NormalizedAmenities {
  if (Array.isArray(raw)) {
    return { building: raw as string[], furnishing_items: [] };
  }
  if (!raw || typeof raw !== "object") {
    return { building: [], furnishing_items: [] };
  }
  const obj = raw as Record<string, unknown>;
  return {
    building: Array.isArray(obj.building) ? (obj.building as string[]) : [],
    furnishing_items: Array.isArray(obj.furnishing_items)
      ? (obj.furnishing_items as string[])
      : [],
  };
}
