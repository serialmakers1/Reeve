import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { SectionHeading, PremiumCard } from './PdfPrimitives';

type InspectionSummaryData = {
  overall_condition?: string;
  cleaning_required?: string;
  repainting_required?: string;
  urgent_items?: string;
  recommended_items?: string;
};

const OVERALL_META: Record<string, { label: string; color: string }> = {
  good:     { label: 'Good',     color: '#16a34a' },
  fair:     { label: 'Fair',     color: '#d97706' },
  poor:     { label: 'Poor',     color: '#ea580c' },
  critical: { label: 'Critical', color: '#dc2626' },
};

const CLEANING_LABELS: Record<string, string> = {
  none:        'None required',
  basic_clean: 'Basic clean',
  deep_clean:  'Deep clean required',
};

const REPAINTING_LABELS: Record<string, string> = {
  none:            'None required',
  touch_up:        'Touch-up required',
  full_some_rooms: 'Full repaint (some rooms)',
  full_all_rooms:  'Full repaint (all rooms)',
};

const s = StyleSheet.create({
  section:        { marginBottom: 20 },
  overallRow:     { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 6 },
  overallLabel:   { fontSize: 8, color: BRAND.mutedForeground, marginRight: 6 },
  overallValue:   { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  grid:           { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  cell:           { width: '50%', marginBottom: 8, paddingRight: 8 },
  cellLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  cellValue:      { fontSize: 9, color: BRAND.foreground },
  textBlock:      { marginTop: 6 },
  textBlockLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  textBlockValue: { fontSize: 9, color: BRAND.foreground, lineHeight: 1.4 },
});

interface Props {
  summary?: unknown;
}

export function InspectionSummarySection({ summary: rawSummary }: Props) {
  const summary: InspectionSummaryData =
    rawSummary && typeof rawSummary === 'object' && !Array.isArray(rawSummary)
      ? (rawSummary as InspectionSummaryData)
      : {};

  const hasData =
    summary.overall_condition ||
    summary.cleaning_required ||
    summary.repainting_required ||
    summary.urgent_items ||
    summary.recommended_items;

  // Optional section — omit entirely when nothing was recorded.
  if (!hasData) return null;

  const overallMeta = summary.overall_condition ? OVERALL_META[summary.overall_condition] : null;

  return (
    <View style={s.section}>
      <SectionHeading
        icon="check" title="Inspection Snapshot" accent={BRAND.blue}
        id="sec-snapshot" bookmark="Inspection Snapshot"
        descriptor="Key recorded inspection context."
      />
      <PremiumCard>
      {overallMeta && (
        <View style={s.overallRow}>
          <Text style={s.overallLabel}>Overall condition:</Text>
          <Text style={[s.overallValue, { color: overallMeta.color }]}>{overallMeta.label}</Text>
        </View>
      )}

      <View style={s.grid}>
        {summary.cleaning_required ? (
          <View style={s.cell}>
            <Text style={s.cellLabel}>Cleaning Required</Text>
            <Text style={s.cellValue}>
              {CLEANING_LABELS[summary.cleaning_required] ?? summary.cleaning_required}
            </Text>
          </View>
        ) : null}
        {summary.repainting_required ? (
          <View style={s.cell}>
            <Text style={s.cellLabel}>Repainting</Text>
            <Text style={s.cellValue}>
              {REPAINTING_LABELS[summary.repainting_required] ?? summary.repainting_required}
            </Text>
          </View>
        ) : null}
      </View>

      {summary.urgent_items ? (
        <View style={s.textBlock}>
          <Text style={s.textBlockLabel}>Urgent Items</Text>
          <Text style={s.textBlockValue}>{summary.urgent_items}</Text>
        </View>
      ) : null}
      {summary.recommended_items ? (
        <View style={s.textBlock}>
          <Text style={s.textBlockLabel}>Recommended Items</Text>
          <Text style={s.textBlockValue}>{summary.recommended_items}</Text>
        </View>
      ) : null}
      </PremiumCard>
    </View>
  );
}
