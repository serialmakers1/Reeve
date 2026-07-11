/**
 * ActivityTimeline — renders property_activity_log rows with discriminated-union
 * payload narrowing per src/types/activity-log.ts.
 *
 * Each row shows: icon (by action) · summary text · relative timestamp · actor.
 * Summary prefers payload.summary; falls back to a derived string per action.
 * Reason is expandable for rejection events.
 */

import { useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  Circle, CheckCircle2, XCircle, Edit3, ArrowUpCircle, Archive, Shield, Send, RefreshCcw,
} from "lucide-react";
import type { ActivityLogPayload } from "@/types/activity-log";

export interface TimelineRow {
  id: string;
  actor_id: string | null;
  actor_role: "owner" | "admin" | "system";
  action: string;
  payload: ActivityLogPayload | Record<string, unknown>;
  created_at: string;
}

interface Props {
  rows: TimelineRow[];
  currentUserId: string | null | undefined;
}

function summaryFor(payload: ActivityLogPayload): string {
  if (payload.summary) return payload.summary;
  switch (payload.action) {
    case "listing_started":   return "You started this listing";
    case "listing_submitted": return "You submitted for review";
    case "listing_approved":  return "Admin approved — your listing is now live";
    case "listing_rejected":  return `Admin requested changes${payload.reason ? `: ${payload.reason}` : ""}`;
    case "listing_withdrawn": return "You withdrew your submission";
    case "edit_submitted":    return `You submitted an edit${payload.changed_field_keys ? ` (${payload.changed_field_keys.length} fields)` : ""}`;
    case "edit_approved":     return "Admin approved your edit";
    case "edit_rejected":     return `Admin rejected your edit: ${payload.reason}`;
    case "edit_resolved":     return "Edit resolved";
    case "relisted":          return "Listing re-listed";
    case "unlisted":          return "Listing unlisted";
    case "archived":          return "Listing archived";
    case "admin_edit":        return `Admin made a direct edit${payload.changed_field_keys ? ` (${payload.changed_field_keys.length} fields)` : ""}`;
    case "status_changed":    return `Status changed: ${payload.from_status} → ${payload.to_status}`;
    default:                  return "Activity";
  }
}

function iconFor(action: string) {
  switch (action) {
    case "listing_started":   return <Circle className="h-4 w-4 text-muted-foreground" />;
    case "listing_submitted": return <Send className="h-4 w-4 text-blue-600" />;
    case "listing_approved":  return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "listing_rejected":  return <XCircle className="h-4 w-4 text-amber-600" />;
    case "listing_withdrawn": return <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />;
    case "edit_submitted":    return <Edit3 className="h-4 w-4 text-blue-600" />;
    case "edit_approved":     return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "edit_rejected":     return <XCircle className="h-4 w-4 text-amber-600" />;
    case "edit_resolved":     return <RefreshCcw className="h-4 w-4 text-muted-foreground" />;
    case "relisted":          return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "unlisted":          return <Circle className="h-4 w-4 text-gray-400" />;
    case "archived":          return <Archive className="h-4 w-4 text-gray-400" />;
    case "admin_edit":        return <Shield className="h-4 w-4 text-blue-600" />;
    default:                  return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function ActivityTimeline({ rows, currentUserId }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {rows.map((row) => {
        const payload = row.payload as ActivityLogPayload;
        const summary = summaryFor(payload);
        const actorLabel =
          row.actor_id && currentUserId && row.actor_id === currentUserId
            ? "You"
            : row.actor_role === "admin"
              ? "Admin"
              : row.actor_role === "system"
                ? "System"
                : "Someone";
        const reason = (payload as { reason?: string; reason_text?: string }).reason
          ?? (payload as { reason_text?: string }).reason_text;
        const canExpand = !!reason && (row.action === "edit_rejected" || row.action === "listing_rejected");
        const isExpanded = expanded[row.id] ?? false;
        return (
          <li key={row.id} className="flex gap-3 rounded-lg border bg-card p-3">
            <div className="shrink-0 pt-0.5">{iconFor(row.action)}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{summary}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span title={format(new Date(row.created_at), "PPpp")}>
                  {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                </span>
                {" · "}
                <span>{actorLabel}</span>
              </p>
              {canExpand && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => ({ ...e, [row.id]: !e[row.id] }))}
                  className="mt-1 text-xs text-primary underline"
                >
                  {isExpanded ? "Hide reason" : "Show reason"}
                </button>
              )}
              {canExpand && isExpanded && reason && (
                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line rounded bg-muted p-2">
                  {reason}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
