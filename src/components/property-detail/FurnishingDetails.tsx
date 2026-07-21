/**
 * P5 furnishing detail chips. Hidden entirely for unfurnished listings or
 * when the furnishing_detail array is empty.
 */
import type { LucideIcon } from "lucide-react";
import {
  Bed,
  Sofa,
  AirVent,
  Package,
  Droplets,
  Refrigerator,
  WashingMachine,
  Tv,
  UtensilsCrossed,
  Microwave,
  ChefHat,
  Layers,
  Wind,
  Flame,
  Check,
} from "lucide-react";
import PageSection from "./PageSection";

interface FurnishingDetailItem {
  item: string;
  count?: number;
  size?: string;
  rooms?: string;
}

interface Props {
  furnishing: string | null;
  furnishingDetail: unknown;
}

const LABELS: Record<string, string> = {
  bed: "Bed",
  mattress: "Mattress",
  ac: "AC",
  wardrobe: "Wardrobe",
  geyser: "Geyser",
  fridge: "Fridge",
  washing_machine: "Washing Machine",
  tv: "TV",
  sofa: "Sofa",
  dining_table: "Dining Table",
  microwave: "Microwave",
  modular_kitchen: "Modular Kitchen",
  water_purifier: "Water Purifier",
  curtain_rod: "Curtain Rod",
  curtains: "Curtains",
  stove: "Stove",
  chimney: "Chimney",
  fan: "Fan",
  exhaust_fan: "Exhaust Fan",
};

const ICONS: Record<string, LucideIcon> = {
  bed: Bed,
  mattress: Bed,
  sofa: Sofa,
  ac: AirVent,
  wardrobe: Package,
  geyser: Droplets,
  fridge: Refrigerator,
  washing_machine: WashingMachine,
  tv: Tv,
  dining_table: UtensilsCrossed,
  microwave: Microwave,
  modular_kitchen: ChefHat,
  water_purifier: Droplets,
  curtains: Layers,
  curtain_rod: Layers,
  stove: Flame,
  chimney: Wind,
  fan: Wind,
  exhaust_fan: Wind,
};

function labelFor(key: string): string {
  if (LABELS[key]) return LABELS[key];
  return key
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function FurnishingDetails({ furnishing, furnishingDetail }: Props) {
  if (furnishing === "unfurnished") return null;
  const items = Array.isArray(furnishingDetail)
    ? (furnishingDetail as FurnishingDetailItem[])
    : [];
  if (items.length === 0) return null;

  return (
    <PageSection title="What's Included" icon={Sofa}>
      <div className="flex flex-wrap gap-2">
        {items.map((f, idx) => {
          const Icon = ICONS[f.item] ?? Check;
          const label = labelFor(f.item);
          const count = typeof f.count === "number" && f.count > 1 ? f.count : null;
          return (
            <div
              key={`${f.item}-${idx}`}
              className="inline-flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm"
            >
              <Icon className="h-[14px] w-[14px] text-muted-foreground" />
              <span className="text-foreground">{label}</span>
              {count ? (
                <span className="ml-1 text-xs font-medium text-muted-foreground">
                  × {count}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </PageSection>
  );
}
