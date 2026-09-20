import type { InspectionRecord, LocalRoom, LocalAppliance, DamageItem } from '@/types/inspection';
import type { ReportPayload, ReportType, UtilityKey } from './types';

/**
 * Builds the sanitized report payload for PDF generation.
 *
 * This is the SINGLE privacy choke-point for inspection reports. It explicitly
 * allow-lists the fields the PDF may contain and never copies admin-only contact
 * data into the payload:
 *   - owner_phone / owner_alternate_phone / owner_email  → excluded
 *   - every tenant_* field (including tenant_name)       → excluded
 * The owner's *name* is included because existing report sections render it.
 *
 * Keeping the allow-list here (rather than hiding fields in JSX) guarantees the
 * private data never reaches the rendered document or its serialized props.
 */
export function buildReportPayload(input: {
  inspection: InspectionRecord;
  rooms: LocalRoom[];
  appliances: LocalAppliance[];
  damages: DamageItem[];
  utilitiesOverview: Partial<Record<UtilityKey, unknown>>;
  reportType: ReportType;
  inspectorName: string;
  generatedAt: Date;
}): ReportPayload {
  const { inspection } = input;

  return {
    reportType: input.reportType,
    inspectorName: input.inspectorName,
    property: {
      building_name: inspection.building_name ?? null,
      flat_number: inspection.flat_number ?? null,
      full_address: inspection.full_address ?? null,
      locality: inspection.locality ?? null,
      city: inspection.city ?? null,
      pincode: inspection.pincode ?? null,
      floor: inspection.floor ?? null,
      bhk: inspection.bhk ?? null,
      bathrooms: inspection.bathrooms ?? null,
      balconies: inspection.balconies ?? null,
    },
    inspection: {
      id: inspection.id,
      inspection_date: inspection.inspection_date ?? null,
      service_context: inspection.service_context ?? null,
      occupancy_status: inspection.occupancy_status ?? null,
      general_observations: inspection.general_observations ?? null,
      inspector_notes: inspection.inspector_notes ?? null,
    },
    ownerName: inspection.owner_name ?? '',
    rooms: input.rooms,
    appliances: input.appliances,
    damages: input.damages,
    utilitiesOverview: input.utilitiesOverview,
    generatedAt: input.generatedAt,
    mediaDriveLink: inspection.media_drive_link ?? null,
    inspectionSummary: inspection.inspection_summary,
    keyReturnSummary: inspection.key_return_summary,
  };
}
