/**
 * P5 furnishing detail chips. Hidden entirely for unfurnished listings or
 * when the furnishing_detail array is empty.
 */
import { useState } from "react";
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
  const raw = Array.isArray(furnishingDetail)
    ? (furnishingDetail as FurnishingDetailItem[])
    : [];
  if (raw.length === 0) return null;
  // F1-B2f: alphabetical by label.
  const items = [...raw].sort((a, b) => labelFor(a.item).localeCompare(labelFor(b.item)));
  // F1-B5b: mobile first-4 collapse; desktop always shows all.
  const MOBILE_INITIAL = 4;
  const hiddenMobile = Math.max(0, items.length - MOBILE_INITIAL);

  return (
    <PageSection title="What's Included" icon={Sofa}>
      <FurnitureGrid items={items} mobileInitial={MOBILE_INITIAL} hiddenMobile={hiddenMobile} />
    </PageSection>
  );
}

function FurnitureGrid({
  items,
  mobileInitial,
  hiddenMobile,
}: {
  items: FurnishingDetailItem[];
  mobileInitial: number;
  hiddenMobile: number;
}) {
  const [showAllMobile, setShowAllMobile] = useState(false);
  const mobileItems = showAllMobile ? items : items.slice(0, mobileInitial);
  const render = (list: FurnishingDetailItem[]) => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {list.map((f, idx) => {
          const Icon = ICONS[f.item] ?? Check;
          const label = labelFor(f.item);
          const count = typeof f.count === "number" && f.count > 1 ? f.count : null;
          // F1-B2e: surface owner-authored size/rooms as a subtitle.
          const size = f.size?.trim() || null;
          const rooms = f.rooms?.trim() && f.rooms.trim() !== size ? f.rooms.trim() : null;
          const subtitle = [size, rooms].filter(Boolean).join(" · ");
          return (
            <div
              key={`${f.item}-${idx}`}
              className="flex flex-col rounded-xl border bg-background px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-[14px] w-[14px] text-muted-foreground" />
                <span className="text-foreground">{label}</span>
                {count ? (
                  <span className="ml-auto text-xs font-medium text-muted-foreground">
                    × {count}
                  </span>
                ) : null}
              </div>
              {subtitle ? (
                <p className="mt-0.5 pl-6 text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          );
        })}
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        {render(mobileItems)}
        {hiddenMobile > 0 && (
          <button
            type="button"
            onClick={() => setShowAllMobile((v) => !v)}
            className="mt-3 text-sm font-medium text-primary"
          >
            {showAllMobile ? "Show less" : `Show more (${hiddenMobile} more)`}
          </button>
        )}
      </div>
      <div className="hidden lg:block">
        {render(items)}
      </div>
    </>
  );
}
