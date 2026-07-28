import { ChevronRight, X } from "lucide-react";
import type { MarkerGroup } from "@/features/search/components/SearchMapView";
import { formatMarkerPrice } from "@/features/search/components/map/MapMarkerPin";

interface Props {
  group: MarkerGroup;
  onClose: () => void;
  onOpen: (propertyId: string) => void;
}

export function MapPropertyPreview({ group, onClose, onOpen }: Props) {
  const isSingle = group.members.length === 1;
  const rep = group.representative;
  const priceLabel = formatMarkerPrice(rep.price);
  const modeLabel = rep.listingMode === "buy" ? "For Sale" : "For Rent";

  return (
    <div className="relative rounded-xl border bg-card shadow-lg overflow-hidden">
      {isSingle ? (
        <button
          type="button"
          onClick={() => onOpen(rep.markerId)}
          className="w-full text-left p-3 flex items-center justify-between gap-2"
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
      ) : (
        <div className="p-3">
          <p className="text-sm font-semibold mb-2">
            {group.members.length} properties · {rep.buildingName ?? "This building"}
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {group.members.map((m) => (
              <button
                key={m.markerId}
                type="button"
                onClick={() => onOpen(m.markerId)}
                className="w-full text-left flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted"
              >
                <span className="text-xs">{formatMarkerPrice(m.price)}</span>
                <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              </button>
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
