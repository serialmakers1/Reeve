import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';
import type { DamageItem } from '@/types/inspection';

const s = StyleSheet.create({
  section:    { marginBottom: 20 },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: BRAND.zebra,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  rowAlt:     { backgroundColor: BRAND.zebra },
  cLoc:       { flex: 2,   paddingVertical: 4, paddingHorizontal: 6 },
  cType:      { flex: 2,   paddingVertical: 4, paddingHorizontal: 6 },
  cCond:      { flex: 1.5, paddingVertical: 4, paddingHorizontal: 6 },
  cSev:       { flex: 1.5, paddingVertical: 4, paddingHorizontal: 6 },
  cNotes:     { flex: 2.5, paddingVertical: 4, paddingHorizontal: 6 },
  cAction:    { flex: 2,   paddingVertical: 4, paddingHorizontal: 6 },
  headerText: { fontSize: 8, fontWeight: 700, color: BRAND.mutedForeground },
  cellText:   { fontSize: 8, color: BRAND.foreground },
  mutedText:  { fontSize: 8, color: BRAND.mutedForeground },
  sevHigh:    { fontSize: 8, color: '#dc2626', fontWeight: 700 },
  sevMedium:  { fontSize: 8, color: '#d97706', fontWeight: 700 },
  sevLow:     { fontSize: 8, color: BRAND.mutedForeground },
  autoTag:    { fontSize: 7, color: BRAND.mutedForeground },
});

function SeverityText({ severity }: { severity: DamageItem['severity'] }) {
  // New values
  if (severity === 'urgent_immediate')    return <Text style={s.sevHigh}>Urgent — Immediate</Text>;
  if (severity === 'repair_before_relet') return <Text style={s.sevMedium}>Repair Before Re-let</Text>;
  if (severity === 'cosmetic')            return <Text style={s.sevLow}>Cosmetic</Text>;
  // Legacy values from old schema — handled defensively
  if ((severity as string) === 'high')   return <Text style={s.sevHigh}>Urgent — Immediate</Text>;
  if ((severity as string) === 'medium') return <Text style={s.sevMedium}>Repair Before Re-let</Text>;
  if ((severity as string) === 'low')    return <Text style={s.sevLow}>Cosmetic</Text>;
  return <Text style={s.cellText}>—</Text>;
}

interface Props {
  damages: DamageItem[];
}

export function DamagesSection({ damages }: Props) {
  if (damages.length === 0) {
    return (
      <View style={s.section}>
        <Text style={styles.sectionHeader}>Damage Logs</Text>
        <Text style={styles.mutedSmall}>No damages recorded.</Text>
      </View>
    );
  }
  return (
    <View style={s.section}>
      <Text style={styles.sectionHeader}>Damage Logs</Text>
      <View style={s.headerRow}>
        <Text style={[s.cLoc,    s.headerText]}>Location</Text>
        <Text style={[s.cType,   s.headerText]}>Damage Type</Text>
        <Text style={[s.cCond,   s.headerText]}>Condition</Text>
        <Text style={[s.cSev,    s.headerText]}>Severity</Text>
        <Text style={[s.cNotes,  s.headerText]}>Notes</Text>
        <Text style={[s.cAction, s.headerText]}>Rec. Action</Text>
      </View>
      {damages.map((d, i) => (
        <View key={d.localId} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
          <Text style={[s.cLoc, s.cellText]}>{d.location || '—'}</Text>
          <View style={s.cType}>
            <Text style={s.cellText}>{d.damage_type || '—'}</Text>
            {d.is_auto_generated ? <Text style={s.autoTag}>(Auto)</Text> : null}
          </View>
          <Text style={[s.cCond, d.source_condition ? s.cellText : s.mutedText]}>
            {d.source_condition || '—'}
          </Text>
          <View style={s.cSev}><SeverityText severity={d.severity} /></View>
          <Text style={[s.cNotes, s.cellText]}>{d.notes || '—'}</Text>
          <Text style={[s.cAction, d.recommended_action ? s.cellText : s.mutedText]}>
            {(d.recommended_action as string) || '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}
