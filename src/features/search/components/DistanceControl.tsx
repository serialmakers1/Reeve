import { cn } from "@/lib/utils";
import { useSearchState } from "@/features/search/state/useSearchState";
import { DISTANCE_OPTIONS_KM } from "@/features/search/domain/searchConstants";

/**
 * Distance segmented control (Prompt 3). `Auto` = canonical association match +
 * safety-net; an explicit km value applies a geographic radius that may cross city
 * boundaries. Anchors: selected areas → circles around area centres; city only →
 * around the selected city centres. With neither a city nor an area, distance has
 * no anchor and is ignored server-side, so the control is disabled.
 */
export function DistanceControl({ className }: { className?: string }) {
  const { state, setDistanceKm } = useSearchState();
  const { locations } = state.context;
  // Only a selected locality can anchor an explicit radius (PostGIS locality-only).
  const hasAnchor = locations.some((l) => l.kind === "locality");
  const active = state.distanceKm;

  const helper =
    active === null
      ? null
      : `Within ${active} km of your selected localities; results may extend beyond the city`;

  const btn =
    "h-9 min-w-[44px] rounded-full border px-3 text-xs font-medium shrink-0 transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none";
  const on = "bg-primary/10 border-primary text-primary";
  const off = "bg-background border-border text-foreground hover:border-primary/40";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div role="radiogroup" aria-label="Distance" className="flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          role="radio"
          aria-checked={active === null}
          disabled={!hasAnchor}
          onClick={() => setDistanceKm(null)}
          className={cn(btn, active === null ? on : off)}
        >
          Auto
        </button>
        {DISTANCE_OPTIONS_KM.map((km) => (
          <button
            key={km}
            type="button"
            role="radio"
            aria-checked={active === km}
            disabled={!hasAnchor}
            onClick={() => setDistanceKm(km)}
            className={cn(btn, active === km ? on : off)}
          >
            {km} km
          </button>
        ))}
      </div>
      {helper && <p className="px-1 text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}
