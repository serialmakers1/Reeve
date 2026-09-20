import { describe, it, expect } from 'vitest';
import { buildReportPayload } from '../buildReportPayload';
import type { InspectionRecord } from '@/types/inspection';

/**
 * The report payload is the single privacy choke-point for inspection PDFs.
 * These tests guarantee that owner contact details and ALL tenant fields can
 * never reach the rendered document, while safe property/report data is kept.
 */

const OWNER_PHONE = '9999900001';
const OWNER_ALT_PHONE = '9999900002';
const OWNER_EMAIL = 'owner-secret@example.com';
const TENANT_NAME = 'Secret Tenant';
const TENANT_PHONE = '8888800001';
const TENANT_ALT_PHONE = '8888800002';
const TENANT_EMAIL = 'tenant-secret@example.com';

const PRIVATE_VALUES = [
  OWNER_PHONE,
  OWNER_ALT_PHONE,
  OWNER_EMAIL,
  TENANT_NAME,
  TENANT_PHONE,
  TENANT_ALT_PHONE,
  TENANT_EMAIL,
];

function makeInspection(): InspectionRecord {
  return {
    id: '11111111-2222-3333-4444-555555555555',
    inspector_user_id: 'inspector-1',
    inspection_date: '2026-09-19',
    inspection_type: 'PBR',
    service_context: 'reeve_managed',
    occupancy_status: 'occupied',
    building_name: 'Prestige Towers',
    flat_number: 'B-1204',
    full_address: '12 MG Road, Bengaluru',
    locality: 'Indiranagar',
    city: 'Bengaluru',
    pincode: '560038',
    floor: 'Ground',
    bhk: '2BHK',
    bathrooms: 2,
    balconies: 1,
    google_maps_url: 'https://maps.google.com/?q=test',
    owner_name: 'Asha Rao',
    owner_phone: OWNER_PHONE,
    owner_alternate_phone: OWNER_ALT_PHONE,
    owner_email: OWNER_EMAIL,
    tenant_name: TENANT_NAME,
    tenant_phone: TENANT_PHONE,
    tenant_alternate_phone: TENANT_ALT_PHONE,
    tenant_email: TENANT_EMAIL,
    general_observations: 'Overall good condition.',
    pre_existing_damages: [],
    inspector_notes: 'Verified meter readings.',
    media_drive_link: 'https://drive.google.com/folder',
    utilities_overview: {},
    structural_observations: {},
    inspection_summary: { overall_condition: 'good' },
    key_return_summary: [],
  };
}

function build() {
  return buildReportPayload({
    inspection: makeInspection(),
    rooms: [],
    appliances: [],
    damages: [],
    utilitiesOverview: {},
    reportType: 'PBR',
    inspectorName: 'Field Inspector',
    generatedAt: new Date('2026-09-19T10:00:00Z'),
  });
}

describe('buildReportPayload', () => {
  it('includes safe property, owner name, and inspection notes', () => {
    const payload = build();
    expect(payload.property.building_name).toBe('Prestige Towers');
    expect(payload.property.flat_number).toBe('B-1204');
    expect(payload.property.bhk).toBe('2BHK');
    expect(payload.ownerName).toBe('Asha Rao');
    expect(payload.inspection.inspection_date).toBe('2026-09-19');
    expect(payload.inspection.general_observations).toBe('Overall good condition.');
    expect(payload.inspection.inspector_notes).toBe('Verified meter readings.');
    expect(payload.mediaDriveLink).toBe('https://drive.google.com/folder');
  });

  it('includes service_context and occupancy_status in the sanitized inspection meta', () => {
    const payload = build();
    expect(payload.inspection.service_context).toBe('reeve_managed');
    expect(payload.inspection.occupancy_status).toBe('occupied');
  });

  it('excludes every owner contact and all tenant fields from the payload', () => {
    const payload = build();

    // Structural: the inspection meta must not carry contact/tenant keys.
    expect(payload.inspection).not.toHaveProperty('owner_phone');
    expect(payload.inspection).not.toHaveProperty('owner_email');
    expect(payload.inspection).not.toHaveProperty('tenant_name');
    expect(payload.inspection).not.toHaveProperty('tenant_phone');
    expect(payload.property).not.toHaveProperty('owner_phone');
    expect(payload.property).not.toHaveProperty('tenant_name');

    // Deep: no private value appears anywhere in the serialized payload.
    const serialized = JSON.stringify(payload);
    for (const value of PRIVATE_VALUES) {
      expect(serialized).not.toContain(value);
    }
  });
});
