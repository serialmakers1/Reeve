import React from 'react';
import { View, Text, Link, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { REPORT_TYPE_META, UTILITY_KEYS } from '../types';
import { formatBhk } from '@/lib/propertyStatus';
import { formatINDate } from '../formatters';
import { SERVICE_CONTEXT_LABELS, OCCUPANCY_STATUS_LABELS } from '@/types/inspection';
import { BrandMotif, PremiumCard, MetricTile, StatusChip } from './PdfPrimitives';
import { PdfIcon } from './PdfIcon';
import {
  severityCounts, priorityItems, normalizeSeverity, nextAction,
  SEVERITY_LABEL, SEVERITY_TONE,
} from './issueDisplay';
import type { ReportPayload } from '../types';

const STRIP_H = 92;

const s = StyleSheet.create({
  page: { paddingHorizontal: 40, paddingTop: 0, paddingBottom: 40 },

  strip: { height: STRIP_H, backgroundColor: BRAND.indigo, borderRadius: 0, position: 'relative', overflow: 'hidden', marginHorizontal: -40, marginBottom: 16 },
  stripMotif: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  stripInner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 40, justifyContent: 'center' },
  stripTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: BRAND.white },
  stripSub: { fontSize: 9, color: '#C7D0E6', marginTop: 3, maxWidth: '80%' },
  stripMeta: { fontSize: 8, color: BRAND.onDarkMuted, marginTop: 5 },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  addrCell: { width: '100%', marginBottom: 8 },
  cell: { width: '50%', marginBottom: 8, paddingRight: 8 },
  label: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BRAND.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 },
  value: { fontSize: 10, color: BRAND.foreground },

  sectionGap: { marginTop: 16 },
  h: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BRAND.foreground, marginBottom: 8 },

  tiles: { flexDirection: 'row', marginBottom: 10 },

  prow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: BRAND.borderSoft },
  pbar: { width: 3, height: 22, borderRadius: 2, marginRight: 8 },
  ploc: { flex: 1 },
  // Brief-only previews are line-clamped so the page stays bounded; the full,
  // untruncated issue (location + notes + action) appears in the detailed Issues section.
  plocText: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: BRAND.foreground, maxLines: 1, textOverflow: 'ellipsis' },
  ptype: { fontSize: 8, color: BRAND.mutedForeground, maxLines: 1, textOverflow: 'ellipsis' },
  paction: { fontSize: 8.5, color: BRAND.foreground, marginLeft: 8, maxWidth: 130, textAlign: 'right', maxLines: 2, textOverflow: 'ellipsis' },

  neutral: { flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND.goodBg, borderRadius: 8, padding: 12 },
  neutralText: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND.goodText, marginLeft: 8 },

  evi: { flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: BRAND.indigoTint, borderWidth: 1, borderColor: BRAND.borderSoft, borderRadius: 8, padding: 12 },
  eviBody: { flex: 1, marginLeft: 10 },
  eviTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND.foreground },
  eviSub: { fontSize: 8, color: BRAND.mutedForeground, marginTop: 1 },
  eviLink: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: BRAND.blue, textDecoration: 'none' },

  contents: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, borderTopWidth: 1, borderTopColor: BRAND.border, paddingTop: 10, alignItems: 'center' },
  contentsLabel: { fontSize: 8, color: BRAND.mutedForeground, marginRight: 6 },
  chipLink: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: BRAND.blue, textDecoration: 'none', marginRight: 10, marginBottom: 4 },
});

const HIT = { top: 6, bottom: 6, left: 6, right: 6 };

function hasSummary(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const o = raw as Record<string, unknown>;
  return !!(o.overall_condition || o.cleaning_required || o.repainting_required || o.urgent_items || o.recommended_items);
}
function hasUtilities(u: ReportPayload['utilitiesOverview']): boolean {
  return UTILITY_KEYS.some((k) => {
    const v = u[k];
    return v !== null && v !== undefined && v !== '';
  });
}
function hasKeys(raw: unknown): boolean {
  return Array.isArray(raw) && raw.some((e) => e && typeof e === 'object' && (e as { requires_input?: boolean }).requires_input);
}

export function InspectionBrief({ payload }: { payload: ReportPayload }) {
  const { property, inspection, ownerName, inspectorName, damages } = payload;
  const meta = REPORT_TYPE_META[payload.reportType];

  // Show building name and full address as distinct rows. Use full_address
  // verbatim when present; only construct locality/city/pincode when it is absent
  // (never prepend the building name to an address that may already contain it).
  const addressValue = property.full_address
    || [property.locality, property.city, property.pincode].filter(Boolean).join(', ');

  const details: Array<{ label: string; value: string }> = [];
  if (property.flat_number) details.push({ label: 'Unit / Flat', value: property.flat_number });
  if (property.floor) details.push({ label: 'Floor', value: property.floor });
  if (formatBhk(property.bhk)) details.push({ label: 'BHK', value: formatBhk(property.bhk) });
  if (property.bathrooms != null) details.push({ label: 'Bathrooms', value: String(property.bathrooms) });
  if (property.balconies != null) details.push({ label: 'Balconies', value: String(property.balconies) });
  if (ownerName) details.push({ label: 'Owner', value: ownerName });
  if (inspection.inspection_date) details.push({ label: 'Inspection Date', value: formatINDate(inspection.inspection_date) });
  if (inspection.service_context) details.push({ label: 'Service', value: SERVICE_CONTEXT_LABELS[inspection.service_context] });
  if (inspection.occupancy_status) details.push({ label: 'Occupancy', value: OCCUPANCY_STATUS_LABELS[inspection.occupancy_status] });
  if (inspectorName) details.push({ label: 'Inspector', value: inspectorName });
  details.push({ label: 'Inspection Ref', value: inspection.id.slice(0, 8).toUpperCase() });

  const counts = severityCounts(damages);
  const priorities = priorityItems(damages, 3);
  const hasIssues = damages.length > 0;

  // Contents links — only sections that exist.
  const contents: Array<{ label: string; id: string }> = [];
  if (hasSummary(payload.inspectionSummary)) contents.push({ label: 'Snapshot', id: 'sec-snapshot' });
  if (hasIssues) contents.push({ label: 'Issues', id: 'sec-issues' });
  if (hasUtilities(payload.utilitiesOverview)) contents.push({ label: 'Utilities', id: 'sec-utilities' });
  if (payload.rooms.length > 0) contents.push({ label: 'Rooms', id: 'sec-rooms' });
  if (payload.appliances.length > 0) contents.push({ label: 'Appliances', id: 'sec-appliances' });
  if (hasKeys(payload.keyReturnSummary)) contents.push({ label: 'Keys', id: 'sec-keys' });
  if (inspection.general_observations || inspection.inspector_notes) contents.push({ label: 'Notes', id: 'sec-notes' });
  // Match the body order: Sign-off → Evidence → Disclaimer.
  contents.push({ label: 'Sign-off', id: 'sec-signoff' });
  if (payload.mediaDriveLink) contents.push({ label: 'Evidence', id: 'sec-evidence' });

  return (
    <View style={s.page}>
      {/* ── Hero strip ── */}
      <View style={s.strip}>
        <View style={s.stripMotif}>
          <BrandMotif width={595} height={STRIP_H} idSuffix="brief" opacity={0.85} />
        </View>
        <View style={s.stripInner}>
          <Text style={s.stripTitle}>Inspection Brief</Text>
          <Text style={s.stripSub}>{meta.description}</Text>
          <Text style={s.stripMeta}>
            {formatINDate(inspection.inspection_date)} · Ref {inspection.id.slice(0, 8).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* ── Full property & inspection details ── */}
      <PremiumCard>
        <View style={s.detailGrid}>
          {property.building_name ? (
            <View style={s.addrCell}>
              <Text style={s.label}>Property / Building</Text>
              <Text style={s.value}>{property.building_name}</Text>
            </View>
          ) : null}
          {addressValue ? (
            <View style={s.addrCell}>
              <Text style={s.label}>Address</Text>
              <Text style={s.value}>{addressValue}</Text>
            </View>
          ) : null}
          {details.map((d) => (
            <View key={d.label} style={s.cell}>
              <Text style={s.label}>{d.label}</Text>
              <Text style={s.value}>{d.value}</Text>
            </View>
          ))}
        </View>
      </PremiumCard>

      {/* ── Issue status ── */}
      <View style={s.sectionGap}>
        <Text style={s.h}>Issue Status</Text>
        {hasIssues ? (
          <>
            <View style={s.tiles}>
              <MetricTile value={String(counts.cosmetic)} label="Cosmetic / Minor" />
              <MetricTile value={String(counts.repair_before_relet)} label="Attention Needed" />
              <MetricTile value={String(counts.urgent_immediate)} label="Urgent" last />
            </View>
            {priorities.map((d, i) => {
              const key = normalizeSeverity(d.severity);
              const tone = key ? SEVERITY_TONE[key] : { text: BRAND.mutedForeground, bg: BRAND.coolGray };
              const action = nextAction(d);
              return (
                <View key={d.localId ?? i} style={s.prow} wrap={false}>
                  <View style={[s.pbar, { backgroundColor: tone.text }]} />
                  <View style={s.ploc}>
                    <Text style={s.plocText}>{d.location || d.damage_type || 'Recorded item'}</Text>
                    <Text style={s.ptype}>{d.damage_type || '—'}</Text>
                  </View>
                  {key ? <StatusChip text={SEVERITY_LABEL[key]} tone={tone} /> : null}
                  {action ? <Text style={s.paction}>{action}</Text> : null}
                </View>
              );
            })}
          </>
        ) : (
          <View style={s.neutral}>
            <PdfIcon name="check" size={14} color={BRAND.goodText} />
            <Text style={s.neutralText}>No issues requiring attention were recorded.</Text>
          </View>
        )}
      </View>

      {/* ── Evidence CTA (internal jump only — the single external Drive link
             lives in the final Evidence section, preserving the one-link rule) ── */}
      {payload.mediaDriveLink ? (
        <View style={s.evi} wrap={false}>
          <PdfIcon name="folder" size={18} color={BRAND.blue} />
          <View style={s.eviBody}>
            <Text style={s.eviTitle}>Dated Photo & Evidence Folder</Text>
            <Text style={s.eviSub}>Inspection photographs and evidence are provided separately.</Text>
          </View>
          <Link src="#sec-evidence" style={s.eviLink} hitSlop={HIT}>View Evidence Section</Link>
        </View>
      ) : null}

      {/* ── Contents ── */}
      <View style={s.contents}>
        <Text style={s.contentsLabel}>Contents:</Text>
        {contents.map((c) => (
          <Link key={c.id} src={`#${c.id}`} style={s.chipLink} hitSlop={HIT}>{c.label}</Link>
        ))}
      </View>
    </View>
  );
}
