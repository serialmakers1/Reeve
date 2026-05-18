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
export function registerFonts(): void {
  if (fontsRegistered) return;
  const base = 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.1.1/files';
  Font.register({
    family: 'Inter',
    fonts: [
      { src: `${base}/inter-latin-400-normal.ttf`, fontWeight: 400 },
      { src: `${base}/inter-latin-500-normal.ttf`, fontWeight: 500 },
      { src: `${base}/inter-latin-700-normal.ttf`, fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

// Base style sheet shared across all report sections.
// Individual section components in prompt B will create their own StyleSheet
// entries and can spread/extend these.
export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
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
