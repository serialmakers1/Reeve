import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";
import type { SearchMode } from "@/features/search/domain/searchMode";

export interface ComparisonFact {
  label: string;
}

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi-furnished",
  fully_furnished: "Fully furnished",
};

const POSSESSION_STATUS_LABELS: Record<string, string> = {
  ready_to_move: "Ready to move",
  under_construction: "Under construction",
  new_launch: "New launch",
};

function add(facts: ComparisonFact[], label: string | null | undefined): void {
  if (!label || facts.length >= 3) return;
  facts.push({ label });
}

function floorLabel(floorNumber: number | null, totalFloors: number | null): string | null {
  if (floorNumber === null) return null;
  return totalFloors !== null ? `Fl ${floorNumber}/${totalFloors}` : `Fl ${floorNumber}`;
}

function parkingLabel(parking4w: string | null, parking2w: string | null): string | null {
  if (parking4w && parking4w !== "none") return "4W parking";
  if (parking2w && parking2w !== "none") return "2W parking";
  return null;
}

function possessionDateLabel(possessionDate: string | null): string | null {
  if (!possessionDate) return null;
  try {
    const d = new Date(possessionDate);
    const month = d.toLocaleString("en-IN", { month: "short" });
    return `Possession: ${month} ${d.getFullYear()}`;
  } catch {
    return null;
  }
}

export function resolveComparisonFacts(
  result: SearchPropertyResult,
  mode: SearchMode,
): ComparisonFact[] {
  const facts: ComparisonFact[] = [];

  if (mode === "rent") {
    // 1. carpet area
    if (result.carpetAreaSqft) add(facts, `${result.carpetAreaSqft} sq.ft`);
    // 2. super-built-up — skip only when numeric value equals carpet (area-value duplicate)
    if (result.superBuiltUpSqft && result.superBuiltUpSqft !== result.carpetAreaSqft) {
      add(facts, `${result.superBuiltUpSqft} sq.ft SBA`);
    }
    // 3. furnishing
    if (result.furnishing) add(facts, FURNISHING_LABELS[result.furnishing] ?? null);
    // 4. bathrooms
    if (result.bathrooms) add(facts, `${result.bathrooms} bath`);
    // 5. floor
    add(facts, floorLabel(result.floorNumber, result.totalFloors));
    // 6-7. parking (4W first, then 2W)
    add(facts, parkingLabel(result.parking4w, result.parking2w));
  } else {
    // Buy
    // 1. carpet area
    if (result.carpetAreaSqft) add(facts, `${result.carpetAreaSqft} sq.ft`);
    // 2. possession status
    if (result.possessionStatus) add(facts, POSSESSION_STATUS_LABELS[result.possessionStatus] ?? null);
    // 3. possession date
    add(facts, possessionDateLabel(result.possessionDate));
    // 4. building age
    if (result.buildingAgeYears) add(facts, `${result.buildingAgeYears} yr old`);
    // 5. bathrooms
    if (result.bathrooms) add(facts, `${result.bathrooms} bath`);
    // 6. floor
    add(facts, floorLabel(result.floorNumber, result.totalFloors));
    // 7. parking
    add(facts, parkingLabel(result.parking4w, result.parking2w));
  }

  return facts;
}
