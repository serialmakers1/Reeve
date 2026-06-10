/**
 * ElectricalSubsection — Electrical inventory + issue tracking subsection
 * inside the Room Features collapsible.
 *
 * Two parts:
 *   1. Inventory (always visible, compact grid) — namespaced flat keys in
 *      room_features JSONB: electrical_fan_count, electrical_fan_brand,
 *      electrical_light_count, electrical_switchboard_count,
 *      electrical_ac_provision_count.
 *   2. Issues (EntryList, starts empty) — stored as room_features.electrical_issues.
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
  DEFAULT_ELECTRICAL_INVENTORY,
  ELECTRICAL_ISSUE_FIELDS,
  newElectricalIssueEntry,
  electricalIssueTitle,
  type ElectricalInventory,
} from "./electricalFields";

// ── Types ─────────────────────────────────────────────────────────────────────

type ElectricalSubsectionProps = {
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

// ── InventoryField helpers ────────────────────────────────────────────────────

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        className="h-9"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        onBlur={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
      />
    </div>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        className="h-9"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ── ElectricalSubsection ──────────────────────────────────────────────────────

export function ElectricalSubsection({
  roomId,
  roomFeatures,
  updateRoomFeature,
}: ElectricalSubsectionProps) {
  const [open, setOpen] = useState(false);

  // ── Inventory values ──────────────────────────────────────────────────────

  const inv: ElectricalInventory = {
    electrical_fan_count:
      (typeof roomFeatures.electrical_fan_count === "number"
        ? roomFeatures.electrical_fan_count
        : Number(roomFeatures.electrical_fan_count) || 0) ??
      DEFAULT_ELECTRICAL_INVENTORY.electrical_fan_count,
    electrical_fan_brand:
      String(roomFeatures.electrical_fan_brand ?? "") ||
      DEFAULT_ELECTRICAL_INVENTORY.electrical_fan_brand,
    electrical_light_count:
      (typeof roomFeatures.electrical_light_count === "number"
        ? roomFeatures.electrical_light_count
        : Number(roomFeatures.electrical_light_count) || 0) ??
      DEFAULT_ELECTRICAL_INVENTORY.electrical_light_count,
    electrical_switchboard_count:
      (typeof roomFeatures.electrical_switchboard_count === "number"
        ? roomFeatures.electrical_switchboard_count
        : Number(roomFeatures.electrical_switchboard_count) || 0) ??
      DEFAULT_ELECTRICAL_INVENTORY.electrical_switchboard_count,
    electrical_ac_provision_count:
      (typeof roomFeatures.electrical_ac_provision_count === "number"
        ? roomFeatures.electrical_ac_provision_count
        : Number(roomFeatures.electrical_ac_provision_count) || 0) ??
      DEFAULT_ELECTRICAL_INVENTORY.electrical_ac_provision_count,
    electrical_light_brand:
      String(roomFeatures.electrical_light_brand ?? ""),
    electrical_light_type:
      String(roomFeatures.electrical_light_type ?? ""),
    electrical_switchboard_brand:
      String(roomFeatures.electrical_switchboard_brand ?? ""),
    electrical_wifi_point:
      String(roomFeatures.electrical_wifi_point ?? ""),
    electrical_wifi_brand:
      String(roomFeatures.electrical_wifi_brand ?? ""),
  };

  const setInv = (key: keyof ElectricalInventory, value: unknown) =>
    updateRoomFeature(roomId, key, value);

  // ── Issue entries ─────────────────────────────────────────────────────────

  const issues = (
    Array.isArray(roomFeatures.electrical_issues)
      ? roomFeatures.electrical_issues
      : []
  ) as Record<string, unknown>[];

  const saveIssues = (next: Record<string, unknown>[]) =>
    updateRoomFeature(roomId, "electrical_issues", next);

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
        <span>Electrical</span>
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
              <NumberField
                label="Ceiling fans"
                value={inv.electrical_fan_count}
                onChange={(v) => setInv("electrical_fan_count", v)}
              />
              <TextField
                label="Fan brand"
                value={inv.electrical_fan_brand}
                placeholder="e.g. Usha, Orient, Crompton"
                onChange={(v) => setInv("electrical_fan_brand", v)}
              />
              <NumberField
                label="Light fixtures"
                value={inv.electrical_light_count}
                onChange={(v) => setInv("electrical_light_count", v)}
              />
              <NumberField
                label="Switchboards"
                value={inv.electrical_switchboard_count}
                onChange={(v) => setInv("electrical_switchboard_count", v)}
              />
              <NumberField
                label="AC provision points"
                value={inv.electrical_ac_provision_count}
                onChange={(v) => setInv("electrical_ac_provision_count", v)}
              />
              <TextField
                label="Light brand"
                value={inv.electrical_light_brand}
                placeholder="e.g. Philips, Syska, Havells"
                onChange={(v) => setInv("electrical_light_brand", v)}
              />
              <TextField
                label="Light type"
                value={inv.electrical_light_type}
                placeholder="e.g. LED panel, tube light, CFL"
                onChange={(v) => setInv("electrical_light_type", v)}
              />
              <TextField
                label="Switchboard brand"
                value={inv.electrical_switchboard_brand}
                placeholder="e.g. Legrand, Havells, Anchor"
                onChange={(v) => setInv("electrical_switchboard_brand", v)}
              />
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Wi-Fi point</Label>
                <Select
                  value={inv.electrical_wifi_point || undefined}
                  onValueChange={(v) => setInv("electrical_wifi_point", v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Y">Yes</SelectItem>
                    <SelectItem value="N">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {inv.electrical_wifi_point === "Y" && (
                <TextField
                  label="Wi-Fi brand / model"
                  value={inv.electrical_wifi_brand}
                  placeholder="e.g. TP-Link, D-Link, Airtel router"
                  onChange={(v) => setInv("electrical_wifi_brand", v)}
                />
              )}
            </div>
          </div>

          {/* ── Issues ── */}
          <div className="space-y-3">
            <SubHeader label="Issues" />
            <EntryList
              entries={issues}
              fields={ELECTRICAL_ISSUE_FIELDS}
              onUpdate={handleIssueUpdate}
              onAdd={() => saveIssues([...issues, newElectricalIssueEntry()])}
              onDelete={handleIssueDelete}
              addLabel="Add issue"
              deleteConfirmText="Delete this electrical issue?"
              emptyText="No issues logged. Tap + to record a fault."
              entryTitle={electricalIssueTitle}
            />
          </div>

        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
