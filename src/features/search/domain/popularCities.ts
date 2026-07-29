// Static list of popular Indian cities for the Search Setup quick-pick.
// Plain names only — clicking one runs the canonical Google resolve (useResolveCity)
// to obtain placeId + viewport, identical to a typed selection. No DB table.

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
