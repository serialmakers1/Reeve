/**
 * StatusGuidance — H3 per D-138.
 *
 * Reads STATUS_CONFIG[status].guidance from src/lib/propertyStatus.ts (populated
 * with locked copy in Phase 1.5 Prompt 1). Renders heading + body inside a
 * muted informational card. Not dismissible. Always visible.
 *
 * Mount points (Prompt 11):
 *   - property management page (OwnerPropertyManagement) Details tab
 *   - ListProperty in edit mode (existing property, non-draft status)
 *
 * Not amber — that palette belongs to RejectionPanel (H1). This is neutral
 * informational; do not conflate the two visual weights.
 */

import { Info } from "lucide-react";
import { getStatusDisplay } from "@/lib/propertyStatus";

interface Props {
  status: string | null | undefined;
  className?: string;
}

export default function StatusGuidance({ status, className }: Props) {
  if (!status) return null;
  const { guidance } = getStatusDisplay(status);
  if (!guidance) return null;

  return (
    <section
      className={`rounded-lg border border-border bg-muted/40 p-4 ${className ?? ""}`}
      aria-label="Status guidance"
    >
      <div className="flex items-start gap-2.5">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{guidance.heading}</p>
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{guidance.body}</p>
        </div>
      </div>
    </section>
  );
}
