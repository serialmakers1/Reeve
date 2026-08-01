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
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";

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

const FACT_CHIP =
  "rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground";

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

  const isHorizontal = layout === "horizontal";
  // Surface derived from layout — horizontal = desktop Split, vertical = List
  const surface = isHorizontal ? "split" : ("list" as const);
  const isFav = isFavourited(result.id);
  const displayPrice = resolveDisplayPrice(result);
  const facts = resolveComparisonFacts(result, result.listingMode);
  const visibleFacts = isHorizontal ? facts.slice(0, 2) : facts;
  const signal = resolveContextualSignal(result);
  const freshness = freshnessLabel(result);
  const roleLabel = LISTER_ROLE_LABELS[result.listerRole] ?? formatEnumLabel("lister_role", result.listerRole);

  const bhkLabel = formatEnumLabel("bhk", result.bhk);
  const typeLabel = formatEnumLabel("property_type", result.propertyType);
  const titleLine = [bhkLabel, typeLabel].filter(Boolean).join(" · ") || "Property";

  const imageAlt = [bhkLabel, typeLabel, result.buildingName ? `in ${result.buildingName}` : null]
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

  const priceBlock = displayPrice && (
    <div className="leading-tight">
      <p className={cn("font-bold text-foreground", isHorizontal ? "text-base" : "text-lg")}>
        {displayPrice.amount}
        {displayPrice.unit && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">{displayPrice.unit}</span>
        )}
      </p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {displayPrice.label}
      </p>
    </div>
  );

  return (
    <article
      ref={registerRef}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card transition-shadow",
        "focus-within:ring-2 focus-within:ring-primary/40 hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        isHorizontal && "desk:flex desk:h-[132px] desk:flex-row",
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
        aria-pressed={isFav}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        <Heart className={cn("h-4 w-4", isFav && "fill-red-500 text-red-500")} />
      </button>

      <Link
        to={result.detailUrl}
        state={{ fromSearch: returnTo }}
        onClick={() => {
          setSelectedPropertyId(result.id);
          onListingOpen?.(result.id, surface);
        }}
        className={cn(
          "block focus-visible:outline-none",
          isHorizontal && "desk:flex desk:flex-1 desk:flex-row desk:overflow-hidden",
        )}
      >
        {/* Image */}
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            isHorizontal ? "h-32 desk:h-full desk:w-[132px] desk:shrink-0" : "h-36",
          )}
        >
          <img
            src={imgSrc}
            alt={imageAlt}
            loading={isFirstVisible ? "eager" : "lazy"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            onError={() => setImgSrc(PLACEHOLDER_IMG)}
          />
          {/* Photo count — top-left */}
          {result.photoCount > 1 && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
              <Camera className="h-3 w-3" />
              {result.photoCount}
            </span>
          )}
        </div>

        {/* Content */}
        <div
          className={cn(
            "min-w-0 flex-1",
            isHorizontal ? "flex flex-col justify-center gap-0.5 p-3" : "space-y-0.5 p-2.5",
          )}
        >
          {/* 1. Price */}
          {priceBlock}

          {/* 2. BHK + type */}
          <p className="text-sm font-semibold leading-tight text-foreground">{titleLine}</p>

          {/* 3. Building · locality (combined) */}
          {(result.buildingName || result.locality || result.city) && (
            <p className="truncate text-xs leading-tight text-muted-foreground">
              {[result.buildingName, result.locality ?? result.city].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* 4. Comparison facts */}
          {visibleFacts.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {visibleFacts.map((f) => (
                <span key={f.label} className={FACT_CHIP}>
                  {f.label}
                </span>
              ))}
            </div>
          )}

          {/* 5. Contextual / transparency signal */}
          {signal && (
            <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {signal.displayValue}
            </span>
          )}

          {/* 6. Lister + meta (List only — omitted in compact Split card) */}
          {!isHorizontal && (
            <>
              <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px] text-muted-foreground">
                <span>{roleLabel}</span>
                {result.isNewOnReeve && (
                  <span className="rounded-full border border-border bg-muted px-1.5 py-0.5">New on Reeve</span>
                )}
                {result.responseRatePct !== null && <span>· Responds to {result.responseRatePct}%</span>}
              </div>
              <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
                <span>{result.viewCount >= VIEW_COUNT_MIN_DISPLAY ? `${result.viewCount} views` : ""}</span>
                {freshness && <span>{freshness}</span>}
              </div>
            </>
          )}
        </div>
      </Link>
    </article>
  );
}
