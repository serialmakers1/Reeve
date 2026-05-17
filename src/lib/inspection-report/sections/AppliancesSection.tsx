import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';
import { APPLIANCE_TYPE_LABELS, APPLIANCE_CONDITION_LABELS, APPLIANCE_OWNERSHIP_LABELS, labelOf } from '../applianceOptions';
import type { LocalAppliance } from '@/pages/admin/InspectionForm';

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
  c1: { flex: 2, paddingVertical: 4, paddingHorizontal: 6 },
  c2: { flex: 2, paddingVertical: 4, paddingHorizontal: 6 },
  c3: { flex: 2, paddingVertical: 4, paddingHorizontal: 6 },
  c4: { flex: 2, paddingVertical: 4, paddingHorizontal: 6 },
  c5: { flex: 1, paddingVertical: 4, paddingHorizontal: 6 },
  headerText: { fontSize: 8, fontWeight: 700, color: BRAND.mutedForeground },
  cellText: { fontSize: 8, color: BRAND.foreground },
  mutedText: { fontSize: 8, color: BRAND.mutedForeground },
});

function ApplianceRow({ appliance, index }: { appliance: LocalAppliance; index: number }) {
  const name = labelOf(APPLIANCE_TYPE_LABELS, appliance.appliance_type);
  const label = appliance.custom_label ? `${name} (${appliance.custom_label})` : name;
  const brand = [appliance.brand, appliance.model_number].filter(Boolean).join(' / ') || '—';
  const condition = labelOf(APPLIANCE_CONDITION_LABELS, appliance.condition);
  const ownership = labelOf(APPLIANCE_OWNERSHIP_LABELS, appliance.ownership);
  const year = appliance.manufacturing_year ? String(appliance.manufacturing_year) : '—';

  return (
    <View style={[s.row, index % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
      <Text style={[s.c1, s.cellText]}>{label}</Text>
      <Text style={[s.c2, s.cellText]}>{brand}</Text>
      <Text style={[s.c3, s.cellText]}>{condition}</Text>
      <Text style={[s.c4, s.cellText]}>{ownership}</Text>
      <Text style={[s.c5, s.mutedText]}>{year}</Text>
    </View>
  );
}

interface Props {
  appliances: LocalAppliance[];
}

export function AppliancesSection({ appliances }: Props) {
  if (appliances.length === 0) {
    return (
      <View style={s.section}>
        <Text style={styles.sectionHeader}>Appliances & Fixtures</Text>
        <Text style={styles.mutedSmall}>No appliances recorded.</Text>
      </View>
    );
  }
  return (
    <View style={s.section}>
      <Text style={styles.sectionHeader}>Appliances & Fixtures</Text>
      <View style={s.headerRow}>
        <Text style={[s.c1, s.headerText]}>Appliance</Text>
        <Text style={[s.c2, s.headerText]}>Brand / Model</Text>
        <Text style={[s.c3, s.headerText]}>Condition</Text>
        <Text style={[s.c4, s.headerText]}>Ownership</Text>
        <Text style={[s.c5, s.headerText]}>Year</Text>
      </View>
      {appliances.map((a, i) => (
        <ApplianceRow key={a.id} appliance={a} index={i} />
      ))}
    </View>
  );
}
