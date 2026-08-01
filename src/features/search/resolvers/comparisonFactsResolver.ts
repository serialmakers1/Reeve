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

/** Comma-group a whole number (Indian/standard thousands) for area labels. */
function fmt(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
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

  // Preferred high-value attributes first (carpet, super built-up, furnishing, parking),
  // with explicit labels (no unexplained abbreviations). Capped at 3 by add().
  if (mode === "rent") {
    if (result.carpetAreaSqft) add(facts, `${fmt(result.carpetAreaSqft)} sq.ft carpet`);
    if (result.superBuiltUpSqft && result.superBuiltUpSqft !== result.carpetAreaSqft) {
      add(facts, `${fmt(result.superBuiltUpSqft)} sq.ft super built-up`);
    }
    if (result.furnishing) add(facts, FURNISHING_LABELS[result.furnishing] ?? null);
    add(facts, parkingLabel(result.parking4w, result.parking2w));
    // fallbacks if fewer than 3 high-value attributes are present
    if (result.bathrooms) add(facts, `${result.bathrooms} bath`);
    add(facts, floorLabel(result.floorNumber, result.totalFloors));
  } else {
    if (result.carpetAreaSqft) add(facts, `${fmt(result.carpetAreaSqft)} sq.ft carpet`);
    if (result.superBuiltUpSqft && result.superBuiltUpSqft !== result.carpetAreaSqft) {
      add(facts, `${fmt(result.superBuiltUpSqft)} sq.ft super built-up`);
    }
    if (result.furnishing) add(facts, FURNISHING_LABELS[result.furnishing] ?? null);
    add(facts, parkingLabel(result.parking4w, result.parking2w));
    // fallbacks
    if (result.possessionStatus) add(facts, POSSESSION_STATUS_LABELS[result.possessionStatus] ?? null);
    add(facts, possessionDateLabel(result.possessionDate));
    if (result.buildingAgeYears) add(facts, `${result.buildingAgeYears} yr old`);
  }

  return facts;
}
