import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { SectionHeading } from './PdfPrimitives';
import type { ReportInspectionMeta } from '../types';

const s = StyleSheet.create({
  section: { marginBottom: 18 },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: BRAND.white,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 8,
    padding: 12, marginBottom: 8,
  },
  accent: { width: 3, borderRadius: 2, backgroundColor: BRAND.indigo, marginRight: 10 },
  body: { flex: 1 },
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  text: { fontSize: 9.5, color: BRAND.foreground, lineHeight: 1.55 },
});

export function NotesSection({ inspection }: { inspection: ReportInspectionMeta }) {
  const hasGeneral = !!inspection.general_observations;
  const hasInspector = !!inspection.inspector_notes;
  if (!hasGeneral && !hasInspector) return null;

  return (
    <View style={s.section}>
      <SectionHeading
        icon="notes" title="Inspector Notes" accent={BRAND.indigo}
        id="sec-notes" bookmark="Inspector Notes"
        descriptor="Additional observations recorded during inspection."
      />
      {hasGeneral && (
        <View style={s.noteCard}>
          <View style={s.accent} />
          <View style={s.body}>
            <Text style={s.label}>General Observations</Text>
            <Text style={s.text}>{inspection.general_observations as string}</Text>
          </View>
        </View>
      )}
      {hasInspector && (
        <View style={s.noteCard}>
          <View style={s.accent} />
          <View style={s.body}>
            <Text style={s.label}>Inspector Notes</Text>
            <Text style={s.text}>{inspection.inspector_notes as string}</Text>
          </View>
        </View>
      )}
    </View>
  );
}
