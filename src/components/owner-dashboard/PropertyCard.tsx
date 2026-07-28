import { useState } from "react";
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
    listing_type?: string | null;
    availability_confirmed_at?: string | null;
  };
  primaryPhotoUrl: string | null;
  unansweredCount?: number;
  availabilityConfirmedAt?: string | null;
  nextConfirmationAt?: string | null;
  onConfirmAvailability?: () => void;
  onClick: () => void;
}

function AvailabilityArea({
  confirmedAt,
  nextAt,
  onConfirm,
}: {
  confirmedAt: string | null;
  nextAt: string | null;
  onConfirm: () => void;
}) {
  const [pending, setPending] = useState(false);
  const now = Date.now();
  const derivedNextAt = nextAt
    ? new Date(nextAt)
    : confirmedAt
    ? new Date(Date.parse(confirmedAt) + 7 * 86_400_000)
    : null;
  const isEligible = !derivedNextAt || derivedNextAt.getTime() <= now;
  const confirmedDaysAgo = confirmedAt
    ? Math.max(0, Math.floor((now - Date.parse(confirmedAt)) / 86_400_000))
    : null;
  const nextDateLabel = derivedNextAt
    ? derivedNextAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isEligible || pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pt-2 border-t border-border/60">
      {confirmedDaysAgo !== null && (
        <p className="text-[10px] text-muted-foreground mb-1">
          {confirmedDaysAgo === 0 ? "Confirmed available today" : `Confirmed ${confirmedDaysAgo}d ago`}
        </p>
      )}
      <button
        type="button"
        disabled={!isEligible || pending}
        onClick={handleClick}
        className={cn(
          "w-full rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
          isEligible && !pending
            ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
            : "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60",
        )}
      >
        {pending
          ? "Confirming…"
          : isEligible
          ? "Confirm still available"
          : `Next eligible: ${nextDateLabel}`}
      </button>
    </div>
  );
}

const bhkLabel = (v: string | null): string =>
  v ? BHK_OPTIONS.find((o) => o.value === v)?.label ?? v : "";

const formatRupees = (n: number | null): string =>
  n && n > 0 ? "₹" + n.toLocaleString("en-IN") : "";

export default function PropertyCard({
  property,
  primaryPhotoUrl,
  unansweredCount,
  availabilityConfirmedAt,
  nextConfirmationAt,
  onConfirmAvailability,
  onClick,
}: Props) {
  const status = getStatusDisplay(property.status);
  const bhk = bhkLabel(property.bhk);
  const title = [bhk, property.building_name].filter(Boolean).join(" · ") || "Property";
  const subtitle = [property.locality, property.city].filter(Boolean).join(", ");
  const rent = formatRupees(property.listed_rent);

  const canShowAvailability =
    property.listing_type === "rent" &&
    property.is_active &&
    (property.status === "listed" || property.status === "edit_pending_review") &&
    !!onConfirmAvailability;

  return (
    <div className="rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={onClick}
        className="text-left w-full"
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
          {typeof unansweredCount === "number" && unansweredCount >= 1 && (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              💬 {unansweredCount} unanswered
            </span>
          )}
        </div>
      </button>
      {canShowAvailability && (
        <div className="px-3 pb-3">
          <AvailabilityArea
            confirmedAt={availabilityConfirmedAt ?? null}
            nextAt={nextConfirmationAt ?? null}
            onConfirm={onConfirmAvailability!}
          />
        </div>
      )}
    </div>
  );
}
