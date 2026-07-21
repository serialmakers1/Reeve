/**
 * P5 Tier-2 "All details" — accordion on mobile, always-open on desktop.
 * Every tile is null-skipped via isFieldSet.
 */
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  Wind,
  Compass,
  Clock,
  Lock,
  Bell,
  TrendingUp,
  Droplets,
  KeyRound,
  Car,
  Bike,
  PawPrint,
  Maximize2,
  FileCheck,
  FileText,
  Receipt,
  CalendarCheck,
  ChevronDown,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";
import { isFieldSet } from "@/utils/property/isFieldSet";

interface Property {
  balconies: number | null;
  facing: string | null;
  building_age_years: number | null;
  lock_in_months: number | null;
  notice_period_days: number | null;
  annual_rent_increase_pct: number | null;
  water_storage: string | null;
  water_source: string[] | null;
  main_door_lock_type: string | null;
  parking_4w: string | null;
  parking_4w_count: number | null;
  parking_2w: string | null;
  parking_2w_count: number | null;
  pet_policy: string | null;
  super_built_up_area: number | null;
  rera_registration_number: string | null;
  khata_type: string | null;
  property_tax_paid_upto: string | null;
  possession_status: string | null;
  possession_date: string | null;
  listing_type: string | null;
}

const WATER_SOURCE_LABELS: Record<string, string> = {
  municipal: "Municipal supply",
  borewell: "Borewell",
  tanker: "Water tanker",
  rainwater_harvesting: "Rainwater harvesting",
  packaged: "Packaged / RO water",
  open_well: "Open well",
};

interface TileConfig {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
  copyable?: string;
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return format(new Date(iso + (iso.includes("T") ? "" : "T00:00:00")), "d MMM yyyy");
  } catch {
    return null;
  }
}

function parkingRow(
  enumVal: string | null,
  count: number | null,
  label: string,
  icon: LucideIcon,
  key: string,
): TileConfig | null {
  if (!enumVal || enumVal === "none") return null;
  const parts: string[] = [formatEnumLabel(key === "car" ? "parking_4w" : "parking_2w", enumVal)];
  if (count !== null && count !== undefined && count > 0) {
    parts.push(`${count} slot${count === 1 ? "" : "s"}`);
  }
  return { key, icon, label, value: parts.join(" · ") };
}

function buildTiles(p: Property): TileConfig[] {
  const tiles: TileConfig[] = [];

  // balconies — 0 valid
  if (isFieldSet("balconies", p.balconies)) {
    const n = p.balconies!;
    tiles.push({
      key: "balconies",
      icon: Wind,
      label: "Balconies",
      value: `${n} balcon${n === 1 ? "y" : "ies"}`,
    });
  }

  if (isFieldSet("facing", p.facing)) {
    tiles.push({
      key: "facing",
      icon: Compass,
      label: "Facing",
      value: formatEnumLabel("facing", p.facing),
    });
  }

  if (isFieldSet("building_age_years", p.building_age_years)) {
    const n = p.building_age_years!;
    tiles.push({
      key: "building_age_years",
      icon: Clock,
      label: "Building age",
      value: n === 0 ? "New construction" : `~${n} yr${n === 1 ? "" : "s"}`,
    });
  }

  if (isFieldSet("lock_in_months", p.lock_in_months)) {
    const n = p.lock_in_months!;
    tiles.push({
      key: "lock_in_months",
      icon: Lock,
      label: "Lock-in",
      value: n === 0 ? "No lock-in" : `${n} months`,
    });
  }

  if (isFieldSet("notice_period_days", p.notice_period_days)) {
    const n = p.notice_period_days!;
    tiles.push({
      key: "notice_period_days",
      icon: Bell,
      label: "Notice period",
      value: n === 0 ? "No notice" : `${n} days`,
    });
  }

  if (isFieldSet("annual_rent_increase_pct", p.annual_rent_increase_pct)) {
    const n = p.annual_rent_increase_pct!;
    tiles.push({
      key: "annual_rent_increase_pct",
      icon: TrendingUp,
      label: "Rent increase",
      value: n === 0 ? "No annual hike" : `${n}% / year`,
    });
  }

  if (isFieldSet("water_storage", p.water_storage)) {
    tiles.push({
      key: "water_storage",
      icon: Droplets,
      label: "Water storage",
      value: formatEnumLabel("water_storage", p.water_storage),
    });
  }

  if (Array.isArray(p.water_source) && p.water_source.length > 0) {
    tiles.push({
      key: "water_source",
      icon: Droplets,
      label: "Water source",
      value: p.water_source.map((v) => WATER_SOURCE_LABELS[v] ?? v).join(" · "),
    });
  }

  if (isFieldSet("main_door_lock_type", p.main_door_lock_type)) {
    tiles.push({
      key: "main_door_lock_type",
      icon: KeyRound,
      label: "Door lock",
      value: formatEnumLabel("main_door_lock_type", p.main_door_lock_type),
    });
  }

  const car = parkingRow(p.parking_4w, p.parking_4w_count, "Car parking", Car, "car");
  if (car) tiles.push(car);
  const bike = parkingRow(p.parking_2w, p.parking_2w_count, "Bike parking", Bike, "bike");
  if (bike) tiles.push(bike);

  if (isFieldSet("pet_policy", p.pet_policy)) {
    tiles.push({
      key: "pet_policy",
      icon: PawPrint,
      label: "Pets",
      value: formatEnumLabel("pet_policy", p.pet_policy),
    });
  }

  if (isFieldSet("super_built_up_area", p.super_built_up_area)) {
    tiles.push({
      key: "super_built_up_area",
      icon: Maximize2,
      label: "Super built-up",
      value: `${p.super_built_up_area} sq ft`,
    });
  }

  if (isFieldSet("rera_registration_number", p.rera_registration_number)) {
    tiles.push({
      key: "rera_registration_number",
      icon: FileCheck,
      label: "RERA",
      value: p.rera_registration_number!,
      copyable: p.rera_registration_number!,
    });
  }

  if (isFieldSet("khata_type", p.khata_type)) {
    tiles.push({
      key: "khata_type",
      icon: FileText,
      label: "Khata",
      value: formatEnumLabel("khata_type", p.khata_type),
    });
  }

  const propTaxDate = fmtDate(p.property_tax_paid_upto);
  if (propTaxDate) {
    tiles.push({
      key: "property_tax_paid_upto",
      icon: Receipt,
      label: "Property tax paid",
      value: propTaxDate,
    });
  }

  if (p.listing_type === "sale" && isFieldSet("possession_status", p.possession_status)) {
    const label = formatEnumLabel("possession_status", p.possession_status);
    const dt = fmtDate(p.possession_date);
    tiles.push({
      key: "possession",
      icon: CalendarCheck,
      label: "Possession",
      value: dt ? `${label} · ${dt}` : label,
    });
  }

  return tiles;
}

export default function AllDetailsAccordion({ property }: { property: Property }) {
  const tiles = buildTiles(property);
  const { toast } = useToast();
  // Collapsed on mobile, open on desktop.
  const [openMobile, setOpenMobile] = useState(false);

  if (tiles.length === 0) return null;

  const copy = (val: string) => {
    navigator.clipboard
      ?.writeText(val)
      .then(() => toast({ description: "RERA number copied" }))
      .catch(() => { /* clipboard blocked — silent */ });
  };

  const Grid = (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.key}
            className="flex flex-col gap-1 rounded-xl bg-muted/50 px-3 py-3"
          >
            <div className="flex items-center justify-between">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {t.copyable ? (
                <button
                  type="button"
                  onClick={() => copy(t.copyable!)}
                  aria-label="Copy"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <span className="break-words text-sm font-semibold text-foreground">
              {t.value}
            </span>
            <span className="text-xs text-muted-foreground">{t.label}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <section className="px-4 py-5 lg:px-0">
      {/* Mobile: collapsed toggle */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpenMobile((v) => !v)}
          className="mb-3 flex w-full items-center justify-between"
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            All details <span className="ml-1 text-muted-foreground/70">({tiles.length})</span>
          </h2>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              openMobile && "rotate-180",
            )}
          />
        </button>
        {openMobile ? Grid : null}
      </div>
      {/* Desktop: always expanded */}
      <div className="hidden lg:block">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          All details <span className="ml-1 text-muted-foreground/70">({tiles.length})</span>
        </h2>
        {Grid}
      </div>
    </section>
  );
}
