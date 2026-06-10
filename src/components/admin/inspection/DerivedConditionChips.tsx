/**
 * DerivedConditionChips — Read-only display of derived room condition summaries.
 *
 * Computes 6 category chips (walls/flooring/ceiling/doors_windows/electrical/plumbing)
 * from room_features entry arrays via deriveConditions(). No callbacks, no edits.
 *
 * Replaces the old editable per-section condition dropdowns. Conditions are
 * now written to DB only at completion / export via useConditionSnapshot.
 */
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { LocalRoom } from "@/types/inspection";
import { deriveConditions, CONDITION_DISPLAY } from "./deriveConditions";
import type { ChipState } from "./deriveConditions";

// ── Paint condition labels ─────────────────────────────────────────────────────

const PAINT_CONDITION_LABELS: Record<string, string> = {
  fresh:                "Fresh",
  faded:                "Faded",
  marked:               "Marked",
  touch_up_required:    "Requires Touch-up",
  full_repaint_required:"Requires Full Repaint",
};

// ── Chip colour ───────────────────────────────────────────────────────────────

function chipClass(chip: ChipState): string {
  if (!chip.isAssessed) {
    return "bg-muted/60 text-muted-foreground border-border";
  }
  switch (chip.condition) {
    case "good":
      return "bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800";
    case "minor_wear":
      return "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
    case "moderate_damage":
      return "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800";
    case "severe_damage":
      return "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";
    default:
      return "bg-muted/60 text-muted-foreground border-border";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

type DerivedConditionChipsProps = {
  room: LocalRoom;
};

export function DerivedConditionChips({ room }: DerivedConditionChipsProps) {
  const derived = useMemo(() => deriveConditions(room), [room]);

  const chips: ChipState[] = [
    derived.walls,
    derived.flooring,
    derived.ceiling,
    derived.doorsWindows,
    derived.electrical,
    derived.plumbing,
  ];

  // Show paint sub-label under Walls only when not fresh
  const paintLabel =
    derived.paintCondition && derived.paintCondition !== "fresh"
      ? PAINT_CONDITION_LABELS[derived.paintCondition]
      : null;

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <div
          key={chip.key}
          aria-label={`${chip.label}: ${chip.displayLabel}`}
          className={cn(
            // flex-1 with min-width keeps 3 columns on mobile (~380px) — each chip ~115px
            "flex min-w-[100px] flex-1 basis-[calc(33.333%-6px)] flex-col",
            "rounded-lg border px-2.5 py-2 text-center select-none",
            chipClass(chip),
          )}
        >
          {/* Category name */}
          <span className="text-[10px] font-medium uppercase tracking-wide opacity-60 leading-tight">
            {chip.label}
          </span>
          {/* Condition label */}
          <span className="mt-0.5 text-xs font-semibold leading-snug">
            {chip.displayLabel}
          </span>
          {/* Paint sub-label — only under Walls chip, only when not fresh */}
          {chip.key === "walls" && paintLabel && (
            <span className="mt-0.5 text-[10px] leading-tight opacity-70">
              Paint: {paintLabel}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
