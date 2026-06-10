/**
 * useConditionSnapshot — Computes derived conditions for ALL rooms and writes
 * them as a snapshot to the DB (via queueRoomPatch) and in-memory (via setRooms).
 *
 * Called at two points:
 *   1. handleMarkCompleted — before status update
 *   2. ExportReportDialog onBeforeExport — before PDF generation
 *
 * The in-memory setRooms update ensures the PDF payload (payloadBase.rooms) has
 * the correct derived _condition columns, since RoomsSection reads them directly.
 *
 * The ?? fallback keeps existing DB values for rooms not yet assessed in the
 * new entry format — prevents data loss for in-progress inspections.
 */
import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LocalRoom } from "@/types/inspection";
import {
  deriveConditions,
  concatenateEntryNotes,
} from "@/components/admin/inspection/deriveConditions";

// ── Location label maps for notes concatenation ───────────────────────────────

const WALL_LOCATION_LABELS: Record<string, string> = {
  road_facing:     "Road-facing wall",
  building_facing: "Building-facing wall",
  left_wall:       "Left wall",
  right_wall:      "Right wall",
  all_walls:       "All walls",
  partition_wall:  "Partition wall",
};

const FLOORING_ZONE_LABELS: Record<string, string> = {
  entire_room:   "Entire room",
  near_entrance: "Near entrance",
  near_window:   "Near window",
  near_bathroom: "Near bathroom",
  corner_area:   "Corner area",
};

const CEILING_AREA_LABELS: Record<string, string> = {
  entire_ceiling:       "Entire ceiling",
  above_bed_area:       "Above bed area",
  above_kitchen_slab:   "Above kitchen slab",
  above_bathroom_area:  "Above bathroom area",
  corner_area:          "Corner area",
};

const DW_ITEM_LABELS: Record<string, string> = {
  main_door:     "Main Door",
  room_door:     "Room Door",
  bathroom_door: "Bathroom Door",
  window:        "Window",
  sliding_door:  "Sliding Door",
  french_door:   "French Door",
  balcony_door:  "Balcony Door",
};

const ELEC_ITEM_LABELS: Record<string, string> = {
  fan:          "Ceiling fan",
  light:        "Light fixture",
  switchboard:  "Switchboard",
  mcb_db:       "MCB / DB box",
  ac_point:     "AC point",
  exhaust_fan:  "Exhaust fan",
  geyser_point: "Geyser point",
  socket:       "Socket",
  other:        "Other",
};

const PLUMBING_ITEM_LABELS: Record<string, string> = {
  tap:          "Tap / faucet",
  pipe_joint:   "Pipe / joint",
  drain:        "Drain",
  flush:        "Flush mechanism",
  geyser:       "Geyser",
  sink:         "Sink / basin",
  shower:       "Shower",
  water_supply: "Water supply point",
  other:        "Other",
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useConditionSnapshot(
  rooms: LocalRoom[],
  setRooms: Dispatch<SetStateAction<LocalRoom[]>>,
  queueRoomPatch: (roomId: string, patch: Record<string, unknown>) => void,
) {
  const writeConditionSnapshot = useCallback(async () => {
    for (const room of rooms) {
      const derived = deriveConditions(room);
      const rf = (room.room_features as Record<string, unknown>) ?? {};

      // ── Condition columns ── (fall back to existing value if not assessed)
      const patch: Record<string, unknown> = {
        walls_condition:
          derived.walls.condition ?? room.walls_condition,
        flooring_condition:
          derived.flooring.condition ?? room.flooring_condition,
        ceiling_condition:
          derived.ceiling.condition ?? room.ceiling_condition,
        doors_windows_condition:
          derived.doorsWindows.condition ?? room.doors_windows_condition,
        electrical_condition:
          derived.electrical.condition ?? room.electrical_condition,
        plumbing_condition:
          derived.plumbing.condition ?? room.plumbing_condition,
        paint_condition:
          derived.paintCondition ?? room.paint_condition,
      };

      // ── Notes columns — only write when entries have notes ──
      const wallsNotes = concatenateEntryNotes(rf.wall_entries, "which_wall", WALL_LOCATION_LABELS);
      if (wallsNotes !== null) patch.walls_notes = wallsNotes;

      const flooringNotes = concatenateEntryNotes(rf.flooring_entries, "flooring_zone", FLOORING_ZONE_LABELS);
      if (flooringNotes !== null) patch.flooring_notes = flooringNotes;

      const ceilingNotes = concatenateEntryNotes(rf.ceiling_entries, "ceiling_area", CEILING_AREA_LABELS);
      if (ceilingNotes !== null) patch.ceiling_notes = ceilingNotes;

      const dwNotes = concatenateEntryNotes(rf.door_window_entries, "item_type", DW_ITEM_LABELS);
      if (dwNotes !== null) patch.doors_windows_notes = dwNotes;

      const elNotes = concatenateEntryNotes(rf.electrical_issues, "item", ELEC_ITEM_LABELS);
      if (elNotes !== null) patch.electrical_notes = elNotes;

      const plNotes = concatenateEntryNotes(rf.plumbing_issues, "item", PLUMBING_ITEM_LABELS);
      if (plNotes !== null) patch.plumbing_notes = plNotes;

      // Write to DB (queued) and update in-memory state
      queueRoomPatch(room.id, patch);
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, ...patch } : r)),
      );
    }
  }, [rooms, setRooms, queueRoomPatch]);

  return { writeConditionSnapshot };
}
