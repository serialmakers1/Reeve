/**
 * DoorsWindowsSubsection — Per-item door and window documentation subsection
 * inside the Room Features collapsible.
 *
 * All door/window data lives inside room_features JSONB:
 *   door_window_entries: DoorWindowEntry[]
 *
 * Every door and window gets its own entry (item_type, frame/shutter condition,
 * lock/latch status, glass condition, mosquito mesh). No inventory section —
 * each item is individually documented.
 *
 * Mutations go through updateRoomFeature(roomId, key, value).
 */
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EntryList } from "./EntryList";
import {
  DOOR_WINDOW_FIELDS,
  newDoorWindowEntry,
  newCustomDoorWindowEntry,
  doorWindowEntryTitle,
} from "./doorWindowFields";

// ── Types ─────────────────────────────────────────────────────────────────────

type DoorsWindowsSubsectionProps = {
  roomId: string;
  roomFeatures: Record<string, unknown>;
  updateRoomFeature: (roomId: string, key: string, value: unknown) => void;
};

// ── DoorsWindowsSubsection ────────────────────────────────────────────────────

export function DoorsWindowsSubsection({
  roomId,
  roomFeatures,
  updateRoomFeature,
}: DoorsWindowsSubsectionProps) {
  const [open, setOpen] = useState(false);

  const entries = (
    Array.isArray(roomFeatures.door_window_entries)
      ? roomFeatures.door_window_entries
      : []
  ) as Record<string, unknown>[];

  const save = (next: Record<string, unknown>[]) =>
    updateRoomFeature(roomId, "door_window_entries", next);

  const handleUpdate = (index: number, key: string, value: unknown) => {
    const next = entries.map((e, i) => (i === index ? { ...e, [key]: value } : e));
    save(next);
  };

  const handleDelete = (index: number) => {
    save(entries.filter((_, i) => i !== index));
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border">
      <CollapsibleTrigger className="flex w-full min-h-[44px] cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors">
        <span>Doors &amp; Windows</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-5 pt-3">
          <EntryList
            entries={entries}
            fields={DOOR_WINDOW_FIELDS}
            onUpdate={handleUpdate}
            onAdd={() => save([...entries, newDoorWindowEntry()])}
            onAddCustom={() => save([...entries, newCustomDoorWindowEntry()])}
            onDelete={handleDelete}
            addLabel="Add door / window"
            deleteConfirmText="Delete this door / window entry?"
            emptyText="No entries. Tap + to document each door and window."
            entryTitle={doorWindowEntryTitle}
            allowCustom
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
