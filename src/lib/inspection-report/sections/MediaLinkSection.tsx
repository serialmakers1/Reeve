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
      <Text style={styles.sectionHeader}>Dated Photo & Evidence Folder</Text>
      <Text style={s.description}>
        Inspection photographs and evidence are provided separately in the linked folder.
      </Text>
      <Link src={link}>
        <Text style={s.linkText}>{link}</Text>
      </Link>
    </View>
  );
}
