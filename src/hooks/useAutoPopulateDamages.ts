import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LocalRoom, DamageItem } from "@/types/inspection";

// ── Internal types ────────────────────────────────────────────────────────────

type AutoSeverity = "repair_before_relet" | "urgent_immediate";

type DesiredEntry = {
  compositeKey: string;
  location: string;
  damage_type: string;
  severity: AutoSeverity;
  source_ref: { room_id: string; field_key: string };
};

// ── Severity maps ─────────────────────────────────────────────────────────────

const CONDITION_TO_SEVERITY: Record<string, AutoSeverity | null> = {
  good:            null,
  minor_wear:      null,
  moderate_damage: "repair_before_relet",
  severe_damage:   "urgent_immediate",
};

const ELECTRICAL_STATUS_SEVERITY: Record<string, AutoSeverity | null> = {
  working:     null,
  flickering:  null,
  loose:       "repair_before_relet",
  not_working: "repair_before_relet",
  damaged:     "repair_before_relet",
  missing:     "urgent_immediate",
};

const PLUMBING_STATUS_SEVERITY: Record<string, AutoSeverity | null> = {
  ok:          null,
  leaking:     null,
  slow_drain:  null,
  blocked:     "repair_before_relet",
  not_working: "repair_before_relet",
  damaged:     "repair_before_relet",
  missing:     "urgent_immediate",
};

// ── Label maps ────────────────────────────────────────────────────────────────

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
  entire_ceiling:      "Entire ceiling",
  above_bed_area:      "Above bed area",
  above_kitchen_slab:  "Above kitchen slab",
  above_bathroom_area: "Above bathroom area",
  corner_area:         "Corner area",
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

const DW_FIELD_LABELS: Record<string, string> = {
  frame_condition:   "frame",
  shutter_condition: "shutter",
  lock_latch:        "lock/latch",
  glass_condition:   "glass",
  mosquito_mesh:     "mosquito mesh",
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
  other:        "Electrical item",
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
  other:        "Plumbing item",
};

const DW_TRIGGER_FIELDS = [
  "frame_condition",
  "shutter_condition",
  "lock_latch",
  "glass_condition",
  "mosquito_mesh",
] as const;

// ── Door/window field severity ────────────────────────────────────────────────

function dwFieldSeverity(fieldName: string, value: string): AutoSeverity | null {
  if (fieldName === "frame_condition" || fieldName === "shutter_condition") {
    return CONDITION_TO_SEVERITY[value] ?? null;
  }
  if (fieldName === "lock_latch") {
    if (value === "broken") return "repair_before_relet";
    if (value === "missing") return "urgent_immediate";
    return null;
  }
  if (fieldName === "glass_condition") {
    if (value === "cracked") return "repair_before_relet";
    if (value === "broken") return "urgent_immediate";
    return null;
  }
  if (fieldName === "mosquito_mesh") {
    // present_torn is cosmetic — no auto-damage
    if (value === "missing") return "repair_before_relet";
    return null;
  }
  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function entryId(entry: Record<string, unknown>, idx: number): string {
  return (entry.localId as string) || (entry.id as string) || String(idx);
}

// ── Scanner ───────────────────────────────────────────────────────────────────

function scanRoomsForTriggers(rooms: LocalRoom[]): Map<string, DesiredEntry> {
  const desired = new Map<string, DesiredEntry>();

  for (const room of rooms) {
    const rf = (room.room_features as Record<string, unknown>) ?? {};
    const roomLabel = room.room_label;

    // Wall entries
    const wallEntries = asArray(rf.wall_entries);
    for (let i = 0; i < wallEntries.length; i++) {
      const entry = wallEntries[i];
      const condition = entry.condition as string | undefined;
      if (!condition) continue;
      const severity = CONDITION_TO_SEVERITY[condition];
      if (!severity) continue;
      const eid = entryId(entry, i);
      const fieldKey = `wall_entries[${eid}].condition`;
      const cKey = `${room.id}:${fieldKey}`;
      const rawLoc = (entry.which_wall as string | undefined) ?? "";
      const locLabel = WALL_LOCATION_LABELS[rawLoc] || rawLoc || "Wall";
      desired.set(cKey, {
        compositeKey: cKey,
        location: `${roomLabel} — ${locLabel}`,
        damage_type: "Wall Condition",
        severity,
        source_ref: { room_id: room.id, field_key: fieldKey },
      });
    }

    // Flooring entries
    const floorEntries = asArray(rf.flooring_entries);
    for (let i = 0; i < floorEntries.length; i++) {
      const entry = floorEntries[i];
      const condition = entry.condition as string | undefined;
      if (!condition) continue;
      const severity = CONDITION_TO_SEVERITY[condition];
      if (!severity) continue;
      const eid = entryId(entry, i);
      const fieldKey = `flooring_entries[${eid}].condition`;
      const cKey = `${room.id}:${fieldKey}`;
      const rawZone = (entry.flooring_zone as string | undefined) ?? "";
      const zoneLabel = FLOORING_ZONE_LABELS[rawZone] || rawZone || "Flooring";
      desired.set(cKey, {
        compositeKey: cKey,
        location: `${roomLabel} — ${zoneLabel}`,
        damage_type: "Flooring Condition",
        severity,
        source_ref: { room_id: room.id, field_key: fieldKey },
      });
    }

    // Ceiling entries — two independent triggers per entry: condition AND seepage
    const ceilEntries = asArray(rf.ceiling_entries);
    for (let i = 0; i < ceilEntries.length; i++) {
      const entry = ceilEntries[i];
      const eid = entryId(entry, i);
      const rawArea = (entry.ceiling_area as string | undefined) ?? "";
      const areaLabel = CEILING_AREA_LABELS[rawArea] || rawArea || "Ceiling";

      const condition = entry.condition as string | undefined;
      const condSeverity = condition ? CONDITION_TO_SEVERITY[condition] : null;
      if (condSeverity) {
        const fieldKey = `ceiling_entries[${eid}].condition`;
        const cKey = `${room.id}:${fieldKey}`;
        desired.set(cKey, {
          compositeKey: cKey,
          location: `${roomLabel} — ${areaLabel}`,
          damage_type: "Ceiling Condition",
          severity: condSeverity,
          source_ref: { room_id: room.id, field_key: fieldKey },
        });
      }

      const seepage = entry.seepage_dampness as string | undefined;
      if (seepage === "active_dampness" || seepage === "seepage_suspected") {
        const fieldKey = `ceiling_entries[${eid}].seepage_dampness`;
        const cKey = `${room.id}:${fieldKey}`;
        desired.set(cKey, {
          compositeKey: cKey,
          location: `${roomLabel} — ${areaLabel}`,
          damage_type: `${areaLabel} — Seepage/Dampness`,
          severity: "repair_before_relet",
          source_ref: { room_id: room.id, field_key: fieldKey },
        });
      }
    }

    // False ceiling (single object, not an array)
    const fc = (rf.false_ceiling as Record<string, unknown> | null) ?? null;
    const fcActive =
      fc !== null &&
      fc.false_ceiling_type !== "none" &&
      fc.false_ceiling_type !== "" &&
      fc.false_ceiling_type !== undefined;
    if (fcActive && fc) {
      const condition = fc.condition as string | undefined;
      if (condition) {
        const severity = CONDITION_TO_SEVERITY[condition];
        if (severity) {
          const fieldKey = "false_ceiling.condition";
          const cKey = `${room.id}:${fieldKey}`;
          desired.set(cKey, {
            compositeKey: cKey,
            location: `${roomLabel} — False Ceiling`,
            damage_type: "Ceiling Condition",
            severity,
            source_ref: { room_id: room.id, field_key: fieldKey },
          });
        }
      }
    }

    // Door/window entries — multiple triggerable fields per entry
    const dwEntries = asArray(rf.door_window_entries);
    for (let i = 0; i < dwEntries.length; i++) {
      const entry = dwEntries[i];
      const eid = entryId(entry, i);
      const rawItem = (entry.item_type as string | undefined) ?? "";
      const itemLabel = DW_ITEM_LABELS[rawItem] || rawItem || "Door/Window";
      for (const fieldName of DW_TRIGGER_FIELDS) {
        const value = entry[fieldName] as string | undefined;
        if (!value) continue;
        const severity = dwFieldSeverity(fieldName, value);
        if (!severity) continue;
        const fieldKey = `door_window_entries[${eid}].${fieldName}`;
        const cKey = `${room.id}:${fieldKey}`;
        const fieldLabel = DW_FIELD_LABELS[fieldName] || fieldName;
        desired.set(cKey, {
          compositeKey: cKey,
          location: `${roomLabel} — ${itemLabel}`,
          damage_type: `${itemLabel} — ${fieldLabel}`,
          severity,
          source_ref: { room_id: room.id, field_key: fieldKey },
        });
      }
    }

    // Electrical issues
    const elIssues = asArray(rf.electrical_issues);
    for (let i = 0; i < elIssues.length; i++) {
      const entry = elIssues[i];
      const status = entry.status as string | undefined;
      if (!status) continue;
      const severity = ELECTRICAL_STATUS_SEVERITY[status];
      if (!severity) continue;
      const eid = entryId(entry, i);
      const fieldKey = `electrical_issues[${eid}].status`;
      const cKey = `${room.id}:${fieldKey}`;
      const rawItem = (entry.item as string | undefined) ?? "";
      const itemLabel = ELEC_ITEM_LABELS[rawItem] || rawItem || "Electrical item";
      desired.set(cKey, {
        compositeKey: cKey,
        location: `${roomLabel} — ${itemLabel}`,
        damage_type: "Electrical Issue",
        severity,
        source_ref: { room_id: room.id, field_key: fieldKey },
      });
    }

    // Plumbing issues
    const plIssues = asArray(rf.plumbing_issues);
    for (let i = 0; i < plIssues.length; i++) {
      const entry = plIssues[i];
      const status = entry.status as string | undefined;
      if (!status) continue;
      const severity = PLUMBING_STATUS_SEVERITY[status];
      if (!severity) continue;
      const eid = entryId(entry, i);
      const fieldKey = `plumbing_issues[${eid}].status`;
      const cKey = `${room.id}:${fieldKey}`;
      const rawItem = (entry.item as string | undefined) ?? "";
      const itemLabel = PLUMBING_ITEM_LABELS[rawItem] || rawItem || "Plumbing item";
      desired.set(cKey, {
        compositeKey: cKey,
        location: `${roomLabel} — ${itemLabel}`,
        damage_type: "Plumbing Issue",
        severity,
        source_ref: { room_id: room.id, field_key: fieldKey },
      });
    }
  }

  return desired;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAutoPopulateDamages(
  rooms: LocalRoom[],
  damages: DamageItem[],
  setDamages: Dispatch<SetStateAction<DamageItem[]>>,
  queueInspectionPatch: (patch: Record<string, unknown>) => void,
  scheduleSave: () => void,
): void {
  const damagesRef = useRef<DamageItem[]>(damages);

  // Sync damagesRef every render so the main effect always sees latest damages
  // without needing damages in its dependency array (avoids circular updates).
  // Registered first so it runs before the main effect on the same render.
  useEffect(() => {
    damagesRef.current = damages;
  });

  useEffect(() => {
    const desired = scanRoomsForTriggers(rooms);
    const currentRoomIds = new Set(rooms.map((r) => r.id));
    const current = damagesRef.current;

    const next: DamageItem[] = [];
    let changed = false;

    // Step 1 — reconcile existing items against desired map
    for (const item of current) {
      // Manual entries and furniture entries pass through untouched
      if (!item.is_auto_generated || !item.source_ref) {
        next.push(item);
        continue;
      }
      if (item.source_ref.field_key.startsWith("furniture_item_")) {
        next.push(item);
        continue;
      }

      const cKey = `${item.source_ref.room_id}:${item.source_ref.field_key}`;
      const roomExists = currentRoomIds.has(item.source_ref.room_id);
      // An auto entry is "edited" if the inspector set recommended_action OR
      // typed notes (auto-created entries always start with notes: "").
      const isEdited = item.recommended_action !== null || item.notes !== "";

      if (!roomExists) {
        // Room deleted — deliberate action; preserve ALL its damage records
        // as manual entries for the inspector to review, edited or not.
        next.push({ ...item, is_auto_generated: false, source_ref: null });
        changed = true;
        continue;
      }

      if (!desired.has(cKey)) {
        // Trigger gone (entry deleted or condition improved)
        if (isEdited) {
          // Preserve inspector work — convert to manual entry
          next.push({ ...item, is_auto_generated: false, source_ref: null });
        }
        // Otherwise drop the entry (not edited, trigger no longer valid)
        changed = true;
        continue;
      }

      // Trigger still active — update severity if inspector hasn't edited this entry
      const desiredEntry = desired.get(cKey)!;
      if (!isEdited && item.severity !== desiredEntry.severity) {
        next.push({ ...item, severity: desiredEntry.severity });
        changed = true;
      } else {
        next.push(item);
      }
    }

    // Step 2 — add desired entries not yet in the list
    const existingCKeys = new Set(
      next
        .filter((d) => d.is_auto_generated && d.source_ref)
        .map((d) => `${d.source_ref!.room_id}:${d.source_ref!.field_key}`),
    );

    for (const [cKey, entry] of desired) {
      if (!existingCKeys.has(cKey)) {
        next.push({
          localId: crypto.randomUUID(),
          location: entry.location,
          damage_type: entry.damage_type,
          severity: entry.severity,
          notes: "",
          recommended_action: null,
          source_ref: entry.source_ref,
          is_auto_generated: true,
        });
        changed = true;
      }
    }

    if (!changed) return;

    setDamages(next);
    queueInspectionPatch({ pre_existing_damages: next });
    scheduleSave();
  }, [rooms]); // eslint-disable-line react-hooks/exhaustive-deps
}
