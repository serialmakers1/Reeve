/**
 * P6 desktop sticky sidebar. Owns the CTA on ≥lg viewports (PropertyCTABar
 * covers <lg via `lg:hidden`). Mirrors PropertyCTABar's 7-state CTA logic via
 * useContactRequestStatus so both surfaces stay in sync via TanStack cache.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, MessageCircle, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerCard } from "@/hooks/useOwnerCard";
import { useContactRequestStatus } from "@/hooks/useContactRequestStatus";
import { formatSalePrice } from "@/utils/property/formatSalePrice";

interface PropertyLike {
  id: string;
  listing_type: string | null;
  listed_rent: number | null;
  sale_price: number | null;
  security_deposit_amount: number | null;
}

interface Props {
  property: PropertyLike;
  ownerId: string;
  isOwnProperty: boolean;
  isAuthenticated: boolean;
  // P7B Fix A: passed through from PropertyDetail's already-fetched
  // get_property_public_stats RPC — no new fetch inside the sidebar.
  viewCount: number;
  commentCount: number;
}

function fmtINR(v: number): string {
  return `₹${v.toLocaleString("en-IN")}`;
}

function scrollToPanel() {
  const el = document.getElementById("contact-panel");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function usePendingContactCount(propertyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["pendingContactsCount", propertyId],
    enabled,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<number> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sb = supabase as unknown as { from: (t: string) => any };
      const { count, error } = await sb
        .from("contact_requests")
        .select("id", { count: "exact", head: true })
        .eq("property_id", propertyId)
        .eq("status", "pending");
      if (error) throw error;
      return typeof count === "number" ? count : 0;
    },
  });
}

function OwnerStatRow({
  views,
  qas,
  pending,
}: {
  views: number;
  qas: number;
  pending: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Eye className="h-3.5 w-3.5" /> {views} views
      </span>
      <span className="inline-flex items-center gap-1">
        <MessageCircle className="h-3.5 w-3.5" /> {qas} Q&amp;As
      </span>
      <span className="inline-flex items-center gap-1">
        <Mail className="h-3.5 w-3.5" /> {pending} pending
      </span>
    </div>
  );
}

export default function PropertySidebar({
  property,
  ownerId,
  isOwnProperty,
  isAuthenticated,
  viewCount,
  commentCount,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const owner = useOwnerCard(ownerId);
  const { status, attemptCount, isLoading: statusLoading } = useContactRequestStatus(
    property.id,
    isAuthenticated && !isOwnProperty,
  );
  const pending = usePendingContactCount(property.id, isOwnProperty);

  const price =
    property.listing_type === "sale"
      ? (() => {
          const formatted = formatSalePrice(property.sale_price);
          return formatted ? { primary: formatted, suffix: undefined as string | undefined } : null;
        })()
      : typeof property.listed_rent === "number" && property.listed_rent > 0
        ? { primary: fmtINR(property.listed_rent), suffix: "/month" }
        : null;

  const depositLine =
    typeof property.security_deposit_amount === "number" && property.security_deposit_amount > 0
      ? `${fmtINR(property.security_deposit_amount)} deposit`
      : null;

  // ─── CTA state machine (owner + auth + status + attempts) ────────────────
  let ctaLabel = "Request Contact";
  let ctaDisabled = false;
  let ctaOnClick: () => void = scrollToPanel;
  if (isOwnProperty) {
    ctaLabel = "Manage Listing →";
    ctaOnClick = () => navigate("/owner-dashboard");
  } else if (!isAuthenticated) {
    ctaLabel = "Sign in to Request";
    ctaOnClick = () =>
      navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`);
  } else if (status === "approved") {
    ctaLabel = "Sent via Email ✓";
  } else if (status === "pending") {
    ctaLabel = "Pending · View request";
  } else if (attemptCount >= 3) {
    ctaLabel = "Limit Reached";
    ctaDisabled = true;
    ctaOnClick = () => {};
  } else if (attemptCount >= 1) {
    ctaLabel = "Request Again";
  }

  const initial =
    owner.displayName?.trim().charAt(0).toUpperCase() ?? "?";

  return (
    <aside className="sticky top-20 overflow-hidden rounded-2xl border bg-background shadow-sm">
      {/* Price */}
      <div className="px-5 pt-5 pb-4">
        {price ? (
          <>
            <div>
              <span className="text-2xl font-bold text-foreground">{price.primary}</span>
              {price.suffix ? (
                <span className="ml-1 text-sm text-muted-foreground">{price.suffix}</span>
              ) : null}
            </div>
            {depositLine ? (
              <p className="mt-1 text-xs text-muted-foreground">{depositLine}</p>
            ) : null}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">Contact owner for price</span>
        )}
      </div>

      {/* Owner strip */}
      <div className="border-t px-5 py-4">
        <div className="flex items-center gap-3">
          {owner.profilePhotoUrl ? (
            <img
              src={owner.profilePhotoUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {owner.isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <p className="truncate text-sm font-medium text-foreground">
                {owner.displayName ?? "Owner"}
              </p>
            )}
            {owner.isLoading ? (
              <Skeleton className="mt-1 h-3 w-32" />
            ) : owner.isNew ? (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-700">
                <Sparkles className="h-3 w-3" /> New on Reeve
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Responds to {owner.allTimeRate}% · {owner.allTimeHandled} handled
              </p>
            )}
          </div>
        </div>
      </div>

      {/* CTA / owner stats */}
      <div className="border-t bg-muted/30 px-5 py-4">
        {isOwnProperty ? (
          <>
            <OwnerStatRow
              views={viewCount}
              qas={commentCount}
              pending={pending.data ?? 0}
            />
            <Button
              onClick={ctaOnClick}
              className="mt-3 h-11 w-full rounded-full text-sm font-medium"
            >
              {ctaLabel}
            </Button>
          </>
        ) : (
          <>
            {statusLoading ? (
              <Skeleton className="h-12 w-full rounded-full" />
            ) : (
              <Button
                onClick={ctaOnClick}
                disabled={ctaDisabled}
                variant={ctaDisabled ? "secondary" : "default"}
                className="h-12 w-full rounded-full text-sm font-medium"
              >
                {ctaLabel}
              </Button>
            )}
            <p className="mt-2 text-center text-xs text-muted-foreground">
              If approved, you both receive each other&apos;s contact details. No charges.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
