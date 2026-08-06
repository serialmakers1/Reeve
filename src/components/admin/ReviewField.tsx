/**
 * ReviewField — small presentational wrapper used by the admin listing-review
 * page to draw attention to owner-entered / free-text content that needs human
 * moderation, and to mark custom (non-curated) structured items.
 *
 *  variant="manual" — amber ATTENTION state (not an error). Border + light bg +
 *    pencil icon + a small "review" label. Used for free-text values and the
 *    location block when it was manually entered / not tied to a Google place.
 *  variant="custom" — a compact inline "Custom" badge (icon + text) for custom
 *    furniture / amenity entries, visually distinct from curated options.
 *
 * Never relies on colour alone (icon + text + border together). Wraps long text
 * and URLs safely. No dangerouslySetInnerHTML — React escaping is preserved.
 */

import { PencilLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewFieldProps {
  /** Field label, e.g. "Landmark", "About the Property". */
  label?: string;
  /** Small badge/annotation text. Defaults to "Manual entry — review". */
  badge?: string;
  /** Preserve newlines for multiline notes. */
  multiline?: boolean;
  className?: string;
  children: React.ReactNode;
}

/** Amber attention block for free-text / manual content requiring review. */
export function ReviewField({
  label,
  badge = "Manual entry — review",
  multiline = false,
  className,
  children,
}: ReviewFieldProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-amber-300 bg-amber-50/60 px-3 py-2 space-y-1",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {label && (
          <p className="text-xs font-medium text-amber-900">{label}</p>
        )}
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100/70 px-1.5 py-0.5 text-[10px] font-medium text-amber-900 shrink-0">
          <PencilLine className="h-3 w-3 shrink-0" aria-hidden="true" />
          {badge}
        </span>
      </div>
      <div
        className={cn(
          "text-sm text-amber-950 [overflow-wrap:anywhere] break-words",
          multiline && "whitespace-pre-line",
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Inline "Custom" badge for non-curated structured items. */
export function CustomBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary shrink-0",
        className,
      )}
    >
      <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
      Custom
    </span>
  );
}
