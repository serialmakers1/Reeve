import { cn } from "@/lib/utils";
import type { SearchMapMarker } from "@/features/search/data/searchMarkerContract";

interface Props {
  marker: SearchMapMarker;
  selected: boolean;
}

export function MapMarkerPin({ marker, selected }: Props) {
  const label = formatMarkerPrice(marker.price);
  const isApprox = marker.precision === "approximate";
  const ariaLabel = [
    label,
    isApprox ? "approximate location" : "exact location",
    marker.buildingName,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm border-2 whitespace-nowrap select-none transition-all",
        selected
          ? "bg-primary text-primary-foreground border-primary scale-110"
          : "bg-card text-foreground border-border",
        isApprox && "border-dashed",
      )}
    >
      {label}
    </div>
  );
}

export function formatMarkerPrice(price: SearchMapMarker["price"]): string {
  if (!price) return "—";
  const { amount } = price;
  if (price.kind === "sale") {
    if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(1)}Cr`;
    if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(0)}L`;
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L/mo`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}K/mo`;
  return `₹${amount}/mo`;
}
