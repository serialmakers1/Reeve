/**
 * ActivityTimeline — renders property_activity_log rows with discriminated-union
 * payload narrowing per src/types/activity-log.ts.
 *
 * Each row shows: icon (by action) · summary text · relative timestamp · actor.
 * Summary prefers payload.summary; falls back to a derived string per action.
 * Reason is expandable for rejection events.
 */

import { formatDistanceToNow, format } from "date-fns";
import {
  Circle, CheckCircle2, XCircle, Edit3, ArrowUpCircle, Archive, Shield, Send, RefreshCcw,
} from "lucide-react";
import type { ActivityLogPayload } from "@/types/activity-log";
import { formatRejectionReason } from "@/lib/rejectionReasons";

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
    case "listing_rejected":  return "Changes requested";
    case "listing_withdrawn": return "You withdrew your submission";
    case "edit_submitted":    return `You submitted an edit${payload.changed_field_keys ? ` (${payload.changed_field_keys.length} fields)` : ""}`;
    case "edit_approved":     return "Admin approved your edit";
    case "edit_rejected":     return "Edit changes requested";
    case "edit_resolved":     return "Edit resolved";
    case "relisted":          return "Listing re-listed";
    case "unlisted":          return "Listing unlisted";
    case "archived":          return "Listing archived";
    case "admin_edit":        return `Admin made a direct edit${payload.changed_field_keys ? ` (${payload.changed_field_keys.length} fields)` : ""}`;
    case "availability_confirmed": return "You confirmed this rental is still available";
    case "sale_listing_confirmed": return "You confirmed this sale listing is still available";
    case "auto_unlisted":     return "Automatically unlisted — availability wasn't confirmed in time";
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
    case "availability_confirmed": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "sale_listing_confirmed": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "auto_unlisted":     return <Archive className="h-4 w-4 text-amber-600" />;
    default:                  return <Circle className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function ActivityTimeline({ rows, currentUserId }: Props) {
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
        const isRejection = row.action === "edit_rejected" || row.action === "listing_rejected";
        const reasonCategory = isRejection
          ? formatRejectionReason((payload as { reason?: string }).reason)
          : null;
        const reasonComment = isRejection
          ? ((payload as { reason_text?: string }).reason_text?.trim() || null)
          : null;
        const showReasonBlock = isRejection && (reasonCategory || reasonComment);
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
              {showReasonBlock && (
                <div className="mt-1.5 rounded bg-muted p-2 space-y-1">
                  {reasonCategory && (
                    <p className="text-xs text-foreground">
                      <span className="text-muted-foreground">Reason: </span>{reasonCategory}
                    </p>
                  )}
                  {reasonComment && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line [overflow-wrap:anywhere]">
                      {reasonComment}
                    </p>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
