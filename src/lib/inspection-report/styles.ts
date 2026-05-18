import { Font, StyleSheet } from '@react-pdf/renderer';

export const BRAND = {
  primary:        '#1a6ce8',
  foreground:     '#1c2533',
  mutedForeground:'#63748a',
  border:         '#e2e8f0',
  zebra:          '#f8fafc',
} as const;

let fontsRegistered = false;

// Call once before rendering any PDF. Safe to call multiple times.
// @react-pdf/renderer ships Helvetica built-in (no fetch required).
// We previously tried Inter via CDN — both woff2 and CDN-path issues kept
// breaking generation. Helvetica is universally accepted for legal documents
// and removes all network dependency from PDF rendering.
export function registerFonts(): void {
  // Intentional no-op. Helvetica is the @react-pdf/renderer default and
  // requires no registration. This function is kept as a stable entry point
  // in case we re-introduce custom fonts later.
  return;
}
// Base style sheet shared across all report sections.
// Individual section components in prompt B will create their own StyleSheet
// entries and can spread/extend these.
export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BRAND.foreground,
    paddingTop: 36,
    paddingBottom: 36,
    paddingLeft: 40,
    paddingRight: 40,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: BRAND.foreground,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 700,
    color: BRAND.foreground,
    marginBottom: 6,
  },
  body: {
    fontSize: 10,
    fontWeight: 400,
    color: BRAND.foreground,
  },
  mutedSmall: {
    fontSize: 8,
    color: BRAND.mutedForeground,
  },
  tableHeader: {
    fontSize: 9,
    fontWeight: 700,
    color: BRAND.mutedForeground,
    backgroundColor: BRAND.zebra,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 9,
    fontWeight: 400,
    color: BRAND.foreground,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRowZebra: {
    backgroundColor: BRAND.zebra,
  },
});
