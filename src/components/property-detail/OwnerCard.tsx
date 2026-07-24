/**
 * P6 About-the-Owner card for public viewers. Hidden for owner-viewing-own
 * (OwnerPerformanceStrip replaces it). Reads all data from useOwnerCard.
 */
import { Link } from "react-router-dom";
import { User, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import PageSection from "./PageSection";
import { useOwnerCard } from "@/hooks/useOwnerCard";
import { LISTER_ROLE_BADGE } from "./listerRoleBadge";

interface Props {
  ownerId: string;
  isOwnProperty: boolean;
  // F3-C18: colour-coded role badge alongside the display name.
  listerRole?: string | null;
}

export default function OwnerCard({ ownerId, isOwnProperty, listerRole }: Props) {
  const { displayName, profilePhotoUrl, isNew, allTimeHandled, allTimeRate, ratingSummary, isLoading } =
    useOwnerCard(ownerId);

  if (isOwnProperty) return null;

  const initial = displayName?.trim().charAt(0).toUpperCase() ?? "?";

  return (
    <PageSection title="About the Owner" icon={User} background="muted">
      <div className="flex items-start gap-3">
        {profilePhotoUrl ? (
          <img
            src={profilePhotoUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-base font-semibold text-muted-foreground">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {displayName ?? "Owner"}
              </p>
            )}
            {isNew && !isLoading ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                <Sparkles className="h-3 w-3" /> New on Reeve
              </span>
            ) : null}
            {listerRole && LISTER_ROLE_BADGE[listerRole] ? (
              <span className={cn(
                "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
                LISTER_ROLE_BADGE[listerRole].className,
              )}>
                {LISTER_ROLE_BADGE[listerRole].label}
              </span>
            ) : null}
          </div>
          {isLoading ? (
            <Skeleton className="mt-2 h-3 w-40" />
          ) : (
            <>
              {!isNew && allTimeHandled > 0 ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Responds to {allTimeRate}% · {allTimeHandled} handled
                </p>
              ) : null}
              {/* F1F-3: only show once there are 3+ ratings (statistical floor). */}
              {ratingSummary && ratingSummary.total >= 3 ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {ratingSummary.dealAgainPct}% would deal again · {ratingSummary.total} ratings
                </p>
              ) : null}
            </>
          )}
        </div>
        <Link
          to={`/u/${ownerId}`}
          className="shrink-0 text-sm font-medium text-primary"
        >
          View Profile →
        </Link>
      </div>
    </PageSection>
  );
}
