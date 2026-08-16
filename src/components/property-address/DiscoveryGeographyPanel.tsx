/**
 * DiscoveryGeographyPanel (Prompt 3 P2) — plain-language display of "Places people can use to
 * find this property". Presentational only: it renders the server-decided root + associations and
 * lets the owner deselect optional system recommendations or remove owner-added places. It never
 * computes canonical geography, never shows UUID / provider id / confidence / relationship, and
 * never exposes root-selection controls (the root is locked).
 */
import { ReactNode } from "react";
import { MapPin, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DiscoveryItem {
  candidate_key: string;
  display_name: string;
  kind: string;            // settlement | locality | road
  owner: boolean;          // owner-added (source === "owner")
}

interface Props {
  rootName: string | null;
  /** Non-root associations (system recommendations + owner-added), root already excluded. */
  items: DiscoveryItem[];
  /** candidate_keys the owner has deselected (system recommendations only). */
  deselected: Set<string>;
  onToggleSystem: (key: string) => void;
  onRemoveOwner: (key: string) => void;
  missingRoot: boolean;
  ambiguousRoot?: boolean;
  rejected?: Array<{ place_id: string; reason: string }>;
  /** "+ Add another nearby area or road" trigger element. */
  children?: ReactNode;
  disabled?: boolean;
  /** When true, suppress the internal heading ("Places people can use to find this property").
   *  Use when the parent renders its own numbered section heading. */
  hideHeading?: boolean;
}

const KIND_LABEL: Record<string, string> = { settlement: "Town / City", locality: "Locality", road: "Road" };

const REJECT_COPY: Record<string, string> = {
  no_root_context: "We couldn't place that locality without a nearby town or city.",
  implausible_distance: "That place is too far from your pin.",
  outside_india: "Reeve currently supports locations in India only.",
  building_not_geography: "That's a building, not an area — add it as your property name instead.",
  unsupported_type: "We couldn't use that type of place.",
  no_location: "We couldn't read that place's location.",
  not_found: "We couldn't find that place. Try another.",
};

export function DiscoveryGeographyPanel({
  rootName, items, deselected, onToggleSystem, onRemoveOwner,
  missingRoot, ambiguousRoot, rejected, children, disabled, hideHeading,
}: Props) {
  return (
    <div className="space-y-2.5">
      {!hideHeading && (
        <div>
          <p className="text-sm font-medium">Places people can use to find this property</p>
          <p className="text-xs text-muted-foreground">Reeve uses these locations to help people find your property.</p>
        </div>
      )}

      {ambiguousRoot ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          You've added more than one town/city. Keep just the one your property belongs to.
        </div>
      ) : missingRoot ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          We couldn't identify the town or city for this pin. Use “+ Add another nearby area or road” to add the nearest village, town or city.
        </div>
      ) : rootName ? (
        <div className="flex items-center gap-1.5 rounded-md bg-primary/5 px-2.5 py-1.5">
          <MapPin className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{rootName}</span>
        </div>
      ) : null}

      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => {
            const off = !it.owner && deselected.has(it.candidate_key);
            return (
              <span
                key={it.candidate_key}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs",
                  off ? "border-dashed bg-muted/30 text-muted-foreground line-through"
                      : it.owner ? "border-primary/40 bg-primary/10 text-primary" : "bg-muted/40",
                )}
              >
                {it.owner && <Sparkles className="h-3 w-3" />}
                <span title={KIND_LABEL[it.kind] ?? it.kind}>{it.display_name}</span>
                {!disabled && (
                  <button
                    type="button"
                    aria-label={it.owner ? `Remove ${it.display_name}` : off ? `Add ${it.display_name} back` : `Remove ${it.display_name}`}
                    onClick={() => (it.owner ? onRemoveOwner(it.candidate_key) : onToggleSystem(it.candidate_key))}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-black/5"
                  >
                    {it.owner ? <X className="h-3 w-3" /> : off ? <span className="text-[13px] leading-none">＋</span> : <X className="h-3 w-3" />}
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {rejected && rejected.length > 0 && (
        <ul className="space-y-0.5">
          {rejected.map((r) => (
            <li key={r.place_id} className="text-xs text-destructive">
              {REJECT_COPY[r.reason] ?? "We couldn't use that location. Choose another nearby place."}
            </li>
          ))}
        </ul>
      )}

      {children}
    </div>
  );
}
