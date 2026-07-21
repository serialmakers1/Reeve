/**
 * P5 building amenities. Renders only checked amenities as icon chips.
 * < 3 amenities → inline chip row without section header.
 * ≥ 3 amenities → full PageSection.
 * Empty → returns null.
 */
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpDown,
  ShieldCheck,
  Battery,
  Dumbbell,
  Waves,
  Building,
  Car,
  Camera,
  Gamepad2,
  Phone,
  Trees,
  Wrench,
  Lock,
  Flower2,
  Trophy,
  Users,
  Droplets,
  Zap,
  Trash2,
  HelpCircle,
} from "lucide-react";
import PageSection from "./PageSection";
import { BUILDING_AMENITIES } from "@/config/property-form";
import { normalizeAmenities } from "@/utils/property/normalizeAmenities";

const ICON_MAP: Record<string, LucideIcon> = {
  ArrowUpDown, ShieldCheck, Battery, Dumbbell, Waves, Building, Car, Camera,
  Gamepad2, Phone, Trees, Wrench, Lock, Flower2, Trophy, Users, Droplets, Zap,
  Trash2,
};

interface CatalogEntry {
  label: string;
  icon: LucideIcon;
}

const CATALOG: Record<string, CatalogEntry> = Object.fromEntries(
  BUILDING_AMENITIES.map((a) => [
    a.value,
    { label: a.label, icon: ICON_MAP[a.icon] ?? HelpCircle },
  ]),
);

interface Props {
  amenities: unknown;
}

function Chips({ values }: { values: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => {
        const entry = CATALOG[v] ?? { label: v, icon: HelpCircle };
        const Icon = entry.icon;
        return (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-sm text-foreground"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {entry.label}
          </span>
        );
      })}
    </div>
  );
}

export default function BuildingAmenities({ amenities }: Props) {
  const values = normalizeAmenities(amenities).building;
  if (values.length === 0) return null;

  if (values.length < 3) {
    return (
      <section className="px-4 py-3 lg:px-0">
        <Chips values={values} />
      </section>
    );
  }

  return (
    <PageSection title="Building Amenities" icon={Building}>
      <CollapsibleChips values={values} />
    </PageSection>
  );
}

// F1-B5c: mobile first-4 collapse; desktop always shows all.
function CollapsibleChips({ values }: { values: string[] }) {
  const [showAllMobile, setShowAllMobile] = useState(false);
  const MOBILE_INITIAL = 4;
  const hiddenMobile = Math.max(0, values.length - MOBILE_INITIAL);
  const mobileValues = showAllMobile ? values : values.slice(0, MOBILE_INITIAL);
  return (
    <>
      <div className="lg:hidden">
        <Chips values={mobileValues} />
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
        <Chips values={values} />
      </div>
    </>
  );
}
