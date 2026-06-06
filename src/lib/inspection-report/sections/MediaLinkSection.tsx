import React from 'react';
import { View, Text, Link, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';

const s = StyleSheet.create({
  section: { marginTop: 16 },
  description: {
    fontSize: 9,
    color: BRAND.mutedForeground,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  linkText: {
    fontSize: 9,
    color: BRAND.primary,
    textDecoration: 'underline',
  },
});

interface Props {
  link?: string | null;
}

export function MediaLinkSection({ link }: Props) {
  if (!link) return null;

  return (
    <View style={s.section} wrap={false}>
      <Text style={styles.sectionHeader}>Photo & Video Walkthrough</Text>
      <Text style={s.description}>
        The following Google Drive folder contains photos and video walkthrough taken during this inspection.
      </Text>
      <Link src={link}>
        <Text style={s.linkText}>{link}</Text>
      </Link>
    </View>
  );
}
