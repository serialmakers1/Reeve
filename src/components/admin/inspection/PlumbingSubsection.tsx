/**
 * PlumbingSubsection — Plumbing inventory + issue tracking subsection
 * inside the Room Features collapsible.
 *
 * Two parts:
 *   1. Inventory (always visible, compact form) — new namespaced flat keys in
 *      room_features JSONB: plumbing_tap_count, plumbing_shower_present,
 *      plumbing_hot_cold_mixer. These are NEW fields with no legacy equivalents
 *      to remove from room-type branches.
 *   2. Issues (EntryList, starts empty) — stored as room_features.plumbing_issues.
 *
 * Room-type-specific plumbing (geyser, flush, bathroom sink, kitchen sink,
 * utility sink on balcony) remains in its respective room-type branch — unchanged.
 *
 * Mutations go through updateRoomFeature(roomId, key, value).
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EntryList } from "./EntryList";
import {
  DEFAULT_PLUMBING_INVENTORY,
  PLUMBING_ISSUE_FIELDS,
  SHOWER_PRESENT_OPTIONS,
  HOT_COLD_MIXER_OPTIONS,
  newPlumbingIssueEntry,
  plumbingIssueTitle,
  type PlumbingInventory,
} from "./plumbingFields";

// ── Types ─────────────────────────────────────────────────────────────────────

type PlumbingSubsectionProps = {
  roomId: string;
  roomFeatures: Record<string, unknown>;
  updateRoomFeature: (roomId: string, key: string, value: unknown) => void;
};

// ── Sub-section header ────────────────────────────────────────────────────────

function SubHeader({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {label}
    </p>
  );
}

// ── PlumbingSubsection ────────────────────────────────────────────────────────

export function PlumbingSubsection({
  roomId,
  roomFeatures,
  updateRoomFeature,
}: PlumbingSubsectionProps) {
  const [open, setOpen] = useState(false);

  // ── Inventory values ──────────────────────────────────────────────────────

  const inv: PlumbingInventory = {
    plumbing_tap_count:
      (typeof roomFeatures.plumbing_tap_count === "number"
        ? roomFeatures.plumbing_tap_count
        : Number(roomFeatures.plumbing_tap_count) || 0) ??
      DEFAULT_PLUMBING_INVENTORY.plumbing_tap_count,
    plumbing_shower_present:
      String(roomFeatures.plumbing_shower_present ?? "") ||
      DEFAULT_PLUMBING_INVENTORY.plumbing_shower_present,
    plumbing_hot_cold_mixer:
      String(roomFeatures.plumbing_hot_cold_mixer ?? "") ||
      DEFAULT_PLUMBING_INVENTORY.plumbing_hot_cold_mixer,
  };

  const setInv = (key: keyof PlumbingInventory, value: unknown) =>
    updateRoomFeature(roomId, key, value);

  // ── Issue entries ─────────────────────────────────────────────────────────

  const issues = (
    Array.isArray(roomFeatures.plumbing_issues)
      ? roomFeatures.plumbing_issues
      : []
  ) as Record<string, unknown>[];

  const saveIssues = (next: Record<string, unknown>[]) =>
    updateRoomFeature(roomId, "plumbing_issues", next);

  const handleIssueUpdate = (index: number, key: string, value: unknown) => {
    const next = issues.map((e, i) => (i === index ? { ...e, [key]: value } : e));
    saveIssues(next);
  };

  const handleIssueDelete = (index: number) => {
    saveIssues(issues.filter((_, i) => i !== index));
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger className="flex w-full min-h-[44px] cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
        <span>Plumbing</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-5 pt-3 space-y-6">

          {/* ── Inventory ── */}
          <div className="space-y-3">
            <SubHeader label="Inventory" />
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Total taps / faucets</Label>
                <Input
                  type="number"
                  min={0}
                  className="h-9"
                  value={inv.plumbing_tap_count}
                  onChange={(e) =>
                    setInv("plumbing_tap_count", Math.max(0, Number(e.target.value) || 0))
                  }
                  onBlur={(e) =>
                    setInv("plumbing_tap_count", Math.max(0, Number(e.target.value) || 0))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Shower</Label>
                <Select
                  value={inv.plumbing_shower_present || undefined}
                  onValueChange={(v) => setInv("plumbing_shower_present", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {SHOWER_PRESENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Hot + cold mixer</Label>
                <Select
                  value={inv.plumbing_hot_cold_mixer || undefined}
                  onValueChange={(v) => setInv("plumbing_hot_cold_mixer", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {HOT_COLD_MIXER_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ── Issues ── */}
          <div className="space-y-3">
            <SubHeader label="Issues" />
            <EntryList
              entries={issues}
              fields={PLUMBING_ISSUE_FIELDS}
              onUpdate={handleIssueUpdate}
              onAdd={() => saveIssues([...issues, newPlumbingIssueEntry()])}
              onDelete={handleIssueDelete}
              addLabel="Add issue"
              deleteConfirmText="Delete this plumbing issue?"
              emptyText="No issues logged. Tap + to record a leak, blockage, or fault."
              entryTitle={plumbingIssueTitle}
            />
          </div>

        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
