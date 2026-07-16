import { getStatusDisplay } from "@/lib/propertyStatus";
import { BHK_OPTIONS } from "@/config/property-form";
import { cn } from "@/lib/utils";

interface Props {
  property: {
    id: string;
    building_name: string | null;
    locality: string | null;
    city: string | null;
    bhk: string | null;
    listed_rent: number | null;
    status: string;
    is_active: boolean;
    created_at: string;
    // Prompt 10b (D-162) — optional so callers not yet passing it don't break.
    // Fail-safe: absent / null → treated as rent.
    listing_type?: string | null;
  };
  primaryPhotoUrl: string | null;
  onClick: () => void;
}

const bhkLabel = (v: string | null): string =>
  v ? BHK_OPTIONS.find((o) => o.value === v)?.label ?? v : "";

const formatRupees = (n: number | null): string =>
  n && n > 0 ? "₹" + n.toLocaleString("en-IN") : "";

export default function PropertyCard({ property, primaryPhotoUrl, onClick }: Props) {
  const status = getStatusDisplay(property.status);
  const bhk = bhkLabel(property.bhk);
  const title = [bhk, property.building_name].filter(Boolean).join(" · ") || "Property";
  const subtitle = [property.locality, property.city].filter(Boolean).join(", ");
  const rent = formatRupees(property.listed_rent);

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[16/9] bg-muted relative">
        {primaryPhotoUrl ? (
          <img
            src={primaryPhotoUrl}
            alt={property.building_name ?? "Property"}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            No photo yet
          </div>
        )}
        <span className={cn(
          "absolute top-2 right-2 rounded-full border px-2 py-0.5 text-[10px] font-medium bg-white/90 backdrop-blur",
          status.color,
        )}>
          {status.label}
        </span>
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-foreground truncate flex-1">{title}</p>
          {/* Prompt 10b (D-162) — small listing-type chip; muted so status badge dominates. */}
          <span className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {property.listing_type === "sale" ? "For Sale" : "For Rent"}
          </span>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
        <div className="flex items-baseline justify-between gap-2">
          {rent ? (
            <p className="text-sm text-foreground">
              {rent}<span className="text-xs text-muted-foreground">/mo</span>
            </p>
          ) : (
            <span className="text-xs text-muted-foreground italic">Rent not set</span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground italic truncate">{status.nextAction}</p>
      </div>
    </button>
  );
}
