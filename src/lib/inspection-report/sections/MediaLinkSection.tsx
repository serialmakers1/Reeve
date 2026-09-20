import React from 'react';
import { View, Text, Link, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { SectionHeading } from './PdfPrimitives';
import { PdfIcon } from './PdfIcon';

const s = StyleSheet.create({
  section: { marginBottom: 18 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BRAND.indigoTint,
    borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 8, padding: 14,
  },
  iconWrap: {
    width: 34, height: 34, borderRadius: 8, backgroundColor: BRAND.white,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    borderWidth: 1, borderColor: BRAND.borderSoft,
  },
  body: { flex: 1 },
  title: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: BRAND.foreground },
  desc: { fontSize: 8.5, color: BRAND.mutedForeground, marginTop: 2, lineHeight: 1.4 },
  cta: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: BRAND.blue, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10,
  },
  ctaText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRAND.white, marginRight: 4, textDecoration: 'none' },
});

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export function MediaLinkSection({ link }: { link?: string | null }) {
  if (!link) return null;

  return (
    <View style={s.section} wrap={false}>
      <SectionHeading
        icon="folder" title="Dated Photo & Evidence Folder" accent={BRAND.violet}
        id="sec-evidence" bookmark="Dated Photo & Evidence Folder"
        descriptor="Supporting dated inspection evidence is stored separately."
      />
      <View style={s.card}>
        <View style={s.iconWrap}><PdfIcon name="folder" size={18} color={BRAND.blue} /></View>
        <View style={s.body}>
          <Text style={s.title}>Dated Photo & Evidence Folder</Text>
          <Text style={s.desc}>Inspection photographs and evidence are provided separately in the linked folder.</Text>
        </View>
        <Link src={link} style={s.cta} hitSlop={HIT}>
          <Text style={s.ctaText}>Open Evidence Folder</Text>
          <PdfIcon name="arrow" size={11} color={BRAND.white} />
        </Link>
      </View>
    </View>
  );
}
