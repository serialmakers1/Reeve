import type { UtilityKey, UtilityGroup } from './types';

// Record<UtilityKey, ...> is intentionally strict — TypeScript will error at
// compile time if any key in UTILITY_KEYS is missing an entry here. That is the
// test strategy: label coverage is enforced by the type system, not by tests.
export const UTILITY_LABELS: Record<UtilityKey, { label: string; group: UtilityGroup }> = {
  // ── Door & Keys ──────────────────────────────────────────────────────────
  door_child_lock:              { label: 'Child lock?',                 group: 'Door & Keys' },
  door_condition:               { label: 'Door condition',              group: 'Door & Keys' },
  door_inner_type:              { label: 'Inner door type',             group: 'Door & Keys' },
  door_intercom:                { label: 'Intercom / video bell',       group: 'Door & Keys' },
  door_intercom_brand:          { label: 'Intercom brand',              group: 'Door & Keys' },
  door_intercom_creds_documented: { label: 'Intercom credentials documented?', group: 'Door & Keys' },
  door_is_double:               { label: 'Double door?',               group: 'Door & Keys' },
  door_keys_count:              { label: 'Number of keys',              group: 'Door & Keys' },
  door_lock_brand:              { label: 'Lock brand',                  group: 'Door & Keys' },
  door_lock_type:               { label: 'Lock type',                   group: 'Door & Keys' },
  door_notes:                   { label: 'Door notes',                  group: 'Door & Keys' },
  door_outer_type:              { label: 'Outer door type',             group: 'Door & Keys' },
  door_peephole:                { label: 'Peephole?',                   group: 'Door & Keys' },
  door_type:                    { label: 'Door type',                   group: 'Door & Keys' },

  // ── Water ────────────────────────────────────────────────────────────────
  water_consumer_id:            { label: 'Consumer ID (BWSSB/BBMP)',    group: 'Water' },
  water_meter:                  { label: 'Water meter?',                group: 'Water' },
  water_overhead_tank:          { label: 'Overhead tank?',              group: 'Water' },
  water_source:                 { label: 'Water source',                group: 'Water' },
  water_sump:                   { label: 'Sump?',                       group: 'Water' },
  water_supply:                 { label: 'Water supply schedule',       group: 'Water' },
  water_timing:                 { label: 'Water timing',                group: 'Water' },

  // ── Gas ──────────────────────────────────────────────────────────────────
  gas_consumer_id:              { label: 'PNG consumer number',         group: 'Gas' },
  gas_location:                 { label: 'Gas connection location',     group: 'Gas' },
  gas_type:                     { label: 'Gas type',                    group: 'Gas' },
  gas_meter_reading:            { label: 'Gas Meter Reading',           group: 'Gas' },

  // ── Electricity ──────────────────────────────────────────────────────────
  electricity_backup:           { label: 'Power backup',                group: 'Electricity' },
  electricity_circuits:         { label: 'Number of circuits',          group: 'Electricity' },
  electricity_consumer_id:      { label: 'Consumer ID (BESCOM/BBMP)',   group: 'Electricity' },
  electricity_inverter:         { label: 'Inverter?',                   group: 'Electricity' },
  electricity_mcb_location:     { label: 'MCB location',               group: 'Electricity' },
  electricity_meter_reading:    { label: 'Electricity Meter Reading',   group: 'Electricity' },

  // ── Safety & Security ────────────────────────────────────────────────────
  safety_cctv:                  { label: 'CCTV coverage',               group: 'Safety & Security' },
  safety_fire_extinguisher:     { label: 'Fire extinguisher present?',  group: 'Safety & Security' },
  safety_fire_extinguisher_date: { label: 'Extinguisher last serviced', group: 'Safety & Security' },
  safety_guard_name:            { label: 'Security guard name',         group: 'Safety & Security' },
  safety_guard_phone:           { label: 'Security guard phone',        group: 'Safety & Security' },
  safety_notes:                 { label: 'Safety notes',                group: 'Safety & Security' },
  safety_security:              { label: 'Security arrangement',        group: 'Safety & Security' },
  safety_security_app:          { label: 'Security app',                group: 'Safety & Security' },
  safety_security_creds_documented: { label: 'Security app credentials documented?', group: 'Safety & Security' },
  safety_watchman_hours:        { label: 'Watchman hours',              group: 'Safety & Security' },
  safety_watchman_timing:       { label: 'Watchman timing',             group: 'Safety & Security' },

  // ── Society Management ───────────────────────────────────────────────────
  society_contact_name:         { label: 'Society contact name',        group: 'Society Management' },
  society_contact_phone:        { label: 'Society contact phone',       group: 'Society Management' },
  society_last_paid_date:       { label: 'Maintenance last paid date',  group: 'Society Management' },
  society_maintenance_amount:   { label: 'Maintenance amount (INR)',    group: 'Society Management' },
  society_name:                 { label: 'Society / RWA name',          group: 'Society Management' },
  society_outstanding_amount:   { label: 'Outstanding dues amount (INR)', group: 'Society Management' },
  society_outstanding_details:  { label: 'Outstanding dues details',    group: 'Society Management' },
  society_outstanding_dues:     { label: 'Outstanding dues?',           group: 'Society Management' },
  society_payment_app:          { label: 'Payment app / portal',        group: 'Society Management' },
  society_payment_frequency:    { label: 'Payment frequency',           group: 'Society Management' },
  society_payment_method:       { label: 'Payment method',              group: 'Society Management' },

  // ── Other (parking) ──────────────────────────────────────────────────────
  parking_2w_slot:              { label: '2-wheeler parking slot',      group: 'Other' },
  parking_4w_slot:              { label: '4-wheeler parking slot',      group: 'Other' },
  parking_ev_charging:          { label: 'EV charging available?',      group: 'Other' },
  parking_ev_type:              { label: 'EV charger type',             group: 'Other' },
};
