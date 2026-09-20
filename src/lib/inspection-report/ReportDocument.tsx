import React from 'react';
import { Document, Page, StyleSheet } from '@react-pdf/renderer';
import { BRAND } from './styles';
import { PageHeader } from './sections/PageHeader';
import { PageFooter } from './sections/PageFooter';
import { CoverBlock } from './sections/CoverBlock';
import { InspectionBrief } from './sections/InspectionBrief';
import { InspectionSummarySection } from './sections/InspectionSummarySection';
import { DamagesSection } from './sections/DamagesSection';
import { UtilitiesSection } from './sections/UtilitiesSection';
import { RoomsSection } from './sections/RoomsSection';
import { AppliancesSection } from './sections/AppliancesSection';
import { NotesSection } from './sections/NotesSection';
import { KeyReturnSection } from './sections/KeyReturnSection';
import { SignatureBlock } from './sections/SignatureBlock';
import { MediaLinkSection } from './sections/MediaLinkSection';
import { DisclaimerSection } from './sections/DisclaimerSection';
import { ContactBand } from './sections/ContactBand';
import { REPORT_TYPE_META } from './types';
import type { ReportPayload } from './types';

const st = StyleSheet.create({
  cover: { backgroundColor: BRAND.ink, padding: 0 },
  brief: { backgroundColor: BRAND.pageBg, padding: 0 },
  // Body top/bottom padding clears the fixed header (46pt) and footer (26pt).
  body: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: BRAND.foreground,
    backgroundColor: BRAND.pageBg,
    paddingTop: 58,
    paddingBottom: 36,
    paddingLeft: 40,
    paddingRight: 40,
  },
});

interface Props {
  payload: ReportPayload;
}

export function ReportDocument({ payload }: Props) {
  const { property, inspection, generatedAt, reportType } = payload;
  const buildingName = property.building_name ?? 'Property';
  const title = `${REPORT_TYPE_META[reportType].title} — ${buildingName}`;

  return (
    <Document
      title={title}
      author="Reeve"
      subject={title}
      creator="Reeve"
      producer="Reeve / @react-pdf/renderer"
      language="en-IN"
      pageMode="useOutlines"
      pageLayout="oneColumn"
    >
      {/* Zone 1 — Cover */}
      <Page size="A4" style={st.cover} id="cover" bookmark="Cover">
        <CoverBlock payload={payload} />
      </Page>

      {/* Zone 2 — Inspection Brief */}
      <Page size="A4" style={st.brief} id="brief" bookmark="Inspection Brief">
        <InspectionBrief payload={payload} />
      </Page>

      {/* Zone 3 — Flowing body (fixed header/footer, auto-paginating) */}
      <Page size="A4" style={st.body} bookmark="Inspection Report">
        <PageHeader reportType={reportType} />
        <PageFooter inspectionId={inspection.id} generatedAt={generatedAt} />

        <InspectionSummarySection summary={payload.inspectionSummary} />
        <DamagesSection damages={payload.damages} />
        <UtilitiesSection utilitiesOverview={payload.utilitiesOverview} />
        <RoomsSection rooms={payload.rooms} />
        <AppliancesSection appliances={payload.appliances} />
        <KeyReturnSection keyReturn={payload.keyReturnSummary} />
        <NotesSection inspection={payload.inspection} />
        <SignatureBlock reportType={reportType} />
        <MediaLinkSection link={payload.mediaDriveLink} />
        <DisclaimerSection />
        <ContactBand />
      </Page>
    </Document>
  );
}
