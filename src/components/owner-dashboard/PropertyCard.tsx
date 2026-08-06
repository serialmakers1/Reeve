import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { getStatusDisplay } from "@/lib/propertyStatus";
import { BHK_OPTIONS } from "@/config/property-form";
import { formatSalePrice } from "@/utils/property/formatSalePrice";
import { computeFreshness, formatShortDate, type Freshness, type FreshnessState } from "@/lib/listingFreshness";
import StatusInfoButton from "@/components/owner-dashboard/StatusInfoButton";
import { cn } from "@/lib/utils";

interface CardProperty {
  id: string;
  building_name: string | null;
  locality: string | null;
  city: string | null;
  bhk: string | null;
  listed_rent: number | null;
  sale_price?: number | null;
  status: string;
  is_active: boolean;
  created_at: string;
  listing_type?: string | null;
  availability_confirmed_at?: string | null;
  sale_listing_confirmed_at?: string | null;
  current_listed_period_started_at?: string | null;
  listed_at?: string | null;
}

interface Props {
  property: CardProperty;
  primaryPhotoUrl: string | null;
  commentCount?: number;
  onConfirmAvailability?: () => void;
  onConfirmSale?: () => void;
  onRelist?: () => void;
  onClick: () => void;
}

// Per-state visuals. Colour is always paired with an icon + text label so state
// is never communicated by colour alone.
const STATE_STYLE: Record<Exclude<FreshnessState, "unknown">, { border: string; chip: string; label: string; Icon: typeof CheckCircle2 }> = {
  fresh:    { border: "border-green-500",  chip: "text-green-700 bg-green-50 border-green-200",   label: "Fresh",                 Icon: CheckCircle2 },
  reminder: { border: "border-amber-500",  chip: "text-amber-700 bg-amber-50 border-amber-200",   label: "Confirmation due soon", Icon: Clock },
  urgent:   { border: "border-orange-500", chip: "text-orange-700 bg-orange-50 border-orange-200", label: "Confirmation urgent",   Icon: AlertTriangle },
  overdue:  { border: "border-red-500",    chip: "text-red-700 bg-red-50 border-red-200",         label: "Confirmation overdue",  Icon: AlertTriangle },
};

function cardBorderClass(fresh: Freshness | null): string {
  if (fresh && fresh.state !== "unknown") return STATE_STYLE[fresh.state].border;
  return "";
}

function FreshnessArea({
  fresh,
  status,
  onConfirm,
}: {
  fresh: Freshness;
  status: string;
  onConfirm: () => void;
}) {
  const [pending, setPending] = useState(false);
  const isEditReview = status === "edit_pending_review";
  const style = fresh.state === "unknown" ? null : STATE_STYLE[fresh.state];
  const eligible = fresh.confirmEligible;

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!eligible || pending) return;
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pt-2 border-t border-border/60 space-y-1.5">
      {style && (
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium", style.chip)}>
          <style.Icon className="h-3 w-3" aria-hidden="true" />
          {style.label}
        </span>
      )}
      {fresh.daysSince !== null && (
        <p className="text-[10px] text-muted-foreground">
          {fresh.daysSince === 0 ? "Confirmed today" : `Confirmed ${fresh.daysSince}d ago`}
        </p>
      )}
      {/* Deadline — status-dependent. A listing under edit review never
          auto-unlists on the shown date. */}
      {fresh.autoUnlistAt && (
        isEditReview ? (
          <p className="text-[10px] text-muted-foreground">
            Freshness deadline: {formatShortDate(fresh.autoUnlistAt)}.{" "}
            {fresh.state === "overdue"
              ? "Overdue, but automatic unlisting only resumes once your edit review finishes and the listing is live again."
              : "Automatic unlisting applies only after the edit review finishes and the listing becomes live again."}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            {fresh.state === "overdue"
              ? "Confirmation overdue — confirm now to keep this listing live."
              : `Auto-unlists on ${formatShortDate(fresh.autoUnlistAt)}`}
          </p>
        )
      )}
      <button
        type="button"
        disabled={!eligible || pending}
        onClick={handleClick}
        className={cn(
          "w-full rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
          eligible && !pending
            ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
            : "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60",
        )}
      >
        {pending
          ? "Confirming…"
          : eligible
          ? "Confirm still available"
          : `Next confirmation from ${formatShortDate(fresh.nextConfirmAt)}`}
      </button>
    </div>
  );
}

function UnlistedArea({ onRelist }: { onRelist: () => void }) {
  const [pending, setPending] = useState(false);
  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      await onRelist();
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="pt-2 border-t border-border/60 space-y-1.5">
      <p className="text-[10px] text-muted-foreground">
        Not visible to tenants — re-list to make it live again.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className={cn(
          "w-full rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
          pending
            ? "border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60"
            : "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
        )}
      >
        {pending ? "Re-listing…" : "Re-list"}
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
  commentCount,
  onConfirmAvailability,
  onConfirmSale,
  onRelist,
  onClick,
}: Props) {
  const status = getStatusDisplay(property.status);
  const bhk = bhkLabel(property.bhk);
  const title = [bhk, property.building_name].filter(Boolean).join(" · ") || "Property";
  const subtitle = [property.locality, property.city].filter(Boolean).join(", ");
  const isSale = property.listing_type === "sale";
  const rent = formatRupees(property.listed_rent);
  const salePrice = formatSalePrice(property.sale_price);

  // Freshness only applies while publicly listed (or under edit review, where the
  // clock keeps running). Confirmation is per listing type.
  const showFreshness =
    property.is_active &&
    (property.status === "listed" || property.status === "edit_pending_review") &&
    (isSale ? !!onConfirmSale : !!onConfirmAvailability);
  const fresh = showFreshness
    ? computeFreshness({
        listingType: property.listing_type,
        availabilityConfirmedAt: property.availability_confirmed_at,
        saleListingConfirmedAt: property.sale_listing_confirmed_at,
        currentListedPeriodStartedAt: property.current_listed_period_started_at,
        listedAt: property.listed_at,
      })
    : null;

  const showRelist = property.status === "unlisted" && !!onRelist;

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden hover:shadow-md transition-shadow",
      cardBorderClass(fresh),
    )}>
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
            {isSale ? (
              salePrice ? (
                <p className="text-sm text-foreground">{salePrice}</p>
              ) : (
                <span className="text-xs text-muted-foreground italic">Sale price not set</span>
              )
            ) : rent ? (
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

      {/* Footer row — siblings of the navigation button (never nested), so the
          comments link and info trigger can't fire card navigation. */}
      <div className="flex items-center justify-between gap-2 px-3 pb-3 flex-wrap">
        <Link
          to={`/property/${property.id}#comments`}
          onClick={(e) => e.stopPropagation()}
          aria-label={`View comments on this listing (${commentCount ?? 0})`}
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {(commentCount ?? 0) === 1 ? "1 comment" : `${commentCount ?? 0} comments`}
        </Link>
        <StatusInfoButton status={property.status} />
      </div>

      {fresh && (
        <div className="px-3 pb-3">
          <FreshnessArea
            fresh={fresh}
            status={property.status}
            onConfirm={isSale ? onConfirmSale! : onConfirmAvailability!}
          />
        </div>
      )}

      {showRelist && (
        <div className="px-3 pb-3">
          <UnlistedArea onRelist={onRelist!} />
        </div>
      )}
    </div>
  );
}
