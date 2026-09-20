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

// Normalizes new + legacy severity values to the three internal keys.
function normalizeSeverity(severity: DamageItem['severity']): 'cosmetic' | 'repair_before_relet' | 'urgent_immediate' | null {
  if (severity === 'urgent_immediate' || (severity as string) === 'high')   return 'urgent_immediate';
  if (severity === 'repair_before_relet' || (severity as string) === 'medium') return 'repair_before_relet';
  if (severity === 'cosmetic' || (severity as string) === 'low')            return 'cosmetic';
  return null;
}

function SeverityText({ severity }: { severity: DamageItem['severity'] }) {
  const key = normalizeSeverity(severity);
  if (key === 'urgent_immediate')    return <Text style={s.sevHigh}>Urgent</Text>;
  if (key === 'repair_before_relet') return <Text style={s.sevMedium}>Attention Needed</Text>;
  if (key === 'cosmetic')            return <Text style={s.sevLow}>Cosmetic / Minor</Text>;
  return <Text style={s.cellText}>—</Text>;
}

// Display-only next-action fallback derived from severity. Applied ONLY to auto-generated
// issues that carry no inspector-entered recommendation; never persisted.
const SEVERITY_DEFAULT_ACTION: Record<'cosmetic' | 'repair_before_relet' | 'urgent_immediate', string> = {
  cosmetic:            'Monitor',
  repair_before_relet: 'Maintenance recommended',
  urgent_immediate:    'Urgent attention',
};

function nextAction(d: DamageItem): string {
  const manual = d.recommended_action?.trim();
  if (manual) return manual;
  if (d.is_auto_generated) {
    const key = normalizeSeverity(d.severity);
    if (key) return SEVERITY_DEFAULT_ACTION[key];
  }
  return '';
}

interface Props {
  damages: DamageItem[];
}

export function DamagesSection({ damages }: Props) {
  if (damages.length === 0) {
    return (
      <View style={s.section}>
        <Text style={styles.sectionHeader}>Issues Requiring Attention</Text>
        <Text style={styles.mutedSmall}>No issues requiring attention were recorded.</Text>
      </View>
    );
  }
  return (
    <View style={s.section}>
      <Text style={styles.sectionHeader}>Issues Requiring Attention</Text>
      <View style={s.headerRow}>
        <Text style={[s.cLoc,    s.headerText]}>Location</Text>
        <Text style={[s.cType,   s.headerText]}>Issue Type</Text>
        <Text style={[s.cCond,   s.headerText]}>Condition</Text>
        <Text style={[s.cSev,    s.headerText]}>Severity</Text>
        <Text style={[s.cNotes,  s.headerText]}>Notes</Text>
        <Text style={[s.cAction, s.headerText]}>Rec. Action</Text>
      </View>
      {damages.map((d, i) => {
        const action = nextAction(d);
        return (
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
            <Text style={[s.cAction, action ? s.cellText : s.mutedText]}>
              {action || '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
