import React from 'react';
import { View, Text, Svg, Path, Rect, Line, Defs, LinearGradient, Stop, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { PdfIcon } from './PdfIcon';
import type { IconName } from './PdfIcon';

// react-pdf's shipped d.ts types `bookmark` only on <Page>, but the renderer
// supports it on any node at runtime (document outline). This narrow, typed
// wrapper adds the prop back for the heading wrapper without using `any`.
type RPStyle = React.ComponentProps<typeof View>['style'];
const BookmarkView = View as React.ComponentType<
  React.ComponentProps<typeof View> & { bookmark?: string }
>;

/**
 * Small reusable PDF-only primitives for the premium editorial report.
 * Not a generic framework — just the shared building blocks.
 */

const s = StyleSheet.create({
  headingWrap: { marginTop: 6, marginBottom: 8 },
  headingRow: { flexDirection: 'row', alignItems: 'center' },
  halo: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  title: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: BRAND.foreground },
  tab: { height: 3, width: 34, borderRadius: 2, marginTop: 5, marginLeft: 30 },
  descriptor: { fontSize: 8.5, color: BRAND.mutedForeground, marginTop: 3, marginLeft: 30 },

  card: {
    backgroundColor: BRAND.white,
    borderWidth: 1,
    borderColor: BRAND.borderSoft,
    borderRadius: 8,
    padding: 12,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, paddingVertical: 3, paddingHorizontal: 8,
    marginRight: 6, marginBottom: 6,
  },
  chipLabel: { fontSize: 8, color: BRAND.mutedForeground },
  chipValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BRAND.foreground },

  tile: {
    flex: 1, backgroundColor: BRAND.white, borderWidth: 1, borderColor: BRAND.borderSoft,
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 10, marginRight: 8,
  },
  tileValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: BRAND.foreground },
  tileLabel: { fontSize: 7.5, color: BRAND.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 },

  statusChip: { alignSelf: 'flex-start', borderRadius: 4, paddingVertical: 2, paddingHorizontal: 6 },
  statusText: { fontSize: 8, fontFamily: 'Helvetica-Bold' },
});

// ── SectionHeading ────────────────────────────────────────────────────────────
export function SectionHeading({
  icon, title, descriptor, accent = BRAND.blue, id, bookmark,
}: {
  icon: IconName;
  title: string;
  descriptor?: string;
  accent?: string;
  id?: string;
  bookmark?: string;
}) {
  return (
    <BookmarkView style={s.headingWrap} id={id} bookmark={bookmark} minPresenceAhead={90}>
      <View style={s.headingRow}>
        <View style={[s.halo, { backgroundColor: tint(accent) }]}>
          <PdfIcon name={icon} size={13} color={accent} />
        </View>
        <Text style={s.title}>{title}</Text>
      </View>
      <View style={[s.tab, { backgroundColor: accent }]} />
      {descriptor ? <Text style={s.descriptor}>{descriptor}</Text> : null}
    </BookmarkView>
  );
}

// ── PremiumCard ───────────────────────────────────────────────────────────────
export function PremiumCard({ children, style }: { children: React.ReactNode; style?: RPStyle }) {
  return <View style={[s.card, ...(Array.isArray(style) ? style : style ? [style] : [])]}>{children}</View>;
}

// ── InfoChip (label + value pill) ─────────────────────────────────────────────
export function InfoChip({ label, value, accent = BRAND.blue }: { label?: string; value: string; accent?: string }) {
  return (
    <View style={[s.chip, { backgroundColor: tint(accent), borderWidth: 1, borderColor: hairline(accent) }]}>
      {label ? <Text style={s.chipLabel}>{label}: </Text> : null}
      <Text style={s.chipValue}>{value}</Text>
    </View>
  );
}

// ── MetricTile ────────────────────────────────────────────────────────────────
export function MetricTile({ value, label, last }: { value: string; label: string; last?: boolean }) {
  return (
    <View style={[s.tile, last ? { marginRight: 0 } : {}]}>
      <Text style={s.tileValue}>{value}</Text>
      <Text style={s.tileLabel}>{label}</Text>
    </View>
  );
}

// ── StatusChip (severity — always explicit text) ──────────────────────────────
export function StatusChip({ text, tone }: { text: string; tone: { text: string; bg: string } }) {
  return (
    <View style={[s.statusChip, { backgroundColor: tone.bg }]}>
      <Text style={[s.statusText, { color: tone.text }]}>{text}</Text>
    </View>
  );
}

// ── BrandMotif (architectural / floor-plan SVG + gradient) ────────────────────
export function BrandMotif({
  width, height, idSuffix = 'a', opacity = 1,
}: {
  width: number;
  height: number;
  idSuffix?: string;
  opacity?: number;
}) {
  const gid = `reeveGrad_${idSuffix}`;
  const stroke = '#3B5AA8';
  const faint = '#22346B';
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ opacity }}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2={String(width)} y2={String(height)}>
          <Stop offset="0" stopColor={BRAND.indigo} />
          <Stop offset="0.45" stopColor={BRAND.blue} />
          <Stop offset="0.75" stopColor={BRAND.violet} />
          <Stop offset="1" stopColor={BRAND.cyan} />
        </LinearGradient>
      </Defs>
      {/* gradient wash */}
      <Rect x="0" y="0" width={width} height={height} fill={`url(#${gid})`} />
      {/* blueprint grid fragments */}
      {gridLines(width, height, faint)}
      {/* room-outline rectangles */}
      <Rect x={width * 0.55} y={height * 0.18} width={width * 0.3} height={height * 0.34} fill="none" stroke={stroke} strokeWidth={1.2} />
      <Rect x={width * 0.55} y={height * 0.52} width={width * 0.18} height={height * 0.26} fill="none" stroke={stroke} strokeWidth={1.2} />
      <Rect x={width * 0.73} y={height * 0.52} width={width * 0.12} height={height * 0.26} fill="none" stroke={stroke} strokeWidth={1.2} />
      {/* door-swing arc + measurement ticks */}
      <Path d={`M${width * 0.55} ${height * 0.52} a${width * 0.08} ${width * 0.08} 0 0 1 ${width * 0.08} ${-width * 0.08}`} fill="none" stroke={BRAND.cyan} strokeWidth={1} />
      <Line x1={width * 0.55} y1={height * 0.12} x2={width * 0.85} y2={height * 0.12} stroke={stroke} strokeWidth={0.8} />
      <Line x1={width * 0.55} y1={height * 0.1} x2={width * 0.55} y2={height * 0.14} stroke={stroke} strokeWidth={0.8} />
      <Line x1={width * 0.85} y1={height * 0.1} x2={width * 0.85} y2={height * 0.14} stroke={stroke} strokeWidth={0.8} />
    </Svg>
  );
}

function gridLines(w: number, h: number, color: string) {
  const els: React.ReactNode[] = [];
  const step = Math.max(24, Math.round(w / 14));
  for (let x = step; x < w; x += step) {
    els.push(<Line key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke={color} strokeWidth={0.4} />);
  }
  for (let y = step; y < h; y += step) {
    els.push(<Line key={`h${y}`} x1={0} y1={y} x2={w} y2={y} stroke={color} strokeWidth={0.4} />);
  }
  return els;
}

// ── color helpers (pale tint + hairline from an accent hex) ───────────────────
function tint(hex: string): string {
  return withAlpha(hex, 0.12);
}
function hairline(hex: string): string {
  return withAlpha(hex, 0.28);
}
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Blend toward white to emulate a pale tint (react-pdf handles rgba, but
  // opaque blended values are safest across viewers).
  const mix = (c: number) => Math.round(c * alpha + 255 * (1 - alpha));
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}
