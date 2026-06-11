/**
 * useAutoPopulateDamages — watches `rooms` state and auto-creates/updates/removes
 * damage log entries from room feature conditions and statuses.
 *
 * useAutoPopulateApplianceDamages — same pattern for appliance conditions.
 *
 * Each hook only touches entries it owns: room-sourced entries have
 * `source_ref.room_id`, appliance-sourced have `source_ref.appliance_id`.
 * Manual entries (is_auto_generated false or source_ref null) and
 * furniture-sourced entries pass through untouched.
 *
 * Auto entries carry `source_condition` (human-readable trigger label) and
 * pre-fill `notes` from the source entry's notes field.
 */
import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { LocalRoom, LocalAppliance, DamageItem } from "@/types/inspection";

// ── Internal types ────────────────────────────────────────────────────────────

type AutoSeverity = "cosmetic" | "repair_before_relet" | "urgent_immediate";

type DesiredEntry = {
  compositeKey: string;
  location: string;
  damage_type: string;
  severity: AutoSeverity;
  notes: string;
  source_condition: string;
  source_ref: { room_id: string; field_key: string };
};

// ── Severity maps ─────────────────────────────────────────────────────────────

const CONDITION_TO_SEVERITY: Record<string, AutoSeverity | null> = {
  good:            null,
  minor_wear:      "cosmetic",
  moderate_damage: "repair_before_relet",
  severe_damage:   "urgent_immediate",
};

const ELECTRICAL_STATUS_SEVERITY: Record<string, AutoSeverity | null> = {
  working:     null,
  flickering:  "cosmetic",
  weak:        "cosmetic",
  loose:       "repair_before_relet",
  not_working: "repair_before_relet",
  damaged:     "repair_before_relet",
  missing:     "urgent_immediate",
};

const PLUMBING_STATUS_SEVERITY: Record<string, AutoSeverity | null> = {
  ok:            null,
  leaking:       "cosmetic",
  dripping:      "cosmetic",
  slow_drain:    "cosmetic",
  low_pressure:  "cosmetic",
  other:         "cosmetic",
  blocked:       "repair_before_relet",
  not_working:   "repair_before_relet",
  damaged:       "repair_before_relet",
  missing:       "urgent_immediate",
  major_leakage: "urgent_immediate",
};

// ── Display label maps (condition labels match ROOM_CONDITION_OPTIONS) ───────

const CONDITION_LABELS: Record<string, string> = {
  good:            "Good",
  minor_wear:      "Minor Wear",
  moderate_damage: "Poor — Visible Damage",
  severe_damage:   "Critical — Severe Damage",
};

const ELEC_STATUS_LABELS: Record<string, string> = {
  flickering:  "Flickering",
  weak:        "Weak",
  loose:       "Loose / Unsafe",
  not_working: "Not Working",
  damaged:     "Damaged",
  missing:     "Missing",
};

const PLUMB_STATUS_LABELS: Record<string, string> = {
  leaking:       "Leaking",
  dripping:      "Dripping",
  slow_drain:    "Slow Drain",
  low_pressure:  "Low Pressure",
  other:         "Other",
  blocked:       "Blocked",
  not_working:   "Not Working",
  damaged:       "Damaged",
  missing:       "Missing",
  major_leakage: "Major Leakage",
};

const DW_VALUE_LABELS: Record<string, string> = {
  stiff:        "Stiff",
  broken:       "Broken",
  missing:      "Missing",
  cracked:      "Cracked",
  present_torn: "Torn",
};

// ── Location label maps ───────────────────────────────────────────────────────

const WALL_LOCATION_LABELS: Record<string, string> = {
  all_walls: "All Walls",
  left:      "Left wall",
  right:     "Right wall",
  entry:     "Entry wall",
  opposite:  "Opposite wall",
  // Legacy values from old inspections
  road_facing:     "Road-facing wall",
  building_facing: "Building-facing wall",
  left_wall:       "Left wall",
  right_wall:      "Right wall",
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
  entire:       "Entire ceiling",
  corner:       "Corner area",
  above_window: "Above window",
  centre:       "Centre",
  // Legacy values from old inspections
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
    if (value === "stiff") return "cosmetic";
    if (value === "broken") return "repair_before_relet";
    if (value === "missing") return "urgent_immediate";
    return null;
  }
  if (fieldName === "glass_condition") {
    if (value === "cracked") return "repair_before_relet";
    if (value === "broken") return "repair_before_relet";
    if (value === "missing") return "urgent_immediate";
    return null;
  }
  if (fieldName === "mosquito_mesh") {
    if (value === "present_torn") return "cosmetic";
    if (value === "missing") return "repair_before_relet";
    return null;
  }
  return null;
}

function dwValueLabel(fieldName: string, value: string): string {
  if (fieldName === "frame_condition" || fieldName === "shutter_condition") {
    return CONDITION_LABELS[value] ?? value;
  }
  return DW_VALUE_LABELS[value] ?? value;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function asArray(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function asStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function entryId(entry: Record<string, unknown>, idx: number): string {
  return (entry.localId as string) || (entry.id as string) || String(idx);
}

/** Resolve a select value to its label, honouring `<key>_custom` free text. */
function labelOrCustom(
  map: Record<string, string>,
  entry: Record<string, unknown>,
  key: string,
  fallback: string,
  customSentinel = "custom",
): string {
  const value = entry[key] as string | undefined;
  if (!value) return fallback;
  if (value === customSentinel) return asStr(entry[`${key}_custom`]) || fallback;
  return map[value] || value;
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
      const locLabel = labelOrCustom(WALL_LOCATION_LABELS, entry, "which_wall", "Wall");
      desired.set(cKey, {
        compositeKey: cKey,
        location: `${roomLabel} — ${locLabel}`,
        damage_type: "Wall Condition",
        severity,
        notes: asStr(entry.notes),
        source_condition: CONDITION_LABELS[condition] ?? condition,
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
      const zoneLabel = labelOrCustom(FLOORING_ZONE_LABELS, entry, "flooring_zone", "Flooring");
      desired.set(cKey, {
        compositeKey: cKey,
        location: `${roomLabel} — ${zoneLabel}`,
        damage_type: "Flooring Condition",
        severity,
        notes: asStr(entry.notes),
        source_condition: CONDITION_LABELS[condition] ?? condition,
        source_ref: { room_id: room.id, field_key: fieldKey },
      });
    }

    // Ceiling entries — two independent triggers per entry: condition AND dampness
    const ceilEntries = asArray(rf.ceiling_entries);
    for (let i = 0; i < ceilEntries.length; i++) {
      const entry = ceilEntries[i];
      const eid = entryId(entry, i);
      const areaLabel = labelOrCustom(CEILING_AREA_LABELS, entry, "ceiling_area", "Ceiling");

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
          notes: asStr(entry.notes),
          source_condition: CONDITION_LABELS[condition!] ?? condition!,
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
          notes: asStr(entry.notes),
          source_condition: seepage === "active_dampness" ? "Active Dampness" : "Seepage Suspected",
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
            notes: asStr(fc.notes),
            source_condition: CONDITION_LABELS[condition] ?? condition,
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
      const itemLabel = entry.is_custom
        ? asStr(entry.custom_label) || "Door/Window"
        : labelOrCustom(DW_ITEM_LABELS, entry, "item_type", "Door/Window");
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
          notes: asStr(entry.notes),
          source_condition: dwValueLabel(fieldName, value),
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
      const itemLabel = labelOrCustom(ELEC_ITEM_LABELS, entry, "item", "Electrical item", "other");
      desired.set(cKey, {
        compositeKey: cKey,
        location: `${roomLabel} — ${itemLabel}`,
        damage_type: "Electrical Issue",
        severity,
        notes: asStr(entry.notes),
        source_condition: ELEC_STATUS_LABELS[status] ?? status,
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
      const itemLabel = PLUMBING_ITEM_LABELS[(entry.item as string) ?? ""] || asStr(entry.item) || "Plumbing item";
      const statusLabel = status === "other"
        ? (asStr(entry.status_custom) || "Other")
        : (PLUMB_STATUS_LABELS[status] ?? status);
      desired.set(cKey, {
        compositeKey: cKey,
        location: `${roomLabel} — ${itemLabel}`,
        damage_type: "Plumbing Issue",
        severity,
        notes: asStr(entry.notes),
        source_condition: statusLabel,
        source_ref: { room_id: room.id, field_key: fieldKey },
      });
    }
  }

  return desired;
}

// ── Shared reconcile helper ───────────────────────────────────────────────────

function isRoomSourced(item: DamageItem): boolean {
  return !!item.source_ref && "room_id" in item.source_ref;
}

function isApplianceSourced(item: DamageItem): boolean {
  return !!item.source_ref && "appliance_id" in item.source_ref;
}

// ── Hook: room features → damage log ──────────────────────────────────────────

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
      // Manual, furniture, and appliance-sourced entries pass through untouched
      if (!item.is_auto_generated || !isRoomSourced(item)) {
        next.push(item);
        continue;
      }
      const ref = item.source_ref as { room_id: string; field_key: string };
      if (ref.field_key.startsWith("furniture_item_")) {
        next.push(item);
        continue;
      }

      const cKey = `${ref.room_id}:${ref.field_key}`;
      const roomExists = currentRoomIds.has(ref.room_id);
      const desiredEntry = desired.get(cKey);
      // An auto entry is "edited" if the inspector set recommended_action OR
      // changed notes away from the auto-populated source notes.
      const isEdited =
        item.recommended_action !== null ||
        (item.notes !== "" && item.notes !== (desiredEntry?.notes ?? ""));

      if (!roomExists) {
        // Room deleted — deliberate action; preserve ALL its damage records
        // as manual entries for the inspector to review, edited or not.
        next.push({ ...item, is_auto_generated: false, source_ref: null });
        changed = true;
        continue;
      }

      if (!desiredEntry) {
        // Trigger gone (entry deleted or condition improved)
        if (isEdited) {
          next.push({ ...item, is_auto_generated: false, source_ref: null });
        }
        changed = true;
        continue;
      }

      // Trigger still active — sync severity/condition/notes unless edited
      if (
        !isEdited &&
        (item.severity !== desiredEntry.severity ||
          item.source_condition !== desiredEntry.source_condition ||
          item.notes !== desiredEntry.notes)
      ) {
        next.push({
          ...item,
          severity: desiredEntry.severity,
          source_condition: desiredEntry.source_condition,
          notes: desiredEntry.notes,
        });
        changed = true;
      } else {
        next.push(item);
      }
    }

    // Step 2 — add desired entries not yet in the list
    const existingCKeys = new Set(
      next
        .filter((d) => d.is_auto_generated && isRoomSourced(d))
        .map((d) => {
          const ref = d.source_ref as { room_id: string; field_key: string };
          return `${ref.room_id}:${ref.field_key}`;
        }),
    );

    for (const [cKey, entry] of desired) {
      if (!existingCKeys.has(cKey)) {
        next.push({
          localId: crypto.randomUUID(),
          location: entry.location,
          damage_type: entry.damage_type,
          severity: entry.severity,
          notes: entry.notes,
          recommended_action: null,
          source_ref: entry.source_ref,
          is_auto_generated: true,
          source_condition: entry.source_condition,
        });
        changed = true;
      }
    }

    if (!changed) return;

    setDamages(next);
    queueInspectionPatch({ pre_existing_damages: next });
  }, [rooms]); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── Hook: appliance conditions → damage log ───────────────────────────────────

const APPLIANCE_CONDITION_SEVERITY: Record<string, AutoSeverity | null> = {
  fully_functional: null,
  minor_issues:     "cosmetic",
  non_functional:   "repair_before_relet",
};

const APPLIANCE_CONDITION_LABELS: Record<string, string> = {
  minor_issues:   "Minor Issues",
  non_functional: "Non-Functional",
};

const APPLIANCE_TYPE_DISPLAY: Record<string, string> = {
  refrigerator:      "Refrigerator",
  washing_machine:   "Washing Machine",
  dryer:             "Dryer",
  air_conditioner:   "Air Conditioner",
  geyser:            "Geyser / Water Heater",
  microwave:         "Microwave",
  stove_hob:         "Stove / Hob",
  exhaust_fan:       "Exhaust Fan",
  ceiling_fan:       "Ceiling Fan",
  dishwasher:        "Dishwasher",
  water_purifier:    "Water Purifier",
  tv:                "Television",
  fire_extinguisher: "Fire Extinguisher",
  other:             "Other",
};

export function useAutoPopulateApplianceDamages(
  appliances: LocalAppliance[],
  damages: DamageItem[],
  setDamages: Dispatch<SetStateAction<DamageItem[]>>,
  queueInspectionPatch: (patch: Record<string, unknown>) => void,
): void {
  const damagesRef = useRef<DamageItem[]>(damages);

  useEffect(() => {
    damagesRef.current = damages;
  });

  useEffect(() => {
    // Build desired map keyed by appliance id
    const desired = new Map<string, {
      location: string;
      damage_type: string;
      severity: AutoSeverity;
      notes: string;
      source_condition: string;
    }>();

    for (const appliance of appliances) {
      const condition = appliance.condition ?? "";
      const severity = APPLIANCE_CONDITION_SEVERITY[condition];
      if (!severity) continue;
      const typeLabel = APPLIANCE_TYPE_DISPLAY[appliance.appliance_type ?? ""] || appliance.appliance_type || "Appliance";
      const label = appliance.custom_label ? ` — ${appliance.custom_label}` : "";
      desired.set(appliance.id, {
        location: appliance.location || "Common Area",
        damage_type: `${typeLabel}${label}`,
        severity,
        notes: appliance.notes ?? "",
        source_condition: APPLIANCE_CONDITION_LABELS[condition] ?? condition,
      });
    }

    const currentApplianceIds = new Set(appliances.map((a) => a.id));
    const current = damagesRef.current;
    const next: DamageItem[] = [];
    let changed = false;

    for (const item of current) {
      // Only touch appliance-sourced auto entries
      if (!item.is_auto_generated || !isApplianceSourced(item)) {
        next.push(item);
        continue;
      }
      const ref = item.source_ref as { appliance_id: string; field_key: string };
      const desiredEntry = desired.get(ref.appliance_id);
      const applianceExists = currentApplianceIds.has(ref.appliance_id);
      const isEdited =
        item.recommended_action !== null ||
        (item.notes !== "" && item.notes !== (desiredEntry?.notes ?? ""));

      if (!applianceExists) {
        // Appliance deleted — preserve the record as a manual entry
        next.push({ ...item, is_auto_generated: false, source_ref: null });
        changed = true;
        continue;
      }

      if (!desiredEntry) {
        // Condition back to fully functional (or cleared)
        if (isEdited) {
          next.push({ ...item, is_auto_generated: false, source_ref: null });
        }
        changed = true;
        continue;
      }

      if (
        !isEdited &&
        (item.severity !== desiredEntry.severity ||
          item.source_condition !== desiredEntry.source_condition ||
          item.notes !== desiredEntry.notes ||
          item.location !== desiredEntry.location ||
          item.damage_type !== desiredEntry.damage_type)
      ) {
        next.push({
          ...item,
          location: desiredEntry.location,
          damage_type: desiredEntry.damage_type,
          severity: desiredEntry.severity,
          source_condition: desiredEntry.source_condition,
          notes: desiredEntry.notes,
        });
        changed = true;
      } else {
        next.push(item);
      }
    }

    // Add new appliance entries
    const existingIds = new Set(
      next
        .filter((d) => d.is_auto_generated && isApplianceSourced(d))
        .map((d) => (d.source_ref as { appliance_id: string }).appliance_id),
    );

    for (const [applianceId, entry] of desired) {
      if (!existingIds.has(applianceId)) {
        next.push({
          localId: crypto.randomUUID(),
          location: entry.location,
          damage_type: entry.damage_type,
          severity: entry.severity,
          notes: entry.notes,
          recommended_action: null,
          source_ref: { appliance_id: applianceId, field_key: "condition" },
          is_auto_generated: true,
          source_condition: entry.source_condition,
        });
        changed = true;
      }
    }

    if (!changed) return;

    setDamages(next);
    queueInspectionPatch({ pre_existing_damages: next });
  }, [appliances]); // eslint-disable-line react-hooks/exhaustive-deps
}
