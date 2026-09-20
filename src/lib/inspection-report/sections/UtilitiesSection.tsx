import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { UTILITY_KEYS } from '../types';
import { UTILITY_LABELS } from '../utilitiesLabels';
import { SectionHeading, PremiumCard } from './PdfPrimitives';
import { PdfIcon } from './PdfIcon';
import type { IconName } from './PdfIcon';
import type { UtilityKey, UtilityGroup, ReportPayload } from '../types';

const s = StyleSheet.create({
  section: { marginBottom: 18 },
  group: { marginBottom: 10 },
  groupHeadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  groupTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND.foreground, marginLeft: 6 },
  row: { flexDirection: 'row', paddingVertical: 3 },
  rowZebra: { backgroundColor: BRAND.coolGray, borderRadius: 3 },
  labelCell: { flex: 2, paddingHorizontal: 6, fontSize: 9, color: BRAND.mutedForeground },
  valueCell: { flex: 3, paddingHorizontal: 6, fontSize: 9, color: BRAND.foreground },
});

const GROUP_ORDER: UtilityGroup[] = [
  'Door & Keys', 'Water', 'Gas', 'Electricity', 'Safety & Security', 'Society Management', 'Other',
];

const GROUP_ICON: Record<UtilityGroup, IconName> = {
  'Door & Keys': 'key',
  Water: 'water',
  Gas: 'flame',
  Electricity: 'bolt',
  'Safety & Security': 'shield',
  'Society Management': 'building',
  Other: 'home',
};

function valueToString(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (v === 'Y' || v === 'true') return 'Yes';
  if (v === 'N' || v === 'false') return 'No';
  return String(v);
}

// Genuine integer-count keys only ("02"→"2"); IDs, meter readings, amounts stay verbatim.
const COUNT_KEYS = new Set<UtilityKey>(['door_keys_count', 'electricity_circuits']);
function formatUtilityValue(key: UtilityKey, raw: unknown): string {
  if (COUNT_KEYS.has(key)) {
    const str = String(raw);
    if (/^\d+$/.test(str)) return String(parseInt(str, 10));
  }
  return valueToString(raw);
}

interface Props {
  utilitiesOverview: ReportPayload['utilitiesOverview'];
}

export function UtilitiesSection({ utilitiesOverview }: Props) {
  const byGroup = new Map<UtilityGroup, Array<{ key: UtilityKey; label: string; value: string }>>();

  for (const key of UTILITY_KEYS) {
    const meta = UTILITY_LABELS[key];
    const raw = utilitiesOverview[key];
    if (raw === null || raw === undefined || raw === '') continue;
    if (!byGroup.has(meta.group)) byGroup.set(meta.group, []);
    byGroup.get(meta.group)!.push({ key, label: meta.label, value: formatUtilityValue(key, raw) });
  }

  // Optional section — omit entirely when nothing was recorded.
  if (byGroup.size === 0) return null;

  return (
    <View style={s.section}>
      <SectionHeading
        icon="bolt" title="Utilities & Property Services" accent={BRAND.cyan}
        id="sec-utilities" bookmark="Utilities & Property Services"
        descriptor="Utility and property-level information recorded during inspection."
      />
      {GROUP_ORDER.map((group) => {
        const rows = byGroup.get(group);
        if (!rows || rows.length === 0) return null;
        return (
          <PremiumCard key={group} style={s.group}>
            <View style={s.groupHeadRow}>
              <PdfIcon name={GROUP_ICON[group]} size={12} color={BRAND.cyan} />
              <Text style={s.groupTitle}>{group}</Text>
            </View>
            {rows.map((r, i) => (
              <View key={r.key} style={[s.row, i % 2 === 1 ? s.rowZebra : {}]}>
                <Text style={s.labelCell}>{r.label}</Text>
                <Text style={s.valueCell}>{r.value}</Text>
              </View>
            ))}
          </PremiumCard>
        );
      })}
    </View>
  );
}
