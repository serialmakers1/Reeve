import { useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Heart, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";
import { writePendingIntent } from "@/features/search/state/pendingSearchIntent";
import { useSearchState } from "@/features/search/state/useSearchState";
import { resolveDisplayPrice } from "@/features/search/resolvers/priceResolver";
import { resolveComparisonFacts } from "@/features/search/resolvers/comparisonFactsResolver";
import { resolveContextualSignal } from "@/features/search/resolvers/contextualSignalResolver";
import { VIEW_COUNT_MIN_DISPLAY } from "@/features/search/domain/searchConstants";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80";

const LISTER_ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  broker: "Broker",
  property_manager: "Property Manager",
  builder: "Builder",
};

function daysAgo(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86_400_000));
}

function freshnessLabel(result: SearchPropertyResult): string | null {
  if (result.availabilityConfirmedAt) {
    const d = daysAgo(result.availabilityConfirmedAt);
    return d === 0 ? "Avail. confirmed today" : `Avail. confirmed ${d}d ago`;
  }
  if (result.listedAt) {
    const d = daysAgo(result.listedAt);
    return d === 0 ? "Listed today" : `Listed ${d}d ago`;
  }
  return null;
}

interface SearchPropertyCardProps {
  result: SearchPropertyResult;
  layout?: "vertical" | "horizontal";
  isSelected?: boolean;
  isFirstVisible?: boolean;
  onHover?: (id: string | null) => void;
  onRegisterRef?: (id: string, el: HTMLDivElement | null) => void;
  isFavourited: (id: string) => boolean;
  onToggleFavourite: (id: string, surface: "list" | "split" | "map") => void;
  isLoggedIn: boolean;
  onListingOpen?: (id: string, surface: "list" | "split") => void;
}

export function SearchPropertyCard({
  result,
  layout = "vertical",
  isSelected,
  isFirstVisible = false,
  onHover,
  onRegisterRef,
  isFavourited,
  onToggleFavourite,
  isLoggedIn,
  onListingOpen,
}: SearchPropertyCardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedPropertyId } = useSearchState();
  const [imgSrc, setImgSrc] = useState(result.primaryImageUrl || PLACEHOLDER_IMG);

  // Surface derived from layout — horizontal = desktop Split, vertical = List
  const surface = layout === "horizontal" ? "split" : "list" as const;
  const isFav = isFavourited(result.id);
  const displayPrice = resolveDisplayPrice(result);
  const facts = resolveComparisonFacts(result, result.listingMode);
  const signal = resolveContextualSignal(result);
  const freshness = freshnessLabel(result);
  const roleLabel = LISTER_ROLE_LABELS[result.listerRole] ?? result.listerRole;

  const imageAlt =
    [result.bhk, result.propertyType, result.buildingName ? `in ${result.buildingName}` : null]
      .filter(Boolean)
      .join(" ") || "Property listing";

  const registerRef = useCallback(
    (el: HTMLDivElement | null) => {
      onRegisterRef?.(result.id, el);
    },
    [result.id, onRegisterRef],
  );

  // Build the canonical return URL with pid so Phase 11/12 restoration fires on return
  const returnTo = (() => {
    const params = new URLSearchParams(location.search);
    params.set("pid", result.id);
    return location.pathname + "?" + params.toString();
  })();

  function handleFavourite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      writePendingIntent(result.id, returnTo);
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    onToggleFavourite(result.id, surface);
  }

  return (
    <article
      ref={registerRef}
      className={cn(
        "relative bg-white border-b last:border-b-0",
        isSelected && "ring-2 ring-inset ring-primary",
        layout === "horizontal" && "desk:flex desk:flex-row desk:h-[140px]",
      )}
      onMouseEnter={() => onHover?.(result.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(result.id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onHover?.(null);
        }
      }}
    >
      {/* Favourite — sibling of Link, absolutely positioned over image */}
      <button
        onClick={handleFavourite}
        aria-label={isFav ? "Remove from favourites" : "Save to favourites"}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white"
      >
        <Heart
          className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : ""}`}
        />
      </button>

      <Link
        to={result.detailUrl}
        state={{ fromSearch: returnTo }}
        onClick={() => {
          setSelectedPropertyId(result.id);
          onListingOpen?.(result.id, surface);
        }}
        className={cn("block", layout === "horizontal" && "desk:flex desk:flex-row desk:flex-1")}
      >
        {/* Image */}
        <div className={cn(
          "relative overflow-hidden bg-muted",
          layout === "horizontal"
            ? "h-36 desk:h-full desk:w-[180px] desk:shrink-0"
            : "h-36",
        )}>
          <img
            src={imgSrc}
            alt={imageAlt}
            loading={isFirstVisible ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setImgSrc(PLACEHOLDER_IMG)}
          />

          {/* Photo count — top-left */}
          {result.photoCount > 1 && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
              <Camera className="h-3 w-3" />
              {result.photoCount}
            </span>
          )}

          {/* Price — bottom-left over gradient */}
          {displayPrice && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-6">
              <span className="text-sm font-semibold text-white">
                {displayPrice.primary}
              </span>
              {displayPrice.isTotalMonthly && (
                <span className="ml-1 text-[10px] text-white/80">total</span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-1 p-2.5 flex-1 min-w-0">
          {/* BHK + type */}
          <p className="text-sm font-semibold leading-tight">
            {[result.bhk, result.propertyType].filter(Boolean).join(" · ") || "Property"}
          </p>

          {/* Building name */}
          <p className="truncate text-xs leading-tight text-foreground/80">
            {result.buildingName}
          </p>

          {/* Locality / city */}
          {(result.locality || result.city) && (
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {result.locality ?? result.city}
            </p>
          )}

          {/* Comparison facts */}
          {facts.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {facts.map((f) => (
                <span
                  key={f.label}
                  className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {f.label}
                </span>
              ))}
            </div>
          )}

          {/* Contextual signal */}
          {signal && (
            <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {signal.displayValue}
            </span>
          )}

          {/* Lister row */}
          <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px] text-muted-foreground">
            <span>{roleLabel}</span>
            {result.isNewOnReeve && (
              <span className="rounded-full border border-border bg-muted px-1.5 py-0.5">
                New on Reeve
              </span>
            )}
            {result.responseRatePct !== null && (
              <span>· Responds to {result.responseRatePct}%</span>
            )}
          </div>

          {/* Footer: view count + freshness */}
          <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
            <span>
              {result.viewCount >= VIEW_COUNT_MIN_DISPLAY
                ? `${result.viewCount} views`
                : ""}
            </span>
            {freshness && <span>{freshness}</span>}
          </div>
        </div>
      </Link>
    </article>
  );
}
