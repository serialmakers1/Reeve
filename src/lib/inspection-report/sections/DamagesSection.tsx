import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';
import type { DamageItem } from '@/pages/admin/InspectionForm';

const s = StyleSheet.create({
  section: { marginBottom: 20 },
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
  rowAlt: { backgroundColor: BRAND.zebra },
  cLoc:   { flex: 2, paddingVertical: 4, paddingHorizontal: 6 },
  cType:  { flex: 2, paddingVertical: 4, paddingHorizontal: 6 },
  cSev:   { flex: 1, paddingVertical: 4, paddingHorizontal: 6 },
  cNotes: { flex: 3, paddingVertical: 4, paddingHorizontal: 6 },
  headerText: { fontSize: 8, fontWeight: 700, color: BRAND.mutedForeground },
  cellText:   { fontSize: 8, color: BRAND.foreground },
  sevHigh:    { fontSize: 8, color: '#dc2626', fontWeight: 700 },
  sevMedium:  { fontSize: 8, color: '#d97706', fontWeight: 700 },
  sevLow:     { fontSize: 8, color: BRAND.mutedForeground },
});

function SeverityText({ severity }: { severity: DamageItem['severity'] }) {
  if (severity === 'high')   return <Text style={s.sevHigh}>High</Text>;
  if (severity === 'medium') return <Text style={s.sevMedium}>Medium</Text>;
  if (severity === 'low')    return <Text style={s.sevLow}>Low</Text>;
  return <Text style={s.cellText}>—</Text>;
}

interface Props {
  damages: DamageItem[];
}

export function DamagesSection({ damages }: Props) {
  if (damages.length === 0) {
    return (
      <View style={s.section}>
        <Text style={styles.sectionHeader}>Pre-Existing Damages</Text>
        <Text style={styles.mutedSmall}>No damages recorded.</Text>
      </View>
    );
  }
  return (
    <View style={s.section}>
      <Text style={styles.sectionHeader}>Pre-Existing Damages</Text>
      <View style={s.headerRow}>
        <Text style={[s.cLoc,   s.headerText]}>Location</Text>
        <Text style={[s.cType,  s.headerText]}>Damage Type</Text>
        <Text style={[s.cSev,   s.headerText]}>Severity</Text>
        <Text style={[s.cNotes, s.headerText]}>Notes</Text>
      </View>
      {damages.map((d, i) => (
        <View key={d.localId} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
          <Text style={[s.cLoc,   s.cellText]}>{d.location || '—'}</Text>
          <Text style={[s.cType,  s.cellText]}>{d.damage_type || '—'}</Text>
          <View style={s.cSev}><SeverityText severity={d.severity} /></View>
          <Text style={[s.cNotes, s.cellText]}>{d.notes || '—'}</Text>
        </View>
      ))}
    </View>
  );
}
