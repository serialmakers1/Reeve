import { ChevronRight, X, Heart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import type { MarkerGroup } from "@/features/search/components/SearchMapView";
import { formatMarkerPrice } from "@/features/search/components/map/MapMarkerPin";
import { writePendingIntent } from "@/features/search/state/pendingSearchIntent";

interface Props {
  group: MarkerGroup;
  onClose: () => void;
  onOpen: (propertyId: string) => void;
  isFavourited: (id: string) => boolean;
  onToggleFavourite: (id: string) => void;
  isLoggedIn: boolean;
}

export function MapPropertyPreview({
  group,
  onClose,
  onOpen,
  isFavourited,
  onToggleFavourite,
  isLoggedIn,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSingle = group.members.length === 1;
  const rep = group.representative;
  const priceLabel = formatMarkerPrice(rep.price);
  const modeLabel = rep.listingMode === "buy" ? "For Sale" : "For Rent";

  function handleFavourite(e: React.MouseEvent, propertyId: string) {
    e.stopPropagation();
    if (!isLoggedIn) {
      const params = new URLSearchParams(location.search);
      params.set("pid", propertyId);
      const returnTo = location.pathname + "?" + params.toString();
      writePendingIntent(propertyId, returnTo);
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    onToggleFavourite(propertyId);
  }

  return (
    <div className="relative rounded-xl border bg-card shadow-lg overflow-hidden">
      {isSingle ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => onOpen(rep.markerId)}
            className="w-full text-left p-3 pr-16 flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{rep.buildingName ?? "Property"}</p>
              <p className="text-xs text-muted-foreground">
                {priceLabel} · {modeLabel}
                {rep.precision === "approximate" && " · Approx. location"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
          {/* Favourite button — overlaid top-right of the content row */}
          <button
            type="button"
            onClick={(e) => handleFavourite(e, rep.markerId)}
            aria-label={isFavourited(rep.markerId) ? "Remove from favourites" : "Save to favourites"}
            className="absolute right-8 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white"
          >
            <Heart
              className={`h-4 w-4 ${isFavourited(rep.markerId) ? "fill-red-500 text-red-500" : ""}`}
            />
          </button>
        </div>
      ) : (
        <div className="p-3">
          <p className="text-sm font-semibold mb-1">
            {group.members.length} properties · {rep.buildingName ?? "This building"}
          </p>
          {rep.precision === "approximate" && (
            <p className="text-[10px] text-muted-foreground mb-2">Approximate location</p>
          )}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {group.members.map((m) => (
              <div key={m.markerId} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpen(m.markerId)}
                  className="flex-1 text-left flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
                >
                  <span className="text-xs">{formatMarkerPrice(m.price)}</span>
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleFavourite(e, m.markerId)}
                  aria-label={isFavourited(m.markerId) ? "Remove from favourites" : "Save to favourites"}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-muted"
                >
                  <Heart
                    className={`h-3.5 w-3.5 ${isFavourited(m.markerId) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute top-2 right-2 rounded-full bg-muted p-1"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
