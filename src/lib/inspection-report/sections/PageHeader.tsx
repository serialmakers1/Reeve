import React from 'react';
import { View, Text, Image, Link, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { REPORT_TYPE_META } from '../types';
import { PdfIcon } from './PdfIcon';
import type { ReportType } from '../types';
import logoUrl from '@/assets/logo-print.png';

const s = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: BRAND.white,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.blue,
  },
  logo: { width: 74, height: 21, objectFit: 'contain' },
  title: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BRAND.mutedForeground, letterSpacing: 0.5, marginLeft: 10 },
  spacer: { flex: 1 },
  overview: { flexDirection: 'row', alignItems: 'center' },
  overviewText: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BRAND.blue, textDecoration: 'none', marginLeft: 4 },
});

const HIT = { top: 8, bottom: 8, left: 8, right: 8 };

export function PageHeader({ reportType }: { reportType: ReportType }) {
  return (
    <View style={s.header} fixed>
      <Image style={s.logo} src={logoUrl} />
      <Text style={s.title}>{REPORT_TYPE_META[reportType].title.toUpperCase()}</Text>
      <View style={s.spacer} />
      <Link src="#brief" style={s.overview} hitSlop={HIT}>
        <PdfIcon name="home" size={10} color={BRAND.blue} />
        <Text style={s.overviewText}>Overview</Text>
      </Link>
    </View>
  );
}
