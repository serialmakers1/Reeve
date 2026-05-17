import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';
import type { InspectionRecord } from '@/pages/admin/InspectionForm';

const s = StyleSheet.create({
  section: { marginBottom: 20 },
  notesBox: {
    borderWidth: 1,
    borderColor: BRAND.border,
    borderRadius: 3,
    padding: 8,
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: BRAND.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 9,
    color: BRAND.foreground,
    lineHeight: 1.5,
  },
});

interface Props {
  inspection: InspectionRecord;
}

export function NotesSection({ inspection }: Props) {
  const hasGeneral    = !!inspection.general_observations;
  const hasInspector  = !!inspection.inspector_notes;

  if (!hasGeneral && !hasInspector) return null;

  return (
    <View style={s.section}>
      <Text style={styles.sectionHeader}>Inspector Notes</Text>
      {hasGeneral && (
        <View style={s.notesBox}>
          <Text style={s.notesLabel}>General Observations</Text>
          <Text style={s.notesText}>{inspection.general_observations as string}</Text>
        </View>
      )}
      {hasInspector && (
        <View style={s.notesBox}>
          <Text style={s.notesLabel}>Inspector Notes</Text>
          <Text style={s.notesText}>{inspection.inspector_notes as string}</Text>
        </View>
      )}
    </View>
  );
}
