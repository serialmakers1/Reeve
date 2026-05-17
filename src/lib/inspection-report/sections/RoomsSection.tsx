import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';
import type { LocalRoom } from '@/pages/admin/InspectionForm';

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
});

const SURFACE_FIELDS: Array<{ label: string; condKey: keyof LocalRoom; notesKey: keyof LocalRoom }> = [
  { label: 'Walls',           condKey: 'walls_condition',          notesKey: 'walls_notes' },
  { label: 'Flooring',        condKey: 'flooring_condition',       notesKey: 'flooring_notes' },
  { label: 'Ceiling',         condKey: 'ceiling_condition',        notesKey: 'ceiling_notes' },
  { label: 'Doors & Windows', condKey: 'doors_windows_condition',  notesKey: 'doors_windows_notes' },
  { label: 'Electrical',      condKey: 'electrical_condition',     notesKey: 'electrical_notes' },
  { label: 'Plumbing',        condKey: 'plumbing_condition',       notesKey: 'plumbing_notes' },
];

function RoomCard({ room }: { room: LocalRoom }) {
  const title = room.room_label || room.room_type;
  return (
    <View style={s.roomCard} wrap={false}>
      <Text style={s.roomTitle}>{title}</Text>
      <View style={s.roomBody}>
        <View style={s.grid}>
          {SURFACE_FIELDS.map((f) => {
            const cond = room[f.condKey] as string | null;
            const notes = room[f.notesKey] as string | null;
            if (!cond && !notes) return null;
            return (
              <View key={f.label} style={s.field}>
                <Text style={s.label}>{f.label}</Text>
                <Text style={s.value}>{cond || '—'}</Text>
                {notes ? <Text style={s.notes}>{notes}</Text> : null}
              </View>
            );
          })}
        </View>
        {room.overall_room_notes ? (
          <Text style={s.notes}>Overall: {room.overall_room_notes}</Text>
        ) : null}
      </View>
    </View>
  );
}

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
