/**
 * P5 "At a Glance" — 6-tile grid of the most important properties.
 * Null tiles are omitted (never a blank slot). Sale-listing swaps 2 tiles.
 */
import type { LucideIcon } from "lucide-react";
import {
  Home,
  Maximize2,
  Sofa,
  Building2,
  CalendarDays,
  Bath,
} from "lucide-react";
import { format } from "date-fns";
import PageSection from "./PageSection";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";
import { isFieldSet } from "@/utils/property/isFieldSet";

interface Property {
  bhk: string | null;
  square_footage: number | null;
  super_built_up_area: number | null;
  furnishing: string | null;
  floor_number: number | null;
  total_floors: number | null;
  available_from: string | null;
  bathrooms: number | null;
  possession_status: string | null;
  listing_type: string | null;
}

interface Tile {
  key: string;
  icon: LucideIcon;
  value: string;
  label: string;
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return format(new Date(iso + (iso.includes("T") ? "" : "T00:00:00")), "d MMM");
  } catch {
    return null;
  }
}

function floorValue(p: Property): string | null {
  const hasFloor = p.floor_number !== null && p.floor_number !== undefined;
  const hasTotal = p.total_floors !== null && p.total_floors !== undefined;
  if (!hasFloor && !hasTotal) return null;
  const floor = hasFloor ? String(p.floor_number) : "?";
  if (hasTotal) return `${floor} of ${p.total_floors}`;
  return floor;
}

function buildTiles(p: Property): Tile[] {
  const isSale = p.listing_type === "sale";
  const tiles: Tile[] = [];

  if (isFieldSet("bhk", p.bhk)) {
    tiles.push({
      key: "bhk",
      icon: Home,
      value: formatEnumLabel("bhk", p.bhk),
      label: "Type",
    });
  }

  if (isFieldSet("square_footage", p.square_footage)) {
    tiles.push({
      key: "square_footage",
      icon: Maximize2,
      value: `${p.square_footage} sq ft`,
      label: "Carpet area",
    });
  }

  if (isFieldSet("furnishing", p.furnishing)) {
    tiles.push({
      key: "furnishing",
      icon: Sofa,
      value: formatEnumLabel("furnishing", p.furnishing),
      label: "Furnishing",
    });
  }

  const floor = floorValue(p);
  if (floor !== null) {
    tiles.push({ key: "floor", icon: Building2, value: floor, label: "Floor" });
  }

  if (isSale) {
    // F2-E4: possession moved to PriceAndTerms card; no longer surfaced here.
    if (isFieldSet("super_built_up_area", p.super_built_up_area)) {
      tiles.push({
        key: "super_built_up_area",
        icon: Maximize2,
        value: `${p.super_built_up_area} sq ft`,
        label: "Super built-up",
      });
    }
  } else {
    const avail = fmtDate(p.available_from);
    if (avail) {
      tiles.push({
        key: "available_from",
        icon: CalendarDays,
        value: avail,
        label: "Available",
      });
    }
    if (isFieldSet("bathrooms", p.bathrooms)) {
      const n = p.bathrooms!;
      tiles.push({
        key: "bathrooms",
        icon: Bath,
        value: `${n} bath${n === 1 ? "" : "s"}`,
        label: "Bathrooms",
      });
    }
  }

  return tiles.slice(0, 6);
}

export default function AtAGlance({ property }: { property: Property }) {
  const tiles = buildTiles(property);
  if (tiles.length === 0) return null;

  return (
    <PageSection title="At a Glance">
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.key}
              className="flex flex-col gap-1 rounded-xl bg-muted/50 px-3 py-3"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-base font-semibold text-foreground">
                {t.value}
              </span>
              <span className="text-xs text-muted-foreground">{t.label}</span>
            </div>
          );
        })}
      </div>
    </PageSection>
  );
}
