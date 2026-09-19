import type {
  LocalRoom,
  LocalAppliance,
  DamageItem,
} from '@/types/inspection';

// ── Report types ─────────────────────────────────────────────────────────────

export type ReportType = 'PBR' | 'MIR' | 'BIR' | 'MOCR';

/** The single ordered list of report/inspection types. Shared by the form and export dialog. */
export const REPORT_TYPES: ReportType[] = ['PBR', 'MIR', 'BIR', 'MOCR'];

/**
 * Report-safe manual property details. Only factual property information — never
 * owner contact details and never any tenant data.
 */
export interface ReportProperty {
  building_name: string | null;
  flat_number: string | null;
  full_address: string | null;
  locality: string | null;
  city: string | null;
  pincode: string | null;
  floor: string | null;
  bhk: string | null;
  bathrooms: number | null;
  balconies: number | null;
}

/**
 * Report-safe inspection metadata. Deliberately excludes owner contacts, all
 * tenant fields, and the removed status/scheduling/mode columns.
 */
export interface ReportInspectionMeta {
  id: string;
  inspection_date: string | null;
  general_observations: string | null;
  inspector_notes: string | null;
}

export type SignatureRole = 'owner' | 'tenant' | 'inspector';

export const REPORT_TYPE_META: Record<
  ReportType,
  { title: string; description: string; signatureRoles: SignatureRole[] }
> = {
  PBR: {
    title: 'Property Baseline Report',
    description:
      "Inspector's baseline record of property condition before any tenancy. Owner signs off.",
    signatureRoles: ['owner', 'inspector'],
  },
  MIR: {
    title: 'Move-In Report',
    description:
      'Possession-day record derived from PBR. Tenant signs to start the 5-day amendment window.',
    signatureRoles: ['owner', 'tenant', 'inspector'],
  },
  BIR: {
    title: 'Bi-Annual Inspection Report',
    description:
      'Mid-tenancy monitoring inspection. Tenant acknowledges but does not sign as binding.',
    signatureRoles: ['tenant', 'inspector'],
  },
  MOCR: {
    title: 'Move-Out Condition Report',
    description: 'Exit inspection against MIR baseline. Tenant signs on move-out day.',
    signatureRoles: ['owner', 'tenant', 'inspector'],
  },
};

// ── Utility keys ─────────────────────────────────────────────────────────────
// Exhaustively derived from every updateUtility("...", ) call site in
// src/pages/admin/InspectionForm.tsx. Adding a new form field requires adding
// the key here AND in UTILITY_LABELS in utilitiesLabels.ts.

export const UTILITY_KEYS = [
  // Door & Keys
  'door_child_lock',
  'door_condition',
  'door_inner_type',
  'door_intercom',
  'door_intercom_brand',
  'door_intercom_creds_documented',
  'door_is_double',
  'door_keys_count',
  'door_lock_brand',
  'door_lock_type',
  'door_notes',
  'door_outer_type',
  'door_peephole',
  'door_type',
  // Water
  'water_consumer_id',
  'water_meter',
  'water_overhead_tank',
  'water_source',
  'water_sump',
  'water_supply',
  'water_timing',
  // Gas
  'gas_consumer_id',
  'gas_location',
  'gas_type',
  // Electricity
  'electricity_backup',
  'electricity_circuits',
  'electricity_consumer_id',
  'electricity_inverter',
  'electricity_mcb_location',
  // Safety & Security
  'safety_cctv',
  'safety_fire_extinguisher',
  'safety_fire_extinguisher_date',
  'safety_guard_name',
  'safety_guard_phone',
  'safety_notes',
  'safety_security',
  'safety_security_app',
  'safety_security_creds_documented',
  'safety_watchman_hours',
  'safety_watchman_timing',
  // Society Management
  'society_contact_name',
  'society_contact_phone',
  'society_last_paid_date',
  'society_maintenance_amount',
  'society_name',
  'society_outstanding_amount',
  'society_outstanding_details',
  'society_outstanding_dues',
  'society_payment_app',
  'society_payment_frequency',
  'society_payment_method',
  // Other (parking)
  'parking_2w_slot',
  'parking_4w_slot',
  'parking_ev_charging',
  'parking_ev_type',
] as const;

export type UtilityKey = (typeof UTILITY_KEYS)[number];

export type UtilityGroup =
  | 'Door & Keys'
  | 'Water'
  | 'Gas'
  | 'Electricity'
  | 'Safety & Security'
  | 'Society Management'
  | 'Other';

// ── Report payload ────────────────────────────────────────────────────────────
// Everything the PDF document component needs. Assembled once from InspectionForm
// state immediately before generation (after flushPendingSaves resolves).

export interface ReportPayload {
  reportType: ReportType;
  inspectorName: string;
  property: ReportProperty;
  inspection: ReportInspectionMeta;
  rooms: LocalRoom[];
  appliances: LocalAppliance[];
  damages: DamageItem[];
  utilitiesOverview: Partial<Record<UtilityKey, unknown>>;
  ownerName: string;
  generatedAt: Date;
  /** Optional Google Drive folder URL with inspection photos/video. Rendered in PDF if present. */
  mediaDriveLink?: string | null;
  /** Inspection summary data from InspectionSummaryCard (overall_condition, cleaning, repainting, urgent_items, recommended_items). */
  inspectionSummary?: unknown;
  /** Key return tracking entries array from KeyReturnCard ({ id, label, requires_input, keys_expected, keys_found }[]). */
  keyReturnSummary?: unknown;
}
