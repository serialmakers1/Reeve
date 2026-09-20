import { StyleSheet } from '@react-pdf/renderer';

/**
 * Centralized PDF-only design tokens for the premium Reeve editorial inspection
 * report. Every section imports from BRAND — no raw hex scattered in components.
 *
 * Palette identity: deep navy/indigo + electric blue + violet + cyan.
 * Severity families (emerald/amber/red) are reserved EXCLUSIVELY for
 * condition/severity meaning — never decoration.
 */
export const BRAND = {
  // ── Legacy keys (kept so existing references never break) ──
  primary:        '#2563EB',
  foreground:     '#1c2533',
  mutedForeground:'#63748a',
  border:         '#e2e8f0',
  zebra:          '#f8fafc',

  // ── Core (dark hero / ink) ──
  ink:            '#0B1020',
  indigo:         '#1E1B4B',
  navy:           '#0B1020',

  // ── Accents (brand identity) ──
  blue:           '#2563EB',
  violet:         '#7C3AED',
  cyan:           '#06B6D4',
  teal:           '#0D9488',

  // ── Severity families (semantic only) ──
  goodText:       '#059669',
  goodBg:         '#ecfdf5',
  attentionText:  '#B45309',
  attentionBg:    '#fffbeb',
  urgentText:     '#DC2626',
  urgentBg:       '#fef2f2',

  // ── Surfaces ──
  white:          '#ffffff',
  pageBg:         '#F5F7FB',
  coolGray:       '#F8FAFC',
  indigoTint:     '#F5F5FF',
  borderSoft:     '#EEF2F7',

  // ── On-dark text ──
  onDark:         '#ffffff',
  onDarkMuted:    '#AEB7C9',
} as const;

// Shared spacing/size scale (points).
export const SP = { xs: 4, sm: 6, md: 10, lg: 16, xl: 24, xxl: 36 } as const;

const fontsRegistered = false;

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
export const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BRAND.foreground,
    backgroundColor: BRAND.pageBg,
    paddingTop: 36,
    paddingBottom: 36,
    paddingLeft: 40,
    paddingRight: 40,
  },
  coverTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.foreground,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.foreground,
    marginBottom: 6,
  },
  body: {
    fontSize: 10,
    color: BRAND.foreground,
  },
  mutedSmall: {
    fontSize: 8,
    color: BRAND.mutedForeground,
  },
  tableHeader: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: BRAND.mutedForeground,
    backgroundColor: BRAND.zebra,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableCell: {
    fontSize: 9,
    color: BRAND.foreground,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRowZebra: {
    backgroundColor: BRAND.zebra,
  },
});

void fontsRegistered;
