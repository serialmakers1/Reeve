import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { BRAND, styles } from '../styles';

const s = StyleSheet.create({
  section: { marginTop: 16 },
  intro: {
    fontSize: 9,
    color: BRAND.mutedForeground,
    lineHeight: 1.4,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 9,
    color: BRAND.mutedForeground,
    width: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 9,
    color: BRAND.mutedForeground,
    lineHeight: 1.4,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: BRAND.mutedForeground,
  },
  closing: {
    fontSize: 9,
    color: BRAND.mutedForeground,
    lineHeight: 1.4,
    marginTop: 8,
  },
});

const EXCLUSIONS = [
  {
    label: 'Structural Stability Certificate',
    text: ' — No assessment of foundational integrity, load-bearing capacity, or structural soundness has been conducted.',
  },
  {
    label: 'Electrical Safety Certification',
    text: ' — No testing of wiring, panels, earthing, load capacity, or compliance with electrical codes has been performed.',
  },
  {
    label: 'Plumbing / Hydraulic Pressure Test',
    text: ' — No pressure testing, leak detection, or drainage flow assessment has been carried out.',
  },
  {
    label: 'Pest & Termite Inspection Certificate',
    text: ' — No examination for the presence of termites, rodents, wood borers, or other infestations has been undertaken.',
  },
  {
    label: 'Fire Safety / NOC',
    text: ' — This report does not certify compliance with fire safety norms or constitute a No Objection Certificate from any fire authority.',
  },
  {
    label: 'Waterproofing Assessment',
    text: ' — No assessment of waterproofing membranes, seepage potential, or damp-proofing has been made.',
  },
  {
    label: 'Legal / Title Due Diligence',
    text: ' — This report does not address ownership, encumbrances, encroachments, or any legal status of the property.',
  },
  {
    label: 'Valuation Report',
    text: ' — No market value, rental value, or investment assessment has been conducted.',
  },
];

export function DisclaimerSection() {
  return (
    <View style={s.section}>
      <Text style={styles.sectionHeader}>Disclaimer</Text>
      <Text style={s.intro}>
        This inspection report is prepared solely for the purpose of documenting the visible physical
        condition of the property at the time of inspection and for facilitating communication between
        Reeve and its clients. It is not, and shall not be construed as, any of the following:
      </Text>
      {EXCLUSIONS.map((item) => (
        <View key={item.label} style={s.row} wrap={false}>
          <Text style={s.bullet}>•</Text>
          <Text style={s.itemText}>
            <Text style={s.bold}>{item.label}</Text>
            <Text>{item.text}</Text>
          </Text>
        </View>
      ))}
      <Text style={s.closing}>
        Observations in this report are limited to visually accessible areas and conditions apparent
        at the time of the inspection visit. Concealed defects, latent damage, or conditions not
        visible during a standard walkthrough are not covered. Reeve records visible observations during
        the inspection and does not certify the underlying structural, electrical, plumbing, pest, fire,
        waterproofing, or legal condition of the property. Reeve recommends engaging qualified specialists
        for any of the above certifications before relying on this report for such matters.
      </Text>
    </View>
  );
}
