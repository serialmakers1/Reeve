import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';
import { UTILITY_KEYS } from '../types';
import { UTILITY_LABELS } from '../utilitiesLabels';
import type { UtilityKey, UtilityGroup, ReportPayload } from '../types';

const s = StyleSheet.create({
  section: { marginBottom: 20 },
  groupHeader: {
    fontSize: 10,
    fontWeight: 700,
    color: BRAND.primary,
    marginTop: 12,
    marginBottom: 4,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  rowZebra: {
    backgroundColor: BRAND.zebra,
  },
  labelCell: {
    flex: 2,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
    color: BRAND.mutedForeground,
  },
  valueCell: {
    flex: 3,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
    color: BRAND.foreground,
  },
});

const GROUP_ORDER: UtilityGroup[] = [
  'Door & Keys',
  'Water',
  'Gas',
  'Electricity',
  'Safety & Security',
  'Society Management',
  'Other',
];

function valueToString(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  // Normalize obvious raw yes/no encodings to readable labels.
  if (v === 'Y' || v === 'true') return 'Yes';
  if (v === 'N' || v === 'false') return 'No';
  return String(v);
}

interface Props {
  utilitiesOverview: ReportPayload['utilitiesOverview'];
}

export function UtilitiesSection({ utilitiesOverview }: Props) {
  // Group keys by group, filtering to only present keys
  const byGroup = new Map<UtilityGroup, Array<{ key: UtilityKey; label: string; value: string }>>();

  for (const key of UTILITY_KEYS) {
    const meta = UTILITY_LABELS[key];
    const raw = utilitiesOverview[key];
    if (raw === null || raw === undefined || raw === '') continue;
    const group = meta.group;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group)!.push({ key, label: meta.label, value: valueToString(raw) });
  }

  const hasData = byGroup.size > 0;

  // Optional section — omit entirely when nothing was recorded.
  if (!hasData) return null;

  return (
    <View style={s.section}>
      <Text style={styles.sectionHeader}>Utilities & Facilities Overview</Text>
      {GROUP_ORDER.map((group) => {
        const rows = byGroup.get(group);
        if (!rows || rows.length === 0) return null;
        return (
          <View key={group}>
            <Text style={s.groupHeader}>{group}</Text>
            {rows.map((r, i) => (
              <View key={r.key} style={[s.row, i % 2 === 1 ? s.rowZebra : {}]} wrap={false}>
                <Text style={s.labelCell}>{r.label}</Text>
                <Text style={s.valueCell}>{r.value}</Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
