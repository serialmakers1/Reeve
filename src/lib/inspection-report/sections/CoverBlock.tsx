import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from '../styles';
import { formatBhk } from '@/lib/propertyStatus';
import { REPORT_TYPE_META } from '../types';
import { formatINDate, formatINDateTimeIST } from '../formatters';
import { SERVICE_CONTEXT_LABELS, OCCUPANCY_STATUS_LABELS } from '@/types/inspection';
import { BrandMotif, InfoChip, MetricTile } from './PdfPrimitives';
import { ContactBand } from './ContactBand';
import { PdfIcon } from './PdfIcon';
import type { ReportPayload } from '../types';
import logoUrl from '@/assets/logo-print.png';

const HERO_H = 330;

const s = StyleSheet.create({
  page: { flexDirection: 'column', height: '100%' },

  hero: { height: HERO_H, backgroundColor: BRAND.ink, position: 'relative', overflow: 'hidden' },
  motif: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  heroInner: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 44, paddingTop: 40, paddingBottom: 28, justifyContent: 'space-between' },

  logoPlate: { backgroundColor: BRAND.white, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start' },
  logo: { width: 92, height: 26, objectFit: 'contain' },

  eyebrow: { fontSize: 9, letterSpacing: 2, color: BRAND.onDarkMuted, marginTop: 18, fontFamily: 'Helvetica-Bold' },
  title: { fontSize: 34, lineHeight: 1.05, fontFamily: 'Helvetica-Bold', color: BRAND.white, marginTop: 8, maxWidth: '78%', maxLines: 3, textOverflow: 'ellipsis' },
  property: { fontSize: 15, color: '#D7DEEE', marginTop: 10, maxWidth: '72%', maxLines: 2, textOverflow: 'ellipsis' },

  proofRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  proof: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BRAND.cyan, marginLeft: 6 },
  positioning: { fontSize: 8.5, color: BRAND.onDarkMuted, marginTop: 4 },

  lower: { flex: 1, paddingHorizontal: 44, paddingTop: 22 },
  addr: { fontSize: 10, color: BRAND.foreground, marginBottom: 12, maxWidth: '90%', maxLines: 2, textOverflow: 'ellipsis' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  tiles: { flexDirection: 'row' },

  coverContact: { paddingHorizontal: 44 },
  footer: { paddingHorizontal: 44, paddingBottom: 30, paddingTop: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: BRAND.border, paddingTop: 8 },
  metaText: { fontSize: 8, color: BRAND.mutedForeground },
  prepared: { fontSize: 8, color: BRAND.mutedForeground },
});

const noHyphen = (word: string) => [word];

function isBangalore(city: string | null): boolean {
  if (!city) return false;
  const c = city.trim().toLowerCase();
  return c === 'bangalore' || c === 'bengaluru';
}

export function CoverBlock({ payload }: { payload: ReportPayload }) {
  const { reportType, property, inspection, inspectorName, ownerName, generatedAt } = payload;
  const meta = REPORT_TYPE_META[reportType];
  const bangalore = isBangalore(property.city);

  const propertyName = property.building_name || property.locality || 'Property Inspection';
  // Mirror the Brief hierarchy: full_address verbatim when present, else fallback.
  // Never prepend building/flat into the address.
  const addressLine = property.full_address
    || [property.locality, property.city, property.pincode].filter(Boolean).join(', ');

  const serviceLabel = inspection.service_context ? SERVICE_CONTEXT_LABELS[inspection.service_context] : null;
  const occupancyLabel = inspection.occupancy_status ? OCCUPANCY_STATUS_LABELS[inspection.occupancy_status] : null;

  return (
    <View style={s.page}>
      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.motif}>
          <BrandMotif width={555} height={HERO_H} idSuffix="cover" opacity={0.9} />
        </View>
        <View style={s.heroInner}>
          <View>
            <View style={s.logoPlate}><Image style={s.logo} src={logoUrl} /></View>
            <Text style={s.eyebrow}>
              REEVE PROPERTY SERVICES{bangalore ? ' · BANGALORE' : ''}
            </Text>
            <Text style={s.title} hyphenationCallback={noHyphen}>{meta.title}</Text>
            <Text style={s.property}>{propertyName}</Text>
          </View>
          <View>
            <View style={s.proofRow}>
              <PdfIcon name="check" size={12} color={BRAND.cyan} />
              <Text style={s.proof}>Every visit leaves dated proof.</Text>
            </View>
            {bangalore ? (
              <Text style={s.positioning}>Property Services in Bangalore, wherever you are.</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* ── Lower light area ── */}
      <View style={s.lower}>
        {addressLine ? <Text style={s.addr}>{addressLine}</Text> : null}
        <View style={s.pills}>
          {property.flat_number ? <InfoChip label="Unit" value={property.flat_number} /> : null}
          {inspection.inspection_date ? <InfoChip label="Date" value={formatINDate(inspection.inspection_date)} /> : null}
          {serviceLabel ? <InfoChip label="Service" value={serviceLabel} accent={BRAND.cyan} /> : null}
          {occupancyLabel ? <InfoChip label="Occupancy" value={occupancyLabel} accent={BRAND.violet} /> : null}
          {ownerName ? <InfoChip label="Owner" value={ownerName} /> : null}
          {inspectorName ? <InfoChip label="Inspector" value={inspectorName} accent={BRAND.teal} /> : null}
        </View>
        <View style={s.tiles}>
          <MetricTile value={formatBhk(property.bhk) || '—'} label="BHK" />
          <MetricTile value={property.bathrooms != null ? String(property.bathrooms) : '—'} label="Bathrooms" />
          <MetricTile value={String(payload.rooms.length)} label="Rooms in Report" />
          <MetricTile value={String(payload.damages.length)} label="Issues Logged" last />
        </View>
      </View>

      {/* ── Full contact card (reuses the closing ContactBand) ── */}
      <View style={s.coverContact}>
        <ContactBand />
      </View>

      {/* ── Footer meta ── */}
      <View style={s.footer}>
        <View style={s.metaRow}>
          <Text style={s.metaText}>Ref {inspection.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={s.prepared}>Prepared by Reeve</Text>
          <Text style={s.metaText}>Generated {formatINDateTimeIST(generatedAt)}</Text>
        </View>
      </View>
    </View>
  );
}
