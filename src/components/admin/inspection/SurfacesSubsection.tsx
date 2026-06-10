/**
 * SurfacesSubsection — Walls, Flooring, Ceiling, and False Ceiling subsection
 * inside the Room Features collapsible.
 *
 * All surface data lives inside room_features JSONB:
 *   wall_entries:     WallEntry[]
 *   flooring_entries: FlooringEntry[]
 *   ceiling_entries:  CeilingEntry[]
 *   false_ceiling:    FalseCeilingData (single object)
 *
 * Mutations go through updateRoomFeature(roomId, key, value) which writes to
 * room_features JSONB via queueRoomPatch.
 *
 * The existing six _condition columns at the top of each room (walls_condition,
 * flooring_condition, etc.) are NOT touched here — those are handled by
 * old per-section condition dropdown loop in InspectionForm.
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  WALL_FIELDS,
  FLOORING_FIELDS,
  CEILING_FIELDS,
  newWallEntry,
  newCustomWallEntry,
  newFlooringEntry,
  newCustomFlooringEntry,
  newCeilingEntry,
  newCustomCeilingEntry,
  FALSE_CEILING_TYPES,
  FALSE_CEILING_MATERIALS,
  DEFAULT_FALSE_CEILING,
  CONDITION_OPTIONS,
  type FalseCeilingData,
} from "./surfaceFields";

// ── Types ─────────────────────────────────────────────────────────────────────

type SurfacesSubsectionProps = {
  roomId: string;
  roomFeatures: Record<string, unknown>;
  updateRoomFeature: (roomId: string, key: string, value: unknown) => void;
};

// ── Sub-section header (consistent with other Room Features sub-sections) ─────

function SubHeader({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
      {label}
    </p>
  );
}

// ── FalseCeilingBlock ─────────────────────────────────────────────────────────

function FalseCeilingBlock({
  data,
  onChange,
}: {
  data: FalseCeilingData;
  onChange: (patch: Partial<FalseCeilingData>) => void;
}) {
  const hasExtras =
    data.false_ceiling_type !== "" &&
    data.false_ceiling_type !== "none";

  const conditionNotGood =
    data.condition !== "" &&
    data.condition !== "good" &&
    data.condition !== undefined;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">False ceiling</Label>
        <Select
          value={data.false_ceiling_type || undefined}
          onValueChange={(v) =>
            onChange({ false_ceiling_type: v as FalseCeilingData["false_ceiling_type"] })
          }
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {FALSE_CEILING_TYPES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasExtras && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Material</Label>
            <Select
              value={data.material || undefined}
              onValueChange={(v) => onChange({ material: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {FALSE_CEILING_MATERIALS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Condition</Label>
            <Select
              value={data.condition || undefined}
              onValueChange={(v) => onChange({ condition: v })}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {conditionNotGood && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                rows={2}
                className="resize-none text-sm"
                placeholder="Describe damage or issue"
                value={data.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                onBlur={(e) => onChange({ notes: e.target.value })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── SurfacesSubsection ────────────────────────────────────────────────────────

export function SurfacesSubsection({
  roomId,
  roomFeatures,
  updateRoomFeature,
}: SurfacesSubsectionProps) {
  const [open, setOpen] = useState(false);

  // ── Entry arrays from room_features ──────────────────────────────────────
  const wallEntries = (
    Array.isArray(roomFeatures.wall_entries) ? roomFeatures.wall_entries : []
  ) as Record<string, unknown>[];

  const flooringEntries = (
    Array.isArray(roomFeatures.flooring_entries) ? roomFeatures.flooring_entries : []
  ) as Record<string, unknown>[];

  const ceilingEntries = (
    Array.isArray(roomFeatures.ceiling_entries) ? roomFeatures.ceiling_entries : []
  ) as Record<string, unknown>[];

  const falseCeiling: FalseCeilingData = {
    ...DEFAULT_FALSE_CEILING,
    ...(roomFeatures.false_ceiling &&
    typeof roomFeatures.false_ceiling === "object" &&
    !Array.isArray(roomFeatures.false_ceiling)
      ? (roomFeatures.false_ceiling as Partial<FalseCeilingData>)
      : {}),
  };

  // ── Updaters ──────────────────────────────────────────────────────────────

  const updateWallEntries = (next: Record<string, unknown>[]) =>
    updateRoomFeature(roomId, "wall_entries", next);

  const updateFlooringEntries = (next: Record<string, unknown>[]) =>
    updateRoomFeature(roomId, "flooring_entries", next);

  const updateCeilingEntries = (next: Record<string, unknown>[]) =>
    updateRoomFeature(roomId, "ceiling_entries", next);

  const updateFalseCeiling = (patch: Partial<FalseCeilingData>) =>
    updateRoomFeature(roomId, "false_ceiling", { ...falseCeiling, ...patch });

  // ── Entry title helpers ───────────────────────────────────────────────────

  const wallTitle = (entry: Record<string, unknown>, i: number): string => {
    if (entry.is_custom) return String(entry.custom_label || `Wall ${i + 1}`);
    const wallLabelMap: Record<string, string> = {
      road_facing:     "Road-facing wall",
      building_facing: "Building-facing wall",
      left_wall:       "Left wall",
      right_wall:      "Right wall",
      all_walls:       "All walls",
      partition_wall:  "Partition wall",
    };
    return wallLabelMap[entry.which_wall as string] ?? `Wall ${i + 1}`;
  };

  const flooringTitle = (entry: Record<string, unknown>, i: number): string => {
    if (entry.is_custom) return String(entry.custom_label || `Flooring zone ${i + 1}`);
    const zoneMap: Record<string, string> = {
      entire_room:   "Entire room",
      near_entrance: "Near entrance",
      near_window:   "Near window",
      near_bathroom: "Near bathroom",
      corner_area:   "Corner area",
    };
    return zoneMap[entry.flooring_zone as string] ?? `Flooring zone ${i + 1}`;
  };

  const ceilingTitle = (entry: Record<string, unknown>, i: number): string => {
    if (entry.is_custom) return String(entry.custom_label || `Ceiling area ${i + 1}`);
    const areaMap: Record<string, string> = {
      entire_ceiling:      "Entire ceiling",
      above_bed_area:      "Above bed area",
      above_kitchen_slab:  "Above kitchen slab",
      above_bathroom_area: "Above bathroom area",
      corner_area:         "Corner area",
    };
    return areaMap[entry.ceiling_area as string] ?? `Ceiling area ${i + 1}`;
  };

  // ── Generic entry mutation helpers ────────────────────────────────────────

  const updateEntry = (
    arr: Record<string, unknown>[],
    save: (next: Record<string, unknown>[]) => void,
  ) => (index: number, key: string, value: unknown) => {
    const next = arr.map((e, i) => (i === index ? { ...e, [key]: value } : e));
    save(next);
  };

  const deleteEntry = (
    arr: Record<string, unknown>[],
    save: (next: Record<string, unknown>[]) => void,
  ) => (index: number) => {
    save(arr.filter((_, i) => i !== index));
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger className="flex w-full min-h-[44px] cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
        <span>Surfaces — Walls, Flooring & Ceiling</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-5 pt-3 space-y-6">

          {/* ── Walls ── */}
          <div className="space-y-3">
            <SubHeader label="Walls" />
            <EntryList
              entries={wallEntries}
              fields={WALL_FIELDS}
              onUpdate={updateEntry(wallEntries, updateWallEntries)}
              onAdd={() => updateWallEntries([...wallEntries, newWallEntry()])}
              onAddCustom={() => updateWallEntries([...wallEntries, newCustomWallEntry()])}
              onDelete={deleteEntry(wallEntries, updateWallEntries)}
              addLabel="Add wall"
              deleteConfirmText="Delete this wall entry?"
              emptyText="No wall entries. Tap + to document wall condition."
              entryTitle={wallTitle}
              allowCustom
            />
          </div>

          {/* ── Flooring ── */}
          <div className="space-y-3">
            <SubHeader label="Flooring" />
            <EntryList
              entries={flooringEntries}
              fields={FLOORING_FIELDS}
              onUpdate={updateEntry(flooringEntries, updateFlooringEntries)}
              onAdd={() => updateFlooringEntries([...flooringEntries, newFlooringEntry()])}
              onAddCustom={() => updateFlooringEntries([...flooringEntries, newCustomFlooringEntry()])}
              onDelete={deleteEntry(flooringEntries, updateFlooringEntries)}
              addLabel="Add flooring zone"
              deleteConfirmText="Delete this flooring entry?"
              emptyText="No flooring entries. Tap + to document flooring condition."
              entryTitle={flooringTitle}
              allowCustom
            />
          </div>

          {/* ── Ceiling ── */}
          <div className="space-y-3">
            <SubHeader label="Ceiling" />
            <EntryList
              entries={ceilingEntries}
              fields={CEILING_FIELDS}
              onUpdate={updateEntry(ceilingEntries, updateCeilingEntries)}
              onAdd={() => updateCeilingEntries([...ceilingEntries, newCeilingEntry()])}
              onAddCustom={() => updateCeilingEntries([...ceilingEntries, newCustomCeilingEntry()])}
              onDelete={deleteEntry(ceilingEntries, updateCeilingEntries)}
              addLabel="Add ceiling area"
              deleteConfirmText="Delete this ceiling entry?"
              emptyText="No ceiling entries. Tap + to document ceiling condition."
              entryTitle={ceilingTitle}
              allowCustom
            />
          </div>

          {/* ── False Ceiling ── */}
          <div className="space-y-3">
            <SubHeader label="False Ceiling" />
            <FalseCeilingBlock data={falseCeiling} onChange={updateFalseCeiling} />
          </div>

        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
