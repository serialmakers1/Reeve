/**
 * PublicTimeline — curated public activity log for the tenant-facing PropertyDetail.
 *
 * Reads property_activity_log rows where is_public = true. Renders the summary line
 * (from payload.summary) with a relative timestamp. Deliberately anonymous — no actor
 * name, no rejection reasons, no field-level diffs. Only the curated summary the
 * trigger / RPC wrote at write time is exposed.
 *
 * Distinct from src/components/property-management/ActivityTimeline.tsx which is
 * owner/admin-facing and shows actor + reason expansion.
 */

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { CheckCircle2, Circle, RefreshCcw, Archive } from "lucide-react";
import type { ActivityLogPayload } from "@/types/activity-log";
import { getStatusDisplay } from "@/lib/propertyStatus";
import { cn } from "@/lib/utils";

export interface PublicTimelineRow {
  id: string;
  action: string;
  payload: ActivityLogPayload | Record<string, unknown>;
  is_public: boolean;
  created_at: string;
}

interface Props {
  rows: PublicTimelineRow[];
  /** P6: property.listed_at — powers the freshness chip in the section header. */
  listed_at?: string | null;
}

const INITIAL_LIMIT = 10;

function summaryFor(row: PublicTimelineRow): string {
  const p = row.payload as ActivityLogPayload & { from_status?: string; to_status?: string };
  // Prefer structured status-transition labels via getStatusDisplay so E2 never
  // shows raw enum codes to the public — fall back to curated summary, then
  // action-hardcoded string (defensive for legacy rows without either).
  if (p.from_status && p.to_status) {
    const from = getStatusDisplay(p.from_status).label;
    const to = getStatusDisplay(p.to_status).label;
    return `${from} → ${to}`;
  }
  // P6-F1: public-voice copy for edit_approved wins over the payload summary
  // (which uses owner-facing wording "Your edit was approved").
  if (row.action === "edit_approved") return "Property details updated";
  if (p.summary) return p.summary;
  switch (row.action) {
    case "listing_approved": return "Listed on Reeve";
    case "listed":           return "Listed on Reeve";
    case "unlisted":         return "Owner unlisted this property";
    case "relisted":         return "Owner re-listed this property";
    default:                 return "Listing update";
  }
}

function iconFor(action: string) {
  switch (action) {
    case "listing_approved":
    case "listed":
    case "relisted":     return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "unlisted":     return <Archive className="h-4 w-4 text-gray-400" />;
    case "edit_approved": return <RefreshCcw className="h-4 w-4 text-blue-600" />;
    default:              return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function PublicTimeline({ rows, listed_at }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0 && !listed_at) return null;
  const visible = expanded ? rows : rows.slice(0, INITIAL_LIMIT);
  const hasMore = rows.length > INITIAL_LIMIT;

  // P6-F2: freshness chip derived from listed_at. Silent when listed_at null.
  let chip: React.ReactNode = null;
  if (listed_at) {
    const listedAtDate = new Date(listed_at);
    const daysOld = Math.floor((Date.now() - listedAtDate.getTime()) / 86_400_000);
    const tone =
      daysOld <= 14
        ? "bg-green-50 text-green-700"
        : daysOld <= 45
          ? "bg-amber-50 text-amber-700"
          : "bg-red-50 text-red-700";
    chip = (
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
        Listed {formatDistanceToNow(listedAtDate, { addSuffix: false })} ago
      </span>
    );
  }

  return (
    <section className="space-y-3 px-4 lg:px-0">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">Listing history</h2>
        {chip}
      </div>
      <ol className="space-y-2">
        {visible.map((row) => (
          <li key={row.id} className="flex items-start gap-3 text-sm">
            <div className="shrink-0 pt-0.5">{iconFor(row.action)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground">{summaryFor(row)}</p>
              <p className="text-xs text-muted-foreground" title={format(new Date(row.created_at), "PPpp")}>
                {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-primary underline"
        >
          {expanded ? "Show less" : `Show all ${rows.length}`}
        </button>
      )}
    </section>
  );
}
