import React from 'react';
import { Document, Page } from '@react-pdf/renderer';
import { styles } from './styles';
import { PageHeader } from './sections/PageHeader';
import { PageFooter } from './sections/PageFooter';
import { CoverBlock } from './sections/CoverBlock';
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
import type { ReportPayload } from './types';

// Extra top/bottom margin inside the page to clear the fixed header (52pt) and footer (28pt).
const BODY_PADDING = { paddingTop: 58, paddingBottom: 38 };

interface Props {
  payload: ReportPayload;
}

export function ReportDocument({ payload }: Props) {
  const { property, inspection, generatedAt, reportType } = payload;
  const buildingName = property.building_name ?? 'Inspection';

  return (
    <Document
      title={`${reportType} — ${buildingName}`}
      author="Reeve Property Management"
      subject={`Inspection Report: ${buildingName}`}
      creator="Reeve"
      producer="Reeve / @react-pdf/renderer"
    >
      <Page size="A4" style={[styles.page, BODY_PADDING]}>
        <PageHeader reportType={reportType} />
        <PageFooter
          inspectionId={inspection.id}
          buildingName={property.building_name}
          generatedAt={generatedAt}
        />

        <CoverBlock payload={payload} />
        <InspectionSummarySection summary={payload.inspectionSummary} />
        <DamagesSection damages={payload.damages} />
        <UtilitiesSection utilitiesOverview={payload.utilitiesOverview} />
        <RoomsSection rooms={payload.rooms} />
        <AppliancesSection appliances={payload.appliances} />
        <NotesSection inspection={payload.inspection} />
        <KeyReturnSection keyReturn={payload.keyReturnSummary} />
        <SignatureBlock reportType={reportType} />
        <MediaLinkSection link={payload.mediaDriveLink} />
        <DisclaimerSection />
      </Page>
    </Document>
  );
}
