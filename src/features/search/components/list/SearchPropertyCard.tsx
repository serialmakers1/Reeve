import { useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Heart, Camera, Eye, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";
import { writePendingIntent } from "@/features/search/state/pendingSearchIntent";
import { useSearchState } from "@/features/search/state/useSearchState";
import { resolveDisplayPrice } from "@/features/search/resolvers/priceResolver";
import {
  resolveSecondaryRentTerm,
  resolveDepositTile,
  resolveRentFeatureTiles,
  resolveSaleFeatureTiles,
  resolveListerRoleLabel,
  resolveFreshnessInfo,
  resolveFooterSegments,
} from "@/features/search/resolvers/cardTilesResolver";
import { FinancialTile, FeatureTile, FooterSegmentView } from "./CardTile";
import { ACTIVITY_STYLES } from "./cardTileStyles";
import { VIEW_COUNT_MIN_DISPLAY } from "@/features/search/domain/searchConstants";
import { formatEnumLabel } from "@/utils/property/formatEnumLabel";

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80";

// Column class map, keyed by rendered-tile count (never index with 0).
const TILE_GRID_COLUMNS: Record<1 | 2 | 3, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
};

interface SearchPropertyCardProps {
  result: SearchPropertyResult;
  isSelected?: boolean;
  isFirstVisible?: boolean;
  onHover?: (id: string | null) => void;
  onRegisterRef?: (id: string, el: HTMLDivElement | null) => void;
  isFavourited: (id: string) => boolean;
  onToggleFavourite: (id: string, surface: "list") => void;
  isLoggedIn: boolean;
  onListingOpen?: (id: string, surface: "list") => void;
}

export function SearchPropertyCard({
  result,
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

  const isRent = result.listingMode === "rent";
  const surface = "list" as const;
  const isFav = isFavourited(result.id);
  const displayPrice = resolveDisplayPrice(result);

  const bhkLabel = formatEnumLabel("bhk", result.bhk);
  const typeLabel = formatEnumLabel("property_type", result.propertyType);

  const imageAlt =
    [bhkLabel, typeLabel, result.buildingName ? `in ${result.buildingName}` : null].filter(Boolean).join(" ") ||
    "Property listing";

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

  // ── Identity (null-safe segment composition) ───────────────────────────────
  const identityParts = [
    bhkLabel || null,
    typeLabel || null,
  ].filter(Boolean) as string[];
  const locationParts = [
    result.buildingName?.trim() || null,
    result.locality?.trim() || result.city?.trim() || null,
  ].filter(Boolean) as string[];

  const favourite = (
    <button
      onClick={handleFavourite}
      aria-label={isFav ? "Remove from favourites" : "Save to favourites"}
      aria-pressed={isFav}
      className={cn(
        "absolute right-2 top-2 z-10 flex items-center justify-center rounded-full transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2",
        "h-10 w-10 bg-white/90 text-slate-900 shadow-sm hover:bg-white focus-visible:ring-primary/50",
      )}
    >
      <Heart className={cn("h-4 w-4", isFav && "fill-red-500 text-red-500")} />
    </button>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // VERTICAL (List) — vibrant redesign.
  // ─────────────────────────────────────────────────────────────────────────
  const depositTile = isRent ? resolveDepositTile(result) : null;
  const secondaryTerm = isRent ? resolveSecondaryRentTerm(result) : null;
  const financialTiles = isRent ? [depositTile, secondaryTerm].filter(Boolean) : [];
  const usedConcepts = financialTiles.map((t) => t!.concept);
  const featureTiles = isRent
    ? resolveRentFeatureTiles(result, usedConcepts)
    : resolveSaleFeatureTiles(result, usedConcepts);

  const roleLabel = resolveListerRoleLabel(result.listerRole);
  const freshness = resolveFreshnessInfo(result);
  const footerSegments = resolveFooterSegments(result, freshness, roleLabel);

  const showViews = result.viewCount >= VIEW_COUNT_MIN_DISPLAY;
  const showComments = result.commentCount > 0;
  const hasActivity = showViews || showComments;

  const activityStack = hasActivity ? (
    <div className="flex flex-col items-end justify-center gap-1">
      {showViews && (
        <span className="flex items-center gap-1">
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", ACTIVITY_STYLES.views.iconBox)}>
            <Eye aria-hidden="true" className={cn("h-3.5 w-3.5", ACTIVITY_STYLES.views.icon)} />
          </span>
          <span aria-hidden="true" className={cn("text-xs font-semibold tabular-nums", ACTIVITY_STYLES.views.text)}>
            {result.viewCount}
          </span>
          <span className="sr-only">{result.viewCount} views</span>
        </span>
      )}
      {showComments && (
        <span className="flex items-center gap-1">
          <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", ACTIVITY_STYLES.comments.iconBox)}>
            <MessageCircle aria-hidden="true" className={cn("h-3.5 w-3.5", ACTIVITY_STYLES.comments.icon)} />
          </span>
          <span aria-hidden="true" className={cn("text-xs font-semibold tabular-nums", ACTIVITY_STYLES.comments.text)}>
            {result.commentCount}
          </span>
          <span className="sr-only">{result.commentCount} comments</span>
        </span>
      )}
    </div>
  ) : null;

  return (
    <article
      ref={registerRef}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow",
        "focus-within:ring-2 focus-within:ring-primary/40 hover:shadow-md",
        isSelected && "ring-2 ring-primary",
      )}
      onMouseEnter={() => onHover?.(result.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(result.id)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onHover?.(null);
      }}
    >
      {favourite}
      <Link
        to={result.detailUrl}
        state={{ fromSearch: returnTo }}
        onClick={() => {
          setSelectedPropertyId(result.id);
          onListingOpen?.(result.id, surface);
        }}
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none"
      >
        {/* Image */}
        <div className="relative h-36 shrink-0 overflow-hidden bg-muted">
          <img
            src={imgSrc}
            alt={imageAlt}
            loading={isFirstVisible ? "eager" : "lazy"}
            fetchPriority={isFirstVisible ? "high" : "auto"}
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            onError={() => setImgSrc(PLACEHOLDER_IMG)}
          />
          {result.photoCount > 1 && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-md bg-slate-900/70 px-2 py-0.5 text-[10px] font-medium text-white">
              <Camera className="h-3 w-3" />
              {result.photoCount} photos
            </span>
          )}
        </div>

        {/* Mode accent rail */}
        <div
          aria-hidden="true"
          className={cn(
            "h-[3px] shrink-0 bg-gradient-to-r",
            isRent ? "from-teal-500 via-cyan-500 to-blue-600" : "from-indigo-500 via-violet-500 to-amber-500",
          )}
        />

        {/* Content */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2.5 md:p-3">
          {/* 1. Price + activity header — always rendered to prevent CLS when async counts arrive */}
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            {displayPrice ? (
              <div className="min-w-0 leading-tight">
                <p className="text-2xl font-bold text-foreground tabular-nums break-words">
                  {displayPrice.amount}
                  {displayPrice.unit && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">{displayPrice.unit}</span>
                  )}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wide",
                    isRent ? "text-teal-600" : "text-indigo-600",
                  )}
                >
                  {displayPrice.label}
                </p>
              </div>
            ) : (
              <span />
            )}
            {/* Activity column: fixed footprint prevents CLS when badges appear asynchronously.
                w-14 (56px) covers icon + gap + 4-digit count; min-h-[52px] covers both rows. */}
            <div className="w-14 min-h-[52px]">
              {activityStack}
            </div>
          </div>

          {/* 2. Identity */}
          {(identityParts.length > 0 || locationParts.length > 0) && (
            <div className="min-w-0 space-y-0.5">
              {identityParts.length > 0 && (
                <p className="text-[15px] font-semibold leading-tight text-foreground break-words">
                  {identityParts.join(" · ")}
                </p>
              )}
              {locationParts.length > 0 && (
                <p className="line-clamp-2 min-w-0 text-xs leading-tight text-muted-foreground">
                  {locationParts.join(" · ")}
                </p>
              )}
            </div>
          )}

          {/* 3. Rent financial row */}
          {financialTiles.length > 0 && (
            <div className={cn("grid gap-2", TILE_GRID_COLUMNS[financialTiles.length as 1 | 2])}>
              {financialTiles.map((t) => (
                <FinancialTile key={t!.concept} tile={t!} />
              ))}
            </div>
          )}

          {/* 4. Feature tiles */}
          {featureTiles.length > 0 && (
            <div className={cn("grid gap-1.5 md:gap-2", TILE_GRID_COLUMNS[featureTiles.length as 1 | 2 | 3])}>
              {featureTiles.map((t) => (
                <FeatureTile key={t.concept} tile={t} />
              ))}
            </div>
          )}

          {/* 5. Footer deck — pinned to bottom */}
          {footerSegments.length > 0 && (
            <div
              className={cn(
                "mt-auto grid divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 py-1.5",
                TILE_GRID_COLUMNS[footerSegments.length as 1 | 2 | 3],
              )}
            >
              {footerSegments.map((seg) => (
                <FooterSegmentView key={seg.key} segment={seg} />
              ))}
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
