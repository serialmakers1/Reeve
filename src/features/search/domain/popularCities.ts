// Static list of popular Indian cities for the Search Setup quick-pick.
// Plain names only — clicking one runs the canonical Reeve resolve
// (resolveCanonicalCityByName → reeve_search_geo_suggest) to obtain a canonical
// geo_place root token, identical to a typed selection. No Google, no DB table.

export const POPULAR_CITIES: readonly string[] = [
  "Bengaluru",
  "Mumbai",
  "Delhi",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Gurgaon",
  "Noida",
] as const;
