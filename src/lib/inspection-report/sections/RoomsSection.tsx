import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';
import { ROOM_FEATURE_LABELS, FEATURE_GROUP_ORDER } from '../roomFeatureLabels';
import type { LocalRoom } from '@/pages/admin/InspectionForm';

// ── Local types ──────────────────────────────────────────────────────────────

type FurnitureItem = {
  id?: string;
  item?: string;
  count?: number;
  condition?: string;
  notes?: string;
  add_to_damage_log?: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────

// Maps raw room_condition enum values → human-readable labels.
// Pre-existing issue fixed here: the old code rendered raw values like
// "minor_wear" directly; now all condition strings go through this map.
const ROOM_CONDITION_LABELS: Record<string, string> = {
  good:             'Good',
  minor_wear:       'Minor Wear',
  moderate_damage:  'Moderate Damage',
  severe_damage:    'Severe Damage',
};

// Maps paint_condition DB values → human-readable labels.
// Mirrors PAINT_CONDITION_OPTIONS in InspectionForm.tsx.
const PAINT_CONDITION_LABELS: Record<string, string> = {
  fresh:                'Fresh',
  faded:                'Faded',
  marked:               'Marked',
  touch_up_required:    'Requires Touch-up',
  full_repaint_required:'Requires Full Repaint',
};

const SURFACE_FIELDS: Array<{ label: string; condKey: keyof LocalRoom; notesKey: keyof LocalRoom }> = [
  { label: 'Walls',           condKey: 'walls_condition',          notesKey: 'walls_notes' },
  { label: 'Flooring',        condKey: 'flooring_condition',       notesKey: 'flooring_notes' },
  { label: 'Ceiling',         condKey: 'ceiling_condition',        notesKey: 'ceiling_notes' },
  { label: 'Doors & Windows', condKey: 'doors_windows_condition',  notesKey: 'doors_windows_notes' },
  { label: 'Electrical',      condKey: 'electrical_condition',     notesKey: 'electrical_notes' },
  { label: 'Plumbing',        condKey: 'plumbing_condition',       notesKey: 'plumbing_notes' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts a raw room_features value to a display string.
 * Handles Y/N radios, room_condition enums, numbers, and plain strings.
 */
function formatFeatureValue(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '—';
  if (raw === 'Y') return 'Yes';
  if (raw === 'N') return 'No';
  const str = String(raw);
  return ROOM_CONDITION_LABELS[str] ?? str;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  section: { marginBottom: 20 },
  roomCard: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 3,
  },
  roomTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: BRAND.primary,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  roomBody: { padding: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  field: { width: '50%', marginBottom: 6, paddingRight: 8 },
  label: {
    fontSize: 7,
    fontWeight: 700,
    color: BRAND.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 1,
  },
  value: { fontSize: 9, color: BRAND.foreground },
  notes: { fontSize: 9, color: BRAND.mutedForeground, marginTop: 4 },
  paintLine: { fontSize: 9, color: BRAND.foreground, marginTop: 3 },
  paintLabelPart: { fontSize: 9, color: BRAND.mutedForeground },

  // ── In-card group header (features + furniture subsection headers) ──────────
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

  // ── Feature rows (key-value pairs) ─────────────────────────────────────────
  featureRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  featureRowZebra: { backgroundColor: BRAND.zebra },
  featureLabelCell: {
    flex: 2,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 8,
    color: BRAND.mutedForeground,
  },
  featureValueCell: {
    flex: 3,
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 8,
    color: BRAND.foreground,
  },

  // ── Furniture table ────────────────────────────────────────────────────────
  furnitureTHRow: {
    flexDirection: 'row',
    backgroundColor: BRAND.zebra,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  furnitureTDRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  furnitureTDRowZebra: { backgroundColor: BRAND.zebra },
  furnitureTHCell: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.mutedForeground,
  },
  furnitureTDCell: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 8,
    color: BRAND.foreground,
  },
});

// ── RoomCard ──────────────────────────────────────────────────────────────────

function RoomCard({ room }: { room: LocalRoom }) {
  const title = room.room_label || room.room_type;

  // ── Furniture ─────────────────────────────────────────────────────────────
  const furniture: FurnitureItem[] = Array.isArray(room.furniture_items)
    ? (room.furniture_items as FurnitureItem[]).filter((fi) => !!fi.item)
    : [];

  // ── Features ──────────────────────────────────────────────────────────────
  const rawFeatures: Record<string, unknown> =
    room.room_features &&
    typeof room.room_features === 'object' &&
    !Array.isArray(room.room_features)
      ? (room.room_features as Record<string, unknown>)
      : {};

  const groupedFeatures = new Map<string, Array<{ label: string; value: string }>>();
  for (const [key, rawValue] of Object.entries(rawFeatures)) {
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

  // When the room has features or furniture, allow the card to span page
  // boundaries. For simple rooms (surface fields only) keep it together.
  const hasExtendedData = furniture.length > 0 || groupedFeatures.size > 0;

  return (
    <View style={s.roomCard} wrap={hasExtendedData}>
      <Text style={s.roomTitle}>{title}</Text>
      <View style={s.roomBody}>

        {/* ── Surface condition grid ── */}
        <View style={s.grid} wrap={false}>
          {SURFACE_FIELDS.map((f) => {
            const cond = room[f.condKey] as string | null;
            const notes = room[f.notesKey] as string | null;
            const isWalls = f.condKey === 'walls_condition';
            const paintCond = isWalls ? room.paint_condition : null;
            // Skip the field entirely if there is nothing to show.
            // For walls: also render if only paint_condition is set.
            if (!cond && !notes && !paintCond) return null;
            return (
              <View key={f.label} style={s.field}>
                <Text style={s.label}>{f.label}</Text>
                {/* Apply ROOM_CONDITION_LABELS to fix pre-existing raw-value display */}
                <Text style={s.value}>{cond ? (ROOM_CONDITION_LABELS[cond] ?? cond) : '—'}</Text>
                {notes ? <Text style={s.notes}>{notes}</Text> : null}
                {/* Paint condition — walls only, omit when null */}
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

        {/* ── Furniture & Fittings ── */}
        {furniture.length > 0 && (
          <View>
            <Text style={s.inCardGroupHeader}>Furniture & Fittings</Text>
            {/* Table header */}
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
                wrap={false}
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
            <View key={group} wrap={false}>
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
        <Text style={styles.sectionHeader}>Room-by-Room Condition</Text>
        <Text style={styles.mutedSmall}>No rooms recorded.</Text>
      </View>
    );
  }
  return (
    <View style={s.section}>
      <Text style={styles.sectionHeader}>Room-by-Room Condition</Text>
      {rooms.map((r) => (
        <RoomCard key={r.id} room={r} />
      ))}
    </View>
  );
}
