import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { APPLIANCE_TYPE_LABELS, APPLIANCE_CONDITION_LABELS, APPLIANCE_OWNERSHIP_LABELS, labelOf } from '../applianceOptions';
import { SectionHeading } from './PdfPrimitives';
import { PdfIcon } from './PdfIcon';
import type { LocalAppliance } from '@/types/inspection';

const s = StyleSheet.create({
  section: { marginBottom: 18 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BRAND.white,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 6,
    paddingVertical: 6, paddingHorizontal: 8, marginBottom: 5,
  },
  rowAlt: { backgroundColor: BRAND.coolGray },
  icon: { marginRight: 8 },
  main: { flex: 3 },
  name: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: BRAND.foreground },
  meta: { fontSize: 8, color: BRAND.mutedForeground, marginTop: 1 },
  ownership: { flex: 2, fontSize: 8.5, color: BRAND.foreground, paddingHorizontal: 6 },
  condChip: { alignSelf: 'flex-start', borderRadius: 4, backgroundColor: BRAND.indigoTint, paddingVertical: 2, paddingHorizontal: 6 },
  condText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: BRAND.blue },
});

function ApplianceRow({ appliance, index }: { appliance: LocalAppliance; index: number }) {
  const name = labelOf(APPLIANCE_TYPE_LABELS, appliance.appliance_type);
  const label = appliance.custom_label ? `${name} (${appliance.custom_label})` : name;
  const brand = [appliance.brand, appliance.model_number].filter(Boolean).join(' / ');
  const year = appliance.manufacturing_year ? String(appliance.manufacturing_year) : '';
  const metaLine = [brand, year].filter(Boolean).join(' · ') || '—';
  const condition = labelOf(APPLIANCE_CONDITION_LABELS, appliance.condition);
  const ownership = labelOf(APPLIANCE_OWNERSHIP_LABELS, appliance.ownership);

  return (
    <View style={[s.row, index % 2 === 1 ? s.rowAlt : {}]} wrap={false}>
      <View style={s.icon}><PdfIcon name="appliance" size={13} color={BRAND.blue} /></View>
      <View style={s.main}>
        <Text style={s.name}>{label}</Text>
        <Text style={s.meta}>{metaLine}</Text>
      </View>
      <Text style={s.ownership}>{ownership}</Text>
      <View style={s.condChip}><Text style={s.condText}>{condition}</Text></View>
    </View>
  );
}

export function AppliancesSection({ appliances }: { appliances: LocalAppliance[] }) {
  // Optional section — omit entirely when nothing was recorded.
  if (appliances.length === 0) return null;
  return (
    <View style={s.section}>
      <SectionHeading
        icon="appliance" title="Appliances & Fittings" accent={BRAND.blue}
        id="sec-appliances" bookmark="Appliances & Fittings"
        descriptor="Recorded appliances and their visible condition."
      />
      {appliances.map((a, i) => (
        <ApplianceRow key={a.id} appliance={a} index={i} />
      ))}
    </View>
  );
}
