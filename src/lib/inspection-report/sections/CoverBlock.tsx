import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { formatBhk } from '@/lib/propertyStatus';
import { REPORT_TYPE_META } from '../types';
import { formatINDate, formatINDateTimeIST } from '../formatters';
import type { ReportPayload } from '../types';

const s = StyleSheet.create({
  cover: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.primary,
  },
  reportType: {
    fontSize: 11,
    fontWeight: 700,
    color: BRAND.primary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: BRAND.foreground,
    marginBottom: 4,
  },
  description: {
    fontSize: 9,
    color: BRAND.mutedForeground,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  field: {
    width: '50%',
    marginBottom: 8,
    paddingRight: 8,
  },
  label: {
    fontSize: 7,
    fontWeight: 700,
    color: BRAND.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: BRAND.foreground,
  },
});

interface Props {
  payload: ReportPayload;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value || '—'}</Text>
    </View>
  );
}

export function CoverBlock({ payload }: Props) {
  const { reportType, property, inspection, inspectorName, ownerName, generatedAt } = payload;
  const meta = REPORT_TYPE_META[reportType];

  const address = [
    property.flat_number ? `Flat ${property.flat_number}` : null,
    property.building_name,
    property.locality,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={s.cover}>
      <Text style={s.reportType}>{reportType}</Text>
      <Text style={s.title}>{meta.title}</Text>
      <Text style={s.description}>{meta.description}</Text>
      <View style={s.grid}>
        <Field label="Property" value={address} />
        <Field label="Owner" value={ownerName} />
        <Field label="Inspection Date" value={formatINDate(inspection.inspection_date)} />
        <Field label="Inspector" value={inspectorName} />
        <Field label="BHK" value={formatBhk(property.bhk)} />
        <Field label="Generated" value={formatINDateTimeIST(generatedAt)} />
        <Field label="Inspection Ref" value={inspection.id.slice(0, 8).toUpperCase()} />
      </View>
    </View>
  );
}
