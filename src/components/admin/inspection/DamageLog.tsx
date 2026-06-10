/**
 * DamageLog — Pre-Existing Damage Log section.
 *
 * Features added over the inline form version:
 * - Severity legend (Cosmetic / Repair Before Re-let / Urgent) at top.
 * - Recommended Action field per item (Select + "Other" free-text).
 *   When "Other" is selected, a text input appears below and the stored value
 *   becomes "Other: {free text}" — not the literal word "Other".
 * - "Auto" badge on items where is_auto_generated === true.
 * - Delete confirmation AlertDialog on every delete.
 */
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { type DamageItem } from "@/types/inspection";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

const RECOMMENDED_ACTION_OPTIONS = [
  "No action needed",
  "Repaint",
  "Touch-up paint",
  "Replace",
  "Repair",
  "Deep clean",
  "Reinstall",
  "Tighten/adjust",
  "Professional assessment needed",
  "Plumber required",
  "Electrician required",
  "Carpenter required",
  "Other",
];

type DamageLogProps = {
  damages: DamageItem[];
  updateDamageItem: (localId: string, field: keyof DamageItem, value: string) => void;
  handleAddDamageItem: () => void;
  handleDeleteDamageItem: (localId: string) => void;
};

export function DamageLog({
  damages,
  updateDamageItem,
  handleAddDamageItem,
  handleDeleteDamageItem,
}: DamageLogProps) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const badge = damages.length > 0 ? (
    <Badge variant="secondary" className="text-xs">{damages.length}</Badge>
  ) : undefined;

  return (
    <>
      <CollapsibleCard
        title="Pre-Existing Damage Log"
        badge={badge}
      >
        {/* Disclaimer */}
        <p className="text-sm text-muted-foreground mb-4">
          Items documented here are <strong>NOT</strong> tenant or platform liability.
        </p>

        {/* Severity legend */}
        <div className="mb-5 flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Severity guide</p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Cosmetic</span> — Surface-level, no urgent action needed
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-amber-600 dark:text-amber-400">Repair Before Re-let</span> — Fix before next tenant moves in
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-destructive">Urgent — Immediate Action</span> — Safety or habitability risk, fix now
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {damages.map((item) => (
            <div key={item.localId} className="relative rounded-lg border p-4">
              {/* Header row: Auto badge + delete button */}
              <div className="absolute right-3 top-3 flex items-center gap-2">
                {item.is_auto_generated && (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground">
                    Auto
                  </Badge>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setPendingDeleteId(item.localId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 pr-16">
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g. Living Room ceiling"
                    value={item.location}
                    onChange={(event) => updateDamageItem(item.localId, "location", event.target.value)}
                    onBlur={(event) => updateDamageItem(item.localId, "location", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Damage Type</Label>
                  <Input
                    placeholder="e.g. Water stain, crack"
                    value={item.damage_type}
                    onChange={(event) => updateDamageItem(item.localId, "damage_type", event.target.value)}
                    onBlur={(event) => updateDamageItem(item.localId, "damage_type", event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Label>Severity</Label>
                <RadioGroup
                  value={item.severity}
                  onValueChange={(value) => updateDamageItem(item.localId, "severity", value)}
                  className="grid gap-3 md:grid-cols-3"
                >
                  {[
                    { value: "cosmetic",            label: "Cosmetic",                  className: "border-primary/20 bg-primary/10 text-primary" },
                    { value: "repair_before_relet", label: "Repair Before Re-let",      className: "border-amber-500/20 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
                    { value: "urgent_immediate",    label: "Urgent — Immediate Action", className: "border-destructive/20 bg-destructive/10 text-destructive" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium",
                        item.severity === option.value ? option.className : "border-border bg-background",
                      )}
                    >
                      <RadioGroupItem value={option.value} />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <div className="mt-4 space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={item.notes}
                  onChange={(event) => updateDamageItem(item.localId, "notes", event.target.value)}
                  onBlur={(event) => updateDamageItem(item.localId, "notes", event.target.value)}
                />
              </div>

              {/* Recommended Action */}
              <div className="mt-4 space-y-2">
                <Label>Recommended Action</Label>
                {(() => {
                  const isOther = item.recommended_action?.startsWith("Other: ") ?? false;
                  const selectValue = isOther
                    ? "Other"
                    : (item.recommended_action ?? "");
                  const otherText = isOther
                    ? (item.recommended_action ?? "").slice(7)
                    : "";
                  return (
                    <>
                      <Select
                        value={selectValue || undefined}
                        onValueChange={(value) => {
                          if (value === "Other") {
                            updateDamageItem(item.localId, "recommended_action", "Other: ");
                          } else {
                            updateDamageItem(item.localId, "recommended_action", value);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select action" />
                        </SelectTrigger>
                        <SelectContent>
                          {RECOMMENDED_ACTION_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isOther && (
                        <Input
                          placeholder="Describe the recommended action…"
                          value={otherText}
                          onChange={(e) => updateDamageItem(item.localId, "recommended_action", `Other: ${e.target.value}`)}
                          onBlur={(e) => updateDamageItem(item.localId, "recommended_action", `Other: ${e.target.value}`)}
                        />
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" onClick={handleAddDamageItem}>
            <Plus className="h-4 w-4" />
            Add Damage Item
          </Button>
        </div>
      </CollapsibleCard>

      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this damage entry?</AlertDialogTitle>
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
                  handleDeleteDamageItem(pendingDeleteId);
                  setPendingDeleteId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
