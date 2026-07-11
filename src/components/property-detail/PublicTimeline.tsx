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

export interface PublicTimelineRow {
  id: string;
  action: string;
  payload: ActivityLogPayload | Record<string, unknown>;
  is_public: boolean;
  created_at: string;
}

interface Props {
  rows: PublicTimelineRow[];
}

const INITIAL_LIMIT = 10;

function summaryFor(row: PublicTimelineRow): string {
  const p = row.payload as ActivityLogPayload;
  if (p.summary) return p.summary;
  switch (row.action) {
    case "listing_approved": return "Listed on Reeve";
    case "listed":           return "Listed on Reeve";
    case "unlisted":         return "Owner unlisted this property";
    case "relisted":         return "Owner re-listed this property";
    case "edit_approved":    return "Property details updated";
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

export default function PublicTimeline({ rows }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (rows.length === 0) return null;
  const visible = expanded ? rows : rows.slice(0, INITIAL_LIMIT);
  const hasMore = rows.length > INITIAL_LIMIT;

  return (
    <section className="space-y-3 px-4 lg:px-0">
      <h2 className="text-base font-semibold text-foreground">Listing history</h2>
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
