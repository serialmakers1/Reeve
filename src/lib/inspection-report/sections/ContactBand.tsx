import React from 'react';
import { View, Text, Link, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { PdfIcon } from './PdfIcon';

/**
 * Closing Reeve contact band — rendered once after the disclaimer (NOT on every
 * page). Reeve's own public business info (letterhead-style), not owner/tenant
 * PII, so it does not touch the privacy boundary.
 */
const WHATSAPP = '+91 7899874281';
const EMAIL = 'support@reeve.in';
const WEBSITE = 'reeve.in';

const s = StyleSheet.create({
  band: {
    marginTop: 8,
    backgroundColor: BRAND.ink,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  headline: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BRAND.onDark, marginBottom: 12 },
  row: { flexDirection: 'row' },
  col: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  sep: { width: 1, backgroundColor: '#2A3350', marginHorizontal: 10 },
  halo: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#33406A',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  label: { fontSize: 7, color: BRAND.onDarkMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: BRAND.onDark, marginTop: 1 },
  link: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#8FB4FF', marginTop: 1, textDecoration: 'none' },
});

const HIT = { top: 6, bottom: 6, left: 4, right: 4 };

export function ContactBand() {
  return (
    <View style={s.band} wrap={false}>
      <Text style={s.headline}>Questions about this report?</Text>
      <View style={s.row}>
        <View style={s.col}>
          <View style={s.halo}><PdfIcon name="phone" size={12} color="#8FB4FF" /></View>
          <View>
            <Text style={s.label}>Call / WhatsApp</Text>
            <Link src="https://wa.me/917899874281" style={s.link} hitSlop={HIT}>{WHATSAPP}</Link>
          </View>
        </View>
        <View style={s.sep} />
        <View style={s.col}>
          <View style={s.halo}><PdfIcon name="mail" size={12} color="#8FB4FF" /></View>
          <View>
            <Text style={s.label}>Email</Text>
            <Link src="mailto:support@reeve.in" style={s.link} hitSlop={HIT}>{EMAIL}</Link>
          </View>
        </View>
        <View style={s.sep} />
        <View style={s.col}>
          <View style={s.halo}><PdfIcon name="globe" size={12} color="#8FB4FF" /></View>
          <View>
            <Text style={s.label}>Website</Text>
            <Link src="https://www.reeve.in" style={s.link} hitSlop={HIT}>{WEBSITE}</Link>
          </View>
        </View>
      </View>
    </View>
  );
}
