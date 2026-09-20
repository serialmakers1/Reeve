import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { SectionHeading, PremiumCard } from './PdfPrimitives';

type KeyEntry = {
  id?: string;
  label?: string;
  requires_input?: boolean;
  keys_expected?: number;
  keys_found?: number;
};

const s = StyleSheet.create({
  section: { marginBottom: 18 },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: BRAND.border, paddingBottom: 4, marginBottom: 2 },
  row: { flexDirection: 'row', paddingVertical: 4 },
  rowAlt: { backgroundColor: BRAND.coolGray, borderRadius: 3 },
  cLabel: { flex: 3, paddingHorizontal: 6 },
  cExp: { flex: 1, paddingHorizontal: 6 },
  cFound: { flex: 1, paddingHorizontal: 6 },
  cStatus: { flex: 2, paddingHorizontal: 6 },
  headerText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.3 },
  cellText: { fontSize: 9, color: BRAND.foreground },
  statusOk: { fontSize: 8.5, color: BRAND.goodText, fontFamily: 'Helvetica-Bold' },
  statusBad: { fontSize: 8.5, color: BRAND.urgentText, fontFamily: 'Helvetica-Bold' },
  statusMuted: { fontSize: 8.5, color: BRAND.mutedForeground },
});

// Derives a factual key status without inventing zeros: absent counts stay '—',
// and status is 'Not recorded' unless both are present.
function keyStatus(expected: number | undefined, found: number | undefined) {
  const hasExp = typeof expected === 'number';
  const hasFound = typeof found === 'number';
  if (!hasExp || !hasFound) return { kind: 'muted' as const, text: 'Not recorded' };
  if (found === expected) return { kind: 'ok' as const, text: 'OK' };
  if (expected > found) return { kind: 'bad' as const, text: `Missing ${expected - found}` };
  return { kind: 'muted' as const, text: `Extra ${found - expected}` };
}

export function KeyReturnSection({ keyReturn }: { keyReturn?: unknown }) {
  const entries: KeyEntry[] = (Array.isArray(keyReturn) ? (keyReturn as KeyEntry[]) : [])
    .filter((e) => !!e.requires_input);

  if (entries.length === 0) return null;

  return (
    <View style={s.section}>
      <SectionHeading
        icon="key" title="Keys & Handover" accent={BRAND.teal}
        id="sec-keys" bookmark="Keys & Handover"
        descriptor="Recorded key and handover information."
      />
      <PremiumCard>
        <View style={s.headerRow}>
          <Text style={[s.cLabel, s.headerText]}>Item</Text>
          <Text style={[s.cExp, s.headerText]}>Expected</Text>
          <Text style={[s.cFound, s.headerText]}>Found</Text>
          <Text style={[s.cStatus, s.headerText]}>Status</Text>
        </View>
        {entries.map((entry, i) => {
          const expected = typeof entry.keys_expected === 'number' ? entry.keys_expected : undefined;
          const found = typeof entry.keys_found === 'number' ? entry.keys_found : undefined;
          const status = keyStatus(expected, found);
          const statusStyle = status.kind === 'ok' ? s.statusOk : status.kind === 'bad' ? s.statusBad : s.statusMuted;
          return (
            <View key={entry.id ?? i} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
              <Text style={[s.cLabel, s.cellText]}>{entry.label || '—'}</Text>
              <Text style={[s.cExp, s.cellText]}>{expected != null ? String(expected) : '—'}</Text>
              <Text style={[s.cFound, s.cellText]}>{found != null ? String(found) : '—'}</Text>
              <View style={s.cStatus}>
                <Text style={statusStyle}>{status.text}</Text>
              </View>
            </View>
          );
        })}
      </PremiumCard>
    </View>
  );
}
