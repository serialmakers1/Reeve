/**
 * KeyReturnCard — Key handover tracking.
 *
 * Data stored in `inspection.key_return_summary` as a JSONB array of KeyReturnEntry.
 * Shape per entry: { id, label, requires_input, keys_expected, keys_found }
 *
 * NOTE: `InspectionRecord.key_return_summary` is a new optional field pending DB migration
 * (ADD COLUMN key_return_summary JSONB on property_inspections).
 * Until the migration runs, Supabase silently ignores writes — no crash.
 *
 * Pre-populated with one "Main Door" entry when column is null or empty.
 */
import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { InspectionRecord, LocalRoom } from "@/types/inspection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CollapsibleCard } from "./CollapsibleCard";

export type KeyReturnEntry = {
  id: string;
  label: string;
  requires_input: boolean;
  keys_expected: number;
  keys_found: number;
};

const DEFAULT_ENTRIES: KeyReturnEntry[] = [
  { id: "main-door-default", label: "Main Door", requires_input: false, keys_expected: 0, keys_found: 0 },
];

type KeyReturnCardProps = {
  inspection: InspectionRecord;
  rooms: LocalRoom[];
  updateInspectionField: (field: keyof InspectionRecord, value: unknown) => void;
};

export function KeyReturnCard({ inspection, updateInspectionField }: KeyReturnCardProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const entries = useMemo<KeyReturnEntry[]>(() => {
    const raw = inspection.key_return_summary;
    if (!raw || !Array.isArray(raw) || raw.length === 0) return DEFAULT_ENTRIES;
    return raw as KeyReturnEntry[];
  }, [inspection.key_return_summary]);

  const save = (next: KeyReturnEntry[]) => {
    updateInspectionField("key_return_summary", next);
  };

  const updateEntry = (id: string, patch: Partial<KeyReturnEntry>) => {
    save(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const addEntry = () => {
    save([
      ...entries,
      { id: crypto.randomUUID(), label: "", requires_input: false, keys_expected: 0, keys_found: 0 },
    ]);
  };

  const deleteEntry = (id: string) => {
    save(entries.filter((e) => e.id !== id));
  };

  // Count entries with key discrepancies
  const missingCount = entries.filter(
    (e) => e.requires_input && e.keys_expected !== e.keys_found,
  ).length;

  const badge = missingCount > 0 ? (
    <Badge variant="destructive" className="text-xs">{missingCount} missing</Badge>
  ) : undefined;

  return (
    <>
      <CollapsibleCard title="Key Return" badge={badge}>
        <div className="space-y-3">
          {entries.map((entry) => {
            const missing = entry.requires_input
              ? entry.keys_expected - entry.keys_found
              : 0;

            return (
              <div
                key={entry.id}
                className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_auto]"
              >
                <div className="space-y-3">
                  {/* Label */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Key / Lock Label</Label>
                    <Input
                      placeholder="e.g. Main Door, Bedroom 1 Lock, Kitchen Top Left"
                      value={entry.label}
                      onChange={(e) => updateEntry(entry.id, { label: e.target.value })}
                      onBlur={(e) => updateEntry(entry.id, { label: e.target.value })}
                    />
                  </div>

                  {/* Requires key input toggle */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`requires_${entry.id}`}
                      checked={entry.requires_input}
                      onCheckedChange={(checked) =>
                        updateEntry(entry.id, { requires_input: !!checked })
                      }
                    />
                    <label
                      htmlFor={`requires_${entry.id}`}
                      className="text-sm cursor-pointer"
                    >
                      Track key count
                    </label>
                  </div>

                  {/* Expected / Found — shown only when track key count is on */}
                  {entry.requires_input && (
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Keys Expected</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-24"
                          value={entry.keys_expected}
                          onChange={(e) =>
                            updateEntry(entry.id, { keys_expected: Number(e.target.value) || 0 })
                          }
                          onBlur={(e) =>
                            updateEntry(entry.id, { keys_expected: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Keys Found</Label>
                        <Input
                          type="number"
                          min={0}
                          className="h-9 w-24"
                          value={entry.keys_found}
                          onChange={(e) =>
                            updateEntry(entry.id, { keys_found: Number(e.target.value) || 0 })
                          }
                          onBlur={(e) =>
                            updateEntry(entry.id, { keys_found: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      {missing > 0 && (
                        <Badge variant="destructive" className="self-end mb-0.5">
                          {missing} missing
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <div className="flex items-start justify-end pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDeleteId(entry.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button type="button" variant="outline" onClick={addEntry}>
            <Plus className="h-4 w-4" />
            Add key entry
          </Button>
        </div>
      </CollapsibleCard>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this key entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDeleteId) {
                  deleteEntry(pendingDeleteId);
                  setPendingDeleteId(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
