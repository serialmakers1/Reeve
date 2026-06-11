import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';

type KeyEntry = {
  id?: string;
  label?: string;
  requires_input?: boolean;
  keys_expected?: number;
  keys_found?: number;
};

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
  cLabel:     { flex: 3, paddingVertical: 4, paddingHorizontal: 6 },
  cExp:       { flex: 1, paddingVertical: 4, paddingHorizontal: 6 },
  cFound:     { flex: 1, paddingVertical: 4, paddingHorizontal: 6 },
  cStatus:    { flex: 2, paddingVertical: 4, paddingHorizontal: 6 },
  headerText: { fontSize: 8, fontWeight: 700, color: BRAND.mutedForeground },
  cellText:   { fontSize: 8, color: BRAND.foreground },
  statusOk:   { fontSize: 8, color: '#16a34a', fontWeight: 700 },
  statusBad:  { fontSize: 8, color: '#dc2626', fontWeight: 700 },
});

interface Props {
  keyReturn?: unknown;
}

export function KeyReturnSection({ keyReturn }: Props) {
  // Only rows the inspector explicitly tracked (requires_input) are meaningful
  // to the owner. If none, omit the section entirely.
  const entries: KeyEntry[] = (Array.isArray(keyReturn) ? (keyReturn as KeyEntry[]) : [])
    .filter((e) => !!e.requires_input);

  if (entries.length === 0) return null;

  return (
    <View style={s.section}>
      <Text style={styles.sectionHeader}>Key Record</Text>
      <View style={s.headerRow}>
        <Text style={[s.cLabel,  s.headerText]}>Item</Text>
        <Text style={[s.cExp,    s.headerText]}>Expected</Text>
        <Text style={[s.cFound,  s.headerText]}>Found</Text>
        <Text style={[s.cStatus, s.headerText]}>Status</Text>
      </View>
      {entries.map((entry, i) => {
        const expected = typeof entry.keys_expected === 'number' ? entry.keys_expected : 0;
        const found    = typeof entry.keys_found    === 'number' ? entry.keys_found    : 0;
        const missing  = expected - found;

        return (
          <View key={entry.id ?? i} style={[s.row, i % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
            <Text style={[s.cLabel, s.cellText]}>{entry.label || '—'}</Text>
            <Text style={[s.cExp,   s.cellText]}>{String(expected)}</Text>
            <Text style={[s.cFound, s.cellText]}>{String(found)}</Text>
            <View style={s.cStatus}>
              {missing === 0 ? (
                <Text style={s.statusOk}>OK</Text>
              ) : (
                <Text style={s.statusBad}>Missing {missing}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
