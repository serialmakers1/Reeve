import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { REPORT_TYPE_META } from '../types';
import type { ReportType } from '../types';
// @ts-ignore — Vite resolves this to a base64 data URI at build time
import logoUrl from '@/assets/logo-print.png';

const s = StyleSheet.create({
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 90,
    height: 25,
    objectFit: 'contain',
  },
  spacer: { flex: 1 },
  pill: {
    backgroundColor: BRAND.primary,
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  pillText: {
    fontSize: 8,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
});

interface Props {
  reportType: ReportType;
}

export function PageHeader({ reportType }: Props) {
  return (
    <View style={s.header} fixed>
      <Image style={s.logo} src={logoUrl} />
      <View style={s.spacer} />
      <View style={s.pill}>
        <Text style={s.pillText}>{REPORT_TYPE_META[reportType].title.toUpperCase()}</Text>
      </View>
    </View>
  );
}
