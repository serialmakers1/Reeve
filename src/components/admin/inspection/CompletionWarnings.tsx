import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { LocalRoom, DamageItem, InspectionRecord } from "@/types/inspection";

// ── Props ────────────────────────────────────────────────────────────────────

export type CompletionWarningsProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  warnings: string[];
};

// ── Dialog component ──────────────────────────────────────────────────────────

export function CompletionWarnings({ open, onClose, onConfirm, warnings }: CompletionWarningsProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Some inspection details are incomplete</AlertDialogTitle>
          <AlertDialogDescription>
            The following items may need attention. You can still export the report.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="max-h-64 overflow-y-auto space-y-1.5 rounded-md border bg-muted/40 px-4 py-3 text-sm">
          {warnings.map((w, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-muted-foreground">•</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Go Back</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Export Anyway</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Validation checker ────────────────────────────────────────────────────────

const WARN_CAP = 5;

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function asNum(v: unknown): number {
  return typeof v === "number" ? v : Number(v) || 0;
}

function roomHasNoData(room: LocalRoom): boolean {
  const rf = room.room_features as Record<string, unknown> | null | undefined;
  if (!rf) return true;

  const ARRAYS = [
    "wall_entries", "flooring_entries", "ceiling_entries",
    "door_window_entries", "electrical_issues", "plumbing_issues",
  ];
  const allArraysEmpty = ARRAYS.every((key) => asArray(rf[key]).length === 0);

  const INVENTORY_COUNTS = [
    "electrical_fan_count", "electrical_light_count",
    "electrical_switchboard_count", "electrical_ac_provision_count",
    "plumbing_tap_count",
  ];
  const allCountsZero = INVENTORY_COUNTS.every((key) => asNum(rf[key]) === 0);

  // False ceiling set means data was entered
  const fc = rf.false_ceiling as Record<string, unknown> | null | undefined;
  const hasFalseCeiling =
    fc !== null &&
    fc !== undefined &&
    fc.false_ceiling_type !== "none" &&
    fc.false_ceiling_type !== "" &&
    fc.false_ceiling_type !== undefined;

  return allArraysEmpty && allCountsZero && !hasFalseCeiling;
}

export function checkCompletionWarnings(
  rooms: LocalRoom[],
  damages: DamageItem[],
  inspection: InspectionRecord,
): string[] {
  const warnings: string[] = [];

  // 1. Rooms with no inspection data
  for (const room of rooms) {
    if (roomHasNoData(room)) {
      warnings.push(`"${room.room_label}" has no inspection data recorded`);
    }
  }

  // 2. Damage entries without notes (cap at WARN_CAP)
  let notesCount = 0;
  for (const d of damages) {
    if (notesCount >= WARN_CAP) break;
    if (!d.notes || !d.notes.trim()) {
      warnings.push(`Damage entry "${d.damage_type}" in ${d.location} has no description`);
      notesCount++;
    }
  }

  // 3. Damage entries without recommended action (cap at WARN_CAP)
  let actionCount = 0;
  for (const d of damages) {
    if (actionCount >= WARN_CAP) break;
    if (!d.recommended_action || !(d.recommended_action as string).trim()) {
      warnings.push(`Damage entry "${d.damage_type}" in ${d.location} has no recommended action`);
      actionCount++;
    }
  }

  // 4. Inspection Summary overall_condition not filled
  const summary = inspection.inspection_summary as Record<string, unknown> | null | undefined;
  if (!summary || !summary.overall_condition) {
    warnings.push("Inspection Summary has not been filled");
  }

  // 5. Key return mismatches
  const keyEntries = Array.isArray(inspection.key_return_summary)
    ? (inspection.key_return_summary as Array<Record<string, unknown>>)
    : [];
  for (const entry of keyEntries) {
    if (entry.requires_input) {
      const expected = asNum(entry.keys_expected);
      const found = asNum(entry.keys_found);
      if (expected !== found) {
        const missing = expected - found;
        const label = (entry.label as string) || "Unknown";
        warnings.push(`Key mismatch: ${label} — ${missing} key${missing !== 1 ? "s" : ""} missing`);
      }
    }
  }

  // 6. Drive link empty
  if (!inspection.media_drive_link || !(inspection.media_drive_link as string).trim()) {
    warnings.push("Google Drive media link has not been added");
  }

  return warnings;
}
