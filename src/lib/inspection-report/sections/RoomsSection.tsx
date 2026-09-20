import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';
import { SectionHeading } from './PdfPrimitives';
import { PdfIcon } from './PdfIcon';
import { ROOM_FEATURE_LABELS, FEATURE_GROUP_ORDER } from '../roomFeatureLabels';
import type { LocalRoom } from '@/types/inspection';

// ── Local types ───────────────────────────────────────────────────────────────

type FurnitureItem = {
  id?: string;
  item?: string;
  count?: number;
  condition?: string;
  notes?: string;
  add_to_damage_log?: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOM_CONDITION_LABELS: Record<string, string> = {
  good:             'Good',
  minor_wear:       'Minor Wear',
  moderate_damage:  'Poor — Visible Damage',
  severe_damage:    'Critical — Severe Damage',
};

const PAINT_CONDITION_LABELS: Record<string, string> = {
  fresh:                'Fresh',
  faded:                'Faded',
  marked:               'Marked',
  touch_up_required:    'Requires Touch-up',
  full_repaint_required:'Requires Full Repaint',
};

// ── Entry label maps (used by entry-array rendering) ─────────────────────────

// New value sets first; legacy values from old inspections kept as fallbacks.
const WHICH_WALL: Record<string, string>   = { all_walls:'All Walls', left:'Left', right:'Right', entry:'Entry', opposite:'Opposite', road_facing:'Road-facing', building_facing:'Building-facing', left_wall:'Left wall', right_wall:'Right wall', partition_wall:'Partition wall' };
const WALL_OPENING: Record<string, string> = { none:'None', door:'Door' };
const FLR_ZONE: Record<string, string>     = { entire_room:'Entire room', near_entrance:'Near entrance', near_window:'Near window', near_bathroom:'Near bathroom', corner_area:'Corner area' };
const FLR_TYPE: Record<string, string>     = { vitrified_tile:'Vitrified tile', ceramic_tile:'Ceramic tile', marble:'Marble', granite:'Granite', hardwood:'Hardwood', laminate:'Laminate', vinyl:'Vinyl', cement:'Cement', mosaic:'Mosaic', other:'Other' };
const CEIL_AREA: Record<string, string>    = { entire:'Entire ceiling', corner:'Corner area', above_window:'Above window', centre:'Centre', entire_ceiling:'Entire ceiling', above_bed_area:'Above bed area', above_kitchen_slab:'Above kitchen slab', above_bathroom_area:'Above bathroom area', corner_area:'Corner area' };
const FC_TYPE: Record<string, string>      = { none:'None', partial:'Partial', full:'Full' };
const FC_MAT: Record<string, string>       = { gypsum:'Gypsum', pop:'POP', wood:'Wood', grid_tiles:'Grid + Tiles', other:'Other' };
const DW_ITEM: Record<string, string>      = { main_door:'Main door', room_door:'Room door', bathroom_door:'Bathroom door', window:'Window', sliding_door:'Sliding door', french_door:'French door', balcony_door:'Balcony door' };
const LOCK_LATCH: Record<string, string>   = { working:'Working', stiff:'Stiff', broken:'Broken', missing:'Missing' };
const GLASS_COND: Record<string, string>   = { clear:'Clear', scratched:'Scratched', cracked:'Cracked', broken:'Broken' };
const MESH: Record<string, string>         = { none:'None', present_intact:'Intact', present_torn:'Torn', missing:'Missing' };
const SEEPAGE: Record<string, string>      = { none:'None', staining_dry:'Staining (dry)', active_dampness:'Active dampness', seepage_suspected:'Seepage suspected' };
const ELEC_ITEM: Record<string, string>    = { fan:'Ceiling fan', light:'Light fixture', switchboard:'Switchboard', mcb_db:'MCB/DB box', ac_point:'AC point', exhaust_fan:'Exhaust fan', geyser_point:'Geyser point', socket:'Socket', other:'Other' };
const ELEC_STATUS: Record<string, string>  = { working:'Working', not_working:'Not working', flickering:'Flickering', damaged:'Damaged', loose:'Loose/unsafe', missing:'Missing' };
const PLUMB_ITEM: Record<string, string>   = { tap:'Tap/faucet', pipe_joint:'Pipe/joint', drain:'Drain', flush:'Flush mechanism', geyser:'Geyser', sink:'Sink/basin', shower:'Shower', water_supply:'Water supply', other:'Other' };
const PLUMB_STATUS: Record<string, string> = { ok:'OK', leaking:'Leaking', slow_drain:'Slow drain', low_pressure:'Low Pressure', blocked:'Blocked', not_working:'Not working', damaged:'Damaged', missing:'Missing', other:'Other' };
const SHOWER_PRESENT: Record<string, string> = { none:'None', overhead:'Overhead', handheld:'Handheld', both:'Both' };
const HOT_COLD: Record<string, string>     = { yes:'Yes', no:'No' };

// ── SKIP_KEYS — must not pass through ROOM_FEATURE_LABELS flat iteration ──────
// Entry arrays are rendered separately; electrical/plumbing inventory scalars
// are rendered as compact inventory lines; false_ceiling is now an object.

const SKIP_KEYS = new Set([
  'wall_entries', 'flooring_entries', 'ceiling_entries',
  'door_window_entries', 'electrical_issues', 'plumbing_issues',
  'false_ceiling',
  'electrical_fan_count', 'electrical_fan_brand',
  'electrical_light_count', 'electrical_light_brand', 'electrical_light_type',
  'electrical_switchboard_count', 'electrical_switchboard_brand',
  'electrical_ac_provision_count', 'electrical_wifi_point', 'electrical_wifi_brand',
  'plumbing_tap_count', 'plumbing_shower_present', 'plumbing_hot_cold_mixer',
]);

const SURFACE_FIELDS: Array<{ label: string; condKey: keyof LocalRoom; notesKey: keyof LocalRoom }> = [
  { label: 'Walls',           condKey: 'walls_condition',          notesKey: 'walls_notes' },
  { label: 'Flooring',        condKey: 'flooring_condition',       notesKey: 'flooring_notes' },
  { label: 'Ceiling',         condKey: 'ceiling_condition',        notesKey: 'ceiling_notes' },
  { label: 'Doors & Windows', condKey: 'doors_windows_condition',  notesKey: 'doors_windows_notes' },
  { label: 'Electrical',      condKey: 'electrical_condition',     notesKey: 'electrical_notes' },
  { label: 'Plumbing',        condKey: 'plumbing_condition',       notesKey: 'plumbing_notes' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFeatureValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '—';
  if (raw === 'Y') return 'Yes';
  if (raw === 'N') return 'No';
  const str = String(raw);
  return ROOM_CONDITION_LABELS[str] ?? str;
}

function lbl(map: Record<string, string>, key: unknown): string {
  return (key && map[key as string]) ? map[key as string] : (key ? String(key) : '');
}

/**
 * Resolve a select value to its display label, substituting the entry's
 * `<key>_custom` free text when the value is the custom/other sentinel.
 */
function lblWithCustom(
  map: Record<string, string>,
  entry: Record<string, unknown>,
  key: string,
  customSentinel = 'custom',
): string {
  const value = entry[key];
  if (value === customSentinel) {
    const customText = entry[`${key}_custom`];
    return customText ? String(customText) : lbl(map, value);
  }
  return lbl(map, value);
}

function asArr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function asNum(v: unknown): number {
  return typeof v === 'number' ? v : (Number(v) || 0);
}

function asStr(v: unknown): string {
  return v ? String(v) : '';
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  section:      { marginBottom: 18 },
  roomCard:     { marginBottom: 10, borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 8, backgroundColor: BRAND.white, overflow: 'hidden' },
  roomTitleRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BRAND.indigoTint,
    paddingVertical: 6, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: BRAND.borderSoft,
  },
  roomTitle: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.foreground,
    marginLeft: 6,
  },
  roomBody:     { padding: 10 },
  emptyRoom:    { fontSize: 9, color: BRAND.mutedForeground },
  grid:         { flexDirection: 'row', flexWrap: 'wrap' },
  field:        { width: '50%', marginBottom: 6, paddingRight: 8 },
  label: {
    fontSize: 7,
    fontWeight: 700,
    color: BRAND.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  value:        { fontSize: 9, color: BRAND.foreground },
  notes:        { fontSize: 9, color: BRAND.mutedForeground, marginTop: 4 },
  paintLine:    { fontSize: 9, color: BRAND.foreground, marginTop: 3 },
  paintLabelPart: { fontSize: 9, color: BRAND.mutedForeground },

  inCardGroupHeader: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.primary,
    marginTop: 10,
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },

  featureRow:       { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BRAND.border },
  featureRowZebra:  { backgroundColor: BRAND.zebra },
  featureLabelCell: { flex: 2, paddingVertical: 3, paddingHorizontal: 4, fontSize: 8, color: BRAND.mutedForeground },
  featureValueCell: { flex: 3, paddingVertical: 3, paddingHorizontal: 4, fontSize: 8, color: BRAND.foreground },

  furnitureTHRow:      { flexDirection: 'row', backgroundColor: BRAND.zebra, borderBottomWidth: 0.5, borderBottomColor: BRAND.border },
  furnitureTDRow:      { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BRAND.border },
  furnitureTDRowZebra: { backgroundColor: BRAND.zebra },
  furnitureTHCell:     { paddingVertical: 3, paddingHorizontal: 4, fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRAND.mutedForeground },
  furnitureTDCell:     { paddingVertical: 3, paddingHorizontal: 4, fontSize: 8, color: BRAND.foreground },

  // ── Entry-array sub-section ───────────────────────────────────────────────
  entrySubHeader: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 8,
    marginBottom: 2,
  },
  entryItem:       { marginBottom: 3 },
  entryMainLine:   { fontSize: 8, color: BRAND.foreground },
  entrySubLine:    { fontSize: 7.5, color: BRAND.mutedForeground, marginLeft: 8, marginTop: 1 },
  inventoryLine:   { fontSize: 8, color: BRAND.foreground, marginTop: 2, marginBottom: 2 },
});

// ── Entry-array renderer helpers ──────────────────────────────────────────────

function WallEntries({ entries }: { entries: Record<string, unknown>[] }) {
  if (entries.length === 0) return null;
  return (
    <View>
      <Text style={s.entrySubHeader}>Wall Detail</Text>
      {entries.map((e, i) => {
        const wall    = lblWithCustom(WHICH_WALL, e, 'which_wall');
        const opening = e.opening && e.opening !== 'none' ? lblWithCustom(WALL_OPENING, e, 'opening') : '';
        const cond    = lbl(ROOM_CONDITION_LABELS, e.condition);
        const paint   = e.paint_condition ? lbl(PAINT_CONDITION_LABELS, e.paint_condition) : '';
        const notes   = asStr(e.notes);
        return (
          <View key={asStr(e.id) || i} style={s.entryItem}>
            <Text style={s.entryMainLine}>{wall || 'Wall'}{cond ? ` — ${cond}` : ''}</Text>
            {opening ? <Text style={s.entrySubLine}>Opening: {opening}</Text> : null}
            {paint ? <Text style={s.entrySubLine}>Paint: {paint}</Text> : null}
            {notes ? <Text style={s.entrySubLine}>Notes: {notes}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function FlooringEntries({ entries }: { entries: Record<string, unknown>[] }) {
  if (entries.length === 0) return null;
  return (
    <View>
      <Text style={s.entrySubHeader}>Flooring Detail</Text>
      {entries.map((e, i) => {
        const zone  = lblWithCustom(FLR_ZONE, e, 'flooring_zone');
        const type  = lbl(FLR_TYPE, e.flooring_type);
        const cond  = lbl(ROOM_CONDITION_LABELS, e.condition);
        const cracked = asNum(e.cracked_tiles_count);
        const notes = asStr(e.notes);
        const title = [zone, type, cond].filter(Boolean).join(' — ');
        return (
          <View key={asStr(e.id) || i} style={s.entryItem}>
            <Text style={s.entryMainLine}>{title || 'Flooring entry'}</Text>
            {cracked > 0 ? <Text style={s.entrySubLine}>Cracked tiles: {cracked}</Text> : null}
            {notes ? <Text style={s.entrySubLine}>Notes: {notes}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function CeilingEntries({ entries }: { entries: Record<string, unknown>[] }) {
  if (entries.length === 0) return null;
  return (
    <View>
      <Text style={s.entrySubHeader}>Ceiling Detail</Text>
      {entries.map((e, i) => {
        const area    = lblWithCustom(CEIL_AREA, e, 'ceiling_area');
        const cond    = lbl(ROOM_CONDITION_LABELS, e.condition);
        const seepage = asStr(e.seepage_dampness);
        const notes   = asStr(e.notes);
        return (
          <View key={asStr(e.id) || i} style={s.entryItem}>
            <Text style={s.entryMainLine}>{area || 'Ceiling'}{cond ? ` — ${cond}` : ''}</Text>
            {seepage && seepage !== 'none' ? <Text style={s.entrySubLine}>Seepage: {lbl(SEEPAGE, seepage)}</Text> : null}
            {notes ? <Text style={s.entrySubLine}>Notes: {notes}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function FalseCeilingEntry({ fc }: { fc: Record<string, unknown> | null | undefined }) {
  if (!fc) return null;
  const fcType = asStr(fc.false_ceiling_type);
  if (!fcType || fcType === 'none' || fcType === '') return null;
  const typeLabel = lbl(FC_TYPE, fcType);
  const mat       = fc.material ? lbl(FC_MAT, fc.material) : '';
  const cond      = fc.condition ? lbl(ROOM_CONDITION_LABELS, fc.condition) : '';
  const notes     = asStr(fc.notes);
  return (
    <View>
      <Text style={s.entrySubHeader}>False Ceiling</Text>
      <View style={s.entryItem}>
        <Text style={s.entryMainLine}>{typeLabel}{mat ? ` (${mat})` : ''}{cond ? ` — ${cond}` : ''}</Text>
        {notes ? <Text style={s.entrySubLine}>Notes: {notes}</Text> : null}
      </View>
    </View>
  );
}

function DoorWindowEntries({ entries }: { entries: Record<string, unknown>[] }) {
  if (entries.length === 0) return null;
  return (
    <View>
      <Text style={s.entrySubHeader}>Doors & Windows Detail</Text>
      {entries.map((e, i) => {
        const itemType = e.is_custom ? asStr(e.custom_label) : lblWithCustom(DW_ITEM, e, 'item_type');
        const frame    = e.frame_condition    ? lbl(ROOM_CONDITION_LABELS, e.frame_condition)    : '';
        const shutter  = e.shutter_condition  ? lbl(ROOM_CONDITION_LABELS, e.shutter_condition)  : '';
        const lock     = e.lock_latch         ? lbl(LOCK_LATCH, e.lock_latch)                    : '';
        const glass    = e.glass_condition    ? lbl(GLASS_COND, e.glass_condition)               : '';
        const mesh     = e.mosquito_mesh      ? lbl(MESH, e.mosquito_mesh)                       : '';
        const notes    = asStr(e.notes);
        const details  = [
          frame   ? `Frame: ${frame}`   : '',
          shutter ? `Shutter: ${shutter}` : '',
          lock    ? `Lock: ${lock}`     : '',
          glass   ? `Glass: ${glass}`   : '',
          mesh    ? `Mesh: ${mesh}`     : '',
        ].filter(Boolean).join('   ');
        return (
          <View key={asStr(e.id) || i} style={s.entryItem}>
            <Text style={s.entryMainLine}>{itemType || `Item ${i + 1}`}</Text>
            {details ? <Text style={s.entrySubLine}>{details}</Text> : null}
            {notes   ? <Text style={s.entrySubLine}>Notes: {notes}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

// Single source of truth for "does this room have electrical/plumbing data to
// show" — used by BOTH the parent hasEntryData gate and the block renderers so
// the gate can never omit a field the block would render (e.g. Wi-Fi-only or
// hot/cold-mixer-only rooms).
function hasElectricalData(rf: Record<string, unknown>): boolean {
  return asNum(rf.electrical_fan_count) > 0
    || asNum(rf.electrical_light_count) > 0
    || asNum(rf.electrical_switchboard_count) > 0
    || asNum(rf.electrical_ac_provision_count) > 0
    || !!asStr(rf.electrical_wifi_point)
    || asArr(rf.electrical_issues).length > 0;
}

function hasPlumbingData(rf: Record<string, unknown>): boolean {
  return asNum(rf.plumbing_tap_count) > 0
    || !!asStr(rf.plumbing_shower_present)
    || !!asStr(rf.plumbing_hot_cold_mixer)
    || asArr(rf.plumbing_issues).length > 0;
}

function ElectricalBlock({ rf }: { rf: Record<string, unknown> }) {
  const fanCount   = asNum(rf.electrical_fan_count);
  const fanBrand   = asStr(rf.electrical_fan_brand);
  const lightCount = asNum(rf.electrical_light_count);
  const lightBrand = asStr(rf.electrical_light_brand);
  const lightType  = asStr(rf.electrical_light_type);
  const sbCount    = asNum(rf.electrical_switchboard_count);
  const sbBrand    = asStr(rf.electrical_switchboard_brand);
  const acCount    = asNum(rf.electrical_ac_provision_count);
  const wifiPoint  = asStr(rf.electrical_wifi_point);
  const wifiBrand  = asStr(rf.electrical_wifi_brand);
  const issues     = asArr(rf.electrical_issues);

  const haInventory = fanCount > 0 || lightCount > 0 || sbCount > 0 || acCount > 0 || !!wifiPoint;

  if (!hasElectricalData(rf)) return null;

  const inventoryParts: string[] = [];
  if (fanCount > 0)   inventoryParts.push(`Fans: ${fanCount}${fanBrand ? ` (${fanBrand})` : ''}`);
  if (lightCount > 0) inventoryParts.push(`Lights: ${lightCount}${[lightType, lightBrand].filter(Boolean).length ? ` (${[lightType, lightBrand].filter(Boolean).join(', ')})` : ''}`);
  if (sbCount > 0)    inventoryParts.push(`Switchboards: ${sbCount}${sbBrand ? ` (${sbBrand})` : ''}`);
  if (acCount > 0)    inventoryParts.push(`AC points: ${acCount}`);
  if (wifiPoint) {
    // Render explicit negatives too, so an "Electrical" heading is never empty.
    const wifiVal = (wifiPoint === 'N' || wifiPoint === 'no') ? 'No' : wifiPoint;
    const showBrand = wifiVal !== 'No' && !!wifiBrand;
    inventoryParts.push(`WiFi: ${wifiVal}${showBrand ? ` (${wifiBrand})` : ''}`);
  }

  return (
    <View>
      <Text style={s.entrySubHeader}>Electrical</Text>
      {haInventory && inventoryParts.length > 0 ? (
        <Text style={s.inventoryLine}>{inventoryParts.join('   |   ')}</Text>
      ) : null}
      {issues.map((e, i) => {
        const item   = lblWithCustom(ELEC_ITEM, e, 'item', 'other');
        const status = lbl(ELEC_STATUS, e.status);
        const notes  = asStr(e.notes);
        return (
          <View key={asStr(e.id) || i} style={s.entryItem}>
            <Text style={s.entryMainLine}>{item || 'Item'}{status ? ` — ${status}` : ''}</Text>
            {notes ? <Text style={s.entrySubLine}>Notes: {notes}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

function PlumbingBlock({ rf }: { rf: Record<string, unknown> }) {
  const tapCount  = asNum(rf.plumbing_tap_count);
  const shower    = asStr(rf.plumbing_shower_present);
  const hotCold   = asStr(rf.plumbing_hot_cold_mixer);
  const issues    = asArr(rf.plumbing_issues);

  const hasInventory = tapCount > 0 || !!shower || !!hotCold;

  if (!hasPlumbingData(rf)) return null;

  const inventoryParts: string[] = [];
  if (tapCount > 0)  inventoryParts.push(`Taps: ${tapCount}`);
  // Render "Shower: None" too, so a "Plumbing" heading is never left empty.
  if (shower)        inventoryParts.push(`Shower: ${lbl(SHOWER_PRESENT, shower)}`);
  if (hotCold)       inventoryParts.push(`Hot & Cold Mixer: ${lbl(HOT_COLD, hotCold)}`);

  return (
    <View>
      <Text style={s.entrySubHeader}>Plumbing</Text>
      {hasInventory && inventoryParts.length > 0 ? (
        <Text style={s.inventoryLine}>{inventoryParts.join('   |   ')}</Text>
      ) : null}
      {issues.map((e, i) => {
        const item   = lbl(PLUMB_ITEM, e.item);
        const status = lblWithCustom(PLUMB_STATUS, e, 'status', 'other');
        const notes  = asStr(e.notes);
        return (
          <View key={asStr(e.id) || i} style={s.entryItem}>
            <Text style={s.entryMainLine}>{item || 'Item'}{status ? ` — ${status}` : ''}</Text>
            {notes ? <Text style={s.entrySubLine}>Notes: {notes}</Text> : null}
          </View>
        );
      })}
    </View>
  );
}

// ── RoomCard ──────────────────────────────────────────────────────────────────

function RoomCard({ room }: { room: LocalRoom }) {
  const title = room.room_label || room.room_type;

  const furniture: FurnitureItem[] = Array.isArray(room.furniture_items)
    ? (room.furniture_items as FurnitureItem[]).filter((fi) => !!fi.item)
    : [];

  const rawFeatures: Record<string, unknown> =
    room.room_features &&
    typeof room.room_features === 'object' &&
    !Array.isArray(room.room_features)
      ? (room.room_features as Record<string, unknown>)
      : {};

  // ── Entry-array data extraction ───────────────────────────────────────────
  const wallEntries   = asArr(rawFeatures.wall_entries);
  const flrEntries    = asArr(rawFeatures.flooring_entries);
  const ceilEntries   = asArr(rawFeatures.ceiling_entries);
  const falseCeiling  = rawFeatures.false_ceiling && typeof rawFeatures.false_ceiling === 'object' && !Array.isArray(rawFeatures.false_ceiling)
    ? (rawFeatures.false_ceiling as Record<string, unknown>)
    : null;
  const dwEntries     = asArr(rawFeatures.door_window_entries);

  const hasEntryData = !!(wallEntries.length > 0 || flrEntries.length > 0 || ceilEntries.length > 0 ||
    (falseCeiling && asStr(falseCeiling.false_ceiling_type) !== '' && asStr(falseCeiling.false_ceiling_type) !== 'none') ||
    dwEntries.length > 0 ||
    hasElectricalData(rawFeatures) ||
    hasPlumbingData(rawFeatures));

  // ── Flat features (skip entry arrays + inventory keys) ────────────────────
  const groupedFeatures = new Map<string, Array<{ label: string; value: string }>>();
  for (const [key, rawValue] of Object.entries(rawFeatures)) {
    if (SKIP_KEYS.has(key)) continue;
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;
    const meta = ROOM_FEATURE_LABELS[key];
    if (!meta) {
      console.warn(`[RoomsSection] Unknown room_features key: "${key}" — add it to roomFeatureLabels.ts`);
      continue;
    }
    if (!groupedFeatures.has(meta.group)) groupedFeatures.set(meta.group, []);
    groupedFeatures.get(meta.group)!.push({
      label: meta.label,
      value: formatFeatureValue(rawValue),
    });
  }

  const hasExtendedData = furniture.length > 0 || groupedFeatures.size > 0 || hasEntryData;

  // Any surface field (condition / notes / paint) with a recorded value.
  const hasSurfaceData = SURFACE_FIELDS.some((f) => {
    const cond      = room[f.condKey] as string | null;
    const notes     = room[f.notesKey] as string | null;
    const paintCond = f.condKey === 'walls_condition' ? room.paint_condition : null;
    return !!(cond || notes || paintCond);
  });

  const hasAnyData = hasSurfaceData || hasExtendedData || !!room.overall_room_notes;

  return (
    <View style={s.roomCard} minPresenceAhead={60}>
      <View style={s.roomTitleRow} wrap={false}>
        <PdfIcon name="room" size={12} color={BRAND.violet} />
        <Text style={s.roomTitle}>{title}</Text>
      </View>
      <View style={s.roomBody}>

        {!hasAnyData && (
          <Text style={s.emptyRoom}>No observations recorded.</Text>
        )}

        {/* ── Surface condition grid ── */}
        <View style={s.grid}>
          {SURFACE_FIELDS.map((f) => {
            const cond      = room[f.condKey] as string | null;
            const notes     = room[f.notesKey] as string | null;
            const isWalls   = f.condKey === 'walls_condition';
            const paintCond = isWalls ? room.paint_condition : null;
            if (!cond && !notes && !paintCond) return null;
            return (
              <View key={f.label} style={s.field}>
                <Text style={s.label}>{f.label}</Text>
                <Text style={s.value}>{cond ? (ROOM_CONDITION_LABELS[cond] ?? cond) : '—'}</Text>
                {notes ? <Text style={s.notes}>{notes}</Text> : null}
                {isWalls && paintCond ? (
                  <Text style={s.paintLine}>
                    <Text style={s.paintLabelPart}>Paint: </Text>
                    {PAINT_CONDITION_LABELS[paintCond] ?? paintCond}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* ── Entry-array detail blocks ── */}
        {hasEntryData && (
          <View>
            <WallEntries    entries={wallEntries} />
            <FlooringEntries entries={flrEntries} />
            <CeilingEntries  entries={ceilEntries} />
            <FalseCeilingEntry fc={falseCeiling} />
            <DoorWindowEntries entries={dwEntries} />
            <ElectricalBlock rf={rawFeatures} />
            <PlumbingBlock   rf={rawFeatures} />
          </View>
        )}

        {/* ── Furniture & Fittings ── */}
        {furniture.length > 0 && (
          <View>
            <Text style={s.inCardGroupHeader}>Furniture & Fittings</Text>
            <View style={s.furnitureTHRow} wrap={false}>
              <Text style={[s.furnitureTHCell, { width: '30%' }]}>Item</Text>
              <Text style={[s.furnitureTHCell, { width: '10%' }]}>Qty</Text>
              <Text style={[s.furnitureTHCell, { width: '25%' }]}>Condition</Text>
              <Text style={[s.furnitureTHCell, { width: '35%' }]}>Notes</Text>
            </View>
            {furniture.map((fi, i) => (
              <View
                key={fi.id ?? i}
                style={[s.furnitureTDRow, i % 2 === 1 ? s.furnitureTDRowZebra : {}]}
              >
                <Text style={[s.furnitureTDCell, { width: '30%' }]}>{fi.item || '—'}</Text>
                <Text style={[s.furnitureTDCell, { width: '10%' }]}>{String(fi.count ?? 1)}</Text>
                <Text style={[s.furnitureTDCell, { width: '25%' }]}>
                  {fi.condition ? (ROOM_CONDITION_LABELS[fi.condition] ?? fi.condition) : '—'}
                </Text>
                <Text style={[s.furnitureTDCell, { width: '35%' }]}>{fi.notes || ''}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Room features grouped ── */}
        {FEATURE_GROUP_ORDER.map((group) => {
          const entries = groupedFeatures.get(group);
          if (!entries || entries.length === 0) return null;
          return (
            <View key={group}>
              <Text style={s.inCardGroupHeader}>{group}</Text>
              {entries.map((entry, i) => (
                <View
                  key={entry.label}
                  style={[s.featureRow, i % 2 === 1 ? s.featureRowZebra : {}]}
                >
                  <Text style={s.featureLabelCell}>{entry.label}</Text>
                  <Text style={s.featureValueCell}>{entry.value}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {/* ── Overall room notes ── */}
        {room.overall_room_notes ? (
          <Text style={s.notes}>Overall: {room.overall_room_notes}</Text>
        ) : null}

      </View>
    </View>
  );
}

// ── RoomsSection ──────────────────────────────────────────────────────────────

interface Props {
  rooms: LocalRoom[];
}

export function RoomsSection({ rooms }: Props) {
  if (rooms.length === 0) {
    return (
      <View style={s.section}>
        <SectionHeading
          icon="room" title="Room-by-Room Details" accent={BRAND.violet}
          id="sec-rooms" bookmark="Room-by-Room Details"
          descriptor="Detailed observations for each inspected room and area."
        />
        <Text style={styles.mutedSmall}>No rooms recorded.</Text>
      </View>
    );
  }
  return (
    <View style={s.section}>
      <SectionHeading
        icon="room" title="Room-by-Room Details" accent={BRAND.violet}
        id="sec-rooms" bookmark="Room-by-Room Details"
        descriptor="Detailed observations for each inspected room and area."
      />
      {rooms.map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
    </View>
  );
}
