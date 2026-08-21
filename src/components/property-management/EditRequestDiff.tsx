/**
 * EditRequestDiff — G2 per D-165.
 *
 * Renders a proposed value from an edit request payload alongside the current
 * live value using the "Currently live: X" subtitle pattern already in use in
 * OwnerPropertyManagement's FieldRow. Reused by admin's ListingReviewDetail
 * so admins see the same diff shape owners see (D-093 curated events).
 *
 * Small, focused signature (no accordion, no error state, no editing) — this
 * is a pure presentational row. Formatting is caller-controlled: the caller
 * passes already-stringified values via `<>` fragments or plain strings.
 */

import { cn } from "@/lib/utils";

interface Props {
  /** Display label for the field, e.g. "Monthly rent". */
  label: string;
  /** Proposed value from the edit request. Can be null/empty for a removal. */
  proposedValue: React.ReactNode;
  /** Current live value on the property row. */
  liveValue: React.ReactNode;
}

const isEmpty = (v: React.ReactNode) =>
  v == null || v === "" || v === "—";

export default function EditRequestDiff({ label, proposedValue, liveValue }: Props) {
  const emptyProposed = isEmpty(proposedValue);
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <div className="text-right min-w-0">
        <span className={cn("text-foreground", "text-blue-700 font-medium")}>
          {emptyProposed ? "—" : proposedValue}
        </span>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Currently live: {isEmpty(liveValue) ? "—" : liveValue}
        </p>
      </div>
    </div>
  );
}
