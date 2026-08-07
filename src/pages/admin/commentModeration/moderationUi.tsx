/**
 * Small shared presentational bits for the Comment Moderation tabs + sheet.
 * Colour is applied via existing Tailwind tokens only (no hard-coded palette),
 * mapped from the semantic tones in moderationHelpers.
 */
import { Link } from "react-router-dom";
import { getStatusDisplay } from "@/lib/propertyStatus";
import { cn } from "@/lib/utils";
import {
  moderationStateMeta,
  propertyLabel,
  REPORT_REASON_OPTIONS,
  type ModerationTone,
} from "./moderationHelpers";

const BADGE_BASE =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit";

export function toneBadgeClass(tone: ModerationTone): string {
  switch (tone) {
    case "amber":
      return "border-amber-500 text-amber-700 bg-amber-50";
    case "destructive":
      return "border-destructive/40 text-destructive bg-destructive/5";
    case "green":
      return "border-green-500 text-green-700 bg-green-50";
    default:
      return "border-border text-muted-foreground bg-muted";
  }
}

/** Moderation-state pill (Visible / Auto-hidden / Admin-removed / User-deleted / unknown). */
export function StateBadge({ state, className }: { state: string; className?: string }) {
  const meta = moderationStateMeta(state);
  return <span className={cn(BADGE_BASE, toneBadgeClass(meta.tone), className)}>{meta.label}</span>;
}

/** Comment vs Reply tag. */
export function KindBadge({ isReply }: { isReply: boolean }) {
  return (
    <span className={cn(BADGE_BASE, "border-border text-muted-foreground bg-muted")}>
      {isReply ? "Reply" : "Comment"}
    </span>
  );
}

/** Neutral, factual reporting-signal chip (amber cue, never punitive). */
export function SignalChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
      {children}
    </span>
  );
}

/** Property name → admin detail link (valid for any status) + status badge. */
export function PropertyCell({
  propertyId,
  building,
  locality,
  city,
  status,
  className,
}: {
  propertyId: string | null;
  building: string | null;
  locality: string | null;
  city: string | null;
  status: string | null;
  className?: string;
}) {
  const label = propertyLabel(building, locality, city);
  const statusDisplay = status ? getStatusDisplay(status) : null;
  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      {propertyId ? (
        <Link
          to={`/admin/properties/${propertyId}`}
          className="block truncate text-sm font-medium text-primary hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </Link>
      ) : (
        <span className="block truncate text-sm text-muted-foreground">{label}</span>
      )}
      {statusDisplay && (
        <span className={cn(BADGE_BASE, statusDisplay.color)}>{statusDisplay.label}</span>
      )}
    </div>
  );
}

export function reportReasonLabel(reason: string): string {
  return REPORT_REASON_OPTIONS.find((o) => o.value === reason)?.label ?? reason;
}
