/**
 * Label and group metadata for every room_features key the inspection form
 * can save. The form stores features as a flat Record<string, unknown> keyed
 * by these snake_case strings. The PDF renderer uses this map to produce
 * human-readable labels grouped into named sections.
 *
 * Adding a new form feature: add the key here AND in the corresponding
 * room-type branch of InspectionForm.tsx. Unknown keys are silently skipped
 * in the PDF with a console.warn.
 */

export interface FeatureMeta {
  label: string;
  group: string;
}

// Canonical render order for feature groups inside a room card.
export const FEATURE_GROUP_ORDER: string[] = [
  'Windows',
  'Curtains',
  'False Ceiling',
  'Air Conditioning',
  'TV & Décor',
  'Wardrobes',
  'Bedroom Furniture',
  'Modular Kitchen',
  'Counter',
  'Kitchen Storage',
  'Kitchen Appliances',
  'Geyser',
  'Sanitary',
  'Flush',
  'Mixer & Tap',
  'Sink',
  'Shower',
  'Tiles',
  'Balcony',
  'Laundry & Drying',
  'Gas',
  'Utility Sink',
  'Fittings',
  'Room Lock',
  'Washroom Lock',
  'Balcony Lock',
  'Structural',
  'General',
];

export const ROOM_FEATURE_LABELS: Record<string, FeatureMeta> = {
  // ── Windows ────────────────────────────────────────────────────────────────
  window_count:             { label: 'Window count',           group: 'Windows' },
  window_glass_condition:   { label: 'Window glass condition', group: 'Windows' },
  window_grill:             { label: 'Window grill',           group: 'Windows' },
  window_mesh:              { label: 'Mosquito mesh',          group: 'Windows' },

  // ── Curtains ───────────────────────────────────────────────────────────────
  curtain_rod_count:        { label: 'Curtain rod count',  group: 'Curtains' },
  curtain_rod_type:         { label: 'Curtain rod type',   group: 'Curtains' },
  curtains_present:         { label: 'Curtains present',   group: 'Curtains' },
  curtain_type:             { label: 'Curtain type',       group: 'Curtains' },
  curtain_condition:        { label: 'Curtain condition',  group: 'Curtains' },

  // ── False Ceiling ──────────────────────────────────────────────────────────
  false_ceiling:            { label: 'False ceiling',           group: 'False Ceiling' },
  false_ceiling_condition:  { label: 'False ceiling condition', group: 'False Ceiling' },

  // ── Air Conditioning (bedroom) ─────────────────────────────────────────────
  ac_point_present:         { label: 'AC point present', group: 'Air Conditioning' },
  ac_mounted:               { label: 'AC unit mounted',  group: 'Air Conditioning' },

  // ── TV & Décor (living room) ───────────────────────────────────────────────
  tv_wall_mount:            { label: 'TV wall mount',        group: 'TV & Décor' },
  tv_wall_mount_condition:  { label: 'TV mount condition',   group: 'TV & Décor' },
  pooja_unit:               { label: 'Pooja unit / Mandir',  group: 'TV & Décor' },
  pooja_unit_condition:     { label: 'Pooja unit condition', group: 'TV & Décor' },

  // ── Wardrobes (bedroom) ────────────────────────────────────────────────────
  wardrobe_type:            { label: 'Wardrobe type',        group: 'Wardrobes' },
  wardrobe_shutters:        { label: 'No. of shutters',      group: 'Wardrobes' },
  wardrobe_condition:       { label: 'Wardrobe condition',   group: 'Wardrobes' },
  cupboard_lock_brand:      { label: 'Cupboard lock brand',  group: 'Wardrobes' },
  cupboard_lock_keys:       { label: 'Cupboard lock — keys', group: 'Wardrobes' },

  // ── Bedroom Furniture ──────────────────────────────────────────────────────
  study_table:              { label: 'Study table',             group: 'Bedroom Furniture' },
  study_table_condition:    { label: 'Study table condition',   group: 'Bedroom Furniture' },
  dressing_table:           { label: 'Dressing table / mirror', group: 'Bedroom Furniture' },
  dressing_table_condition: { label: 'Dressing table condition',group: 'Bedroom Furniture' },

  // ── Modular Kitchen ────────────────────────────────────────────────────────
  modular_kitchen:          { label: 'Modular kitchen',   group: 'Modular Kitchen' },
  modular_material:         { label: 'Material',          group: 'Modular Kitchen' },
  modular_shutters:         { label: 'Shutter condition', group: 'Modular Kitchen' },
  modular_hinges:           { label: 'Hinge condition',   group: 'Modular Kitchen' },
  modular_handles:          { label: 'Handle condition',  group: 'Modular Kitchen' },

  // ── Counter (kitchen) ──────────────────────────────────────────────────────
  counter_material:         { label: 'Counter / slab material', group: 'Counter' },
  counter_condition:        { label: 'Counter condition',       group: 'Counter' },

  // ── Kitchen Storage ────────────────────────────────────────────────────────
  loft_storage:             { label: 'Loft storage',  group: 'Kitchen Storage' },
  loft_condition:           { label: 'Loft condition', group: 'Kitchen Storage' },

  // ── Kitchen Appliances ─────────────────────────────────────────────────────
  chimney_provision:        { label: 'Chimney provision',    group: 'Kitchen Appliances' },
  water_purifier_point:     { label: 'Water purifier point', group: 'Kitchen Appliances' },

  // ── Geyser (bathroom) ──────────────────────────────────────────────────────
  geyser_status:            { label: 'Geyser',       group: 'Geyser' },
  geyser_brand:             { label: 'Geyser brand', group: 'Geyser' },

  // ── Sanitary (bathroom + kitchen exhaust) ──────────────────────────────────
  exhaust_fan_present:      { label: 'Exhaust fan',         group: 'Sanitary' },
  mirror_present:           { label: 'Mirror',              group: 'Sanitary' },
  mirror_condition:         { label: 'Mirror condition',    group: 'Sanitary' },
  towel_rod_count:          { label: 'Towel rod count',     group: 'Sanitary' },
  towel_rod_condition:      { label: 'Towel rod condition', group: 'Sanitary' },

  // ── Flush ──────────────────────────────────────────────────────────────────
  flush_type:               { label: 'Flush type',      group: 'Flush' },
  flush_mechanism:          { label: 'Flush mechanism', group: 'Flush' },
  flush_working:            { label: 'Flush working',   group: 'Flush' },
  flush_brand:              { label: 'Flush brand',     group: 'Flush' },

  // ── Mixer & Tap ────────────────────────────────────────────────────────────
  mixer_present:            { label: 'Hot + cold mixer',  group: 'Mixer & Tap' },
  mixer_working:            { label: 'Mixer working',     group: 'Mixer & Tap' },
  tap_brand:                { label: 'Mixer / tap brand', group: 'Mixer & Tap' },

  // ── Sink (bathroom, kitchen, balcony utility) ──────────────────────────────
  sink_present:             { label: 'Sink present',   group: 'Sink' },
  sink_type:                { label: 'Sink type',      group: 'Sink' },
  sink_material:            { label: 'Sink material',  group: 'Sink' },
  sink_condition:           { label: 'Sink condition', group: 'Sink' },
  sink_tap_condition:       { label: 'Tap condition',  group: 'Sink' },
  sink_brand:               { label: 'Sink brand',     group: 'Sink' },
  sink_tap_working:         { label: 'Tap working',    group: 'Sink' },
  sink_drainage:            { label: 'Drainage OK',    group: 'Sink' },

  // ── Shower ─────────────────────────────────────────────────────────────────
  shower_overhead:          { label: 'Overhead shower',  group: 'Shower' },
  shower_handheld:          { label: 'Handheld shower',  group: 'Shower' },
  shower_condition:         { label: 'Shower condition', group: 'Shower' },
  shower_brand:             { label: 'Shower brand',     group: 'Shower' },
  shower_partition:         { label: 'Shower partition', group: 'Shower' },
  shower_glass_condition:   { label: 'Glass condition',  group: 'Shower' },

  // ── Tiles (bathroom) ───────────────────────────────────────────────────────
  tiles_grout_stained:      { label: 'Grout stained',       group: 'Tiles' },
  tiles_cracked_count:      { label: 'Cracked tiles count', group: 'Tiles' },

  // ── Balcony ────────────────────────────────────────────────────────────────
  attached_to:              { label: 'Attached to',   group: 'Balcony' },
  grill_type:               { label: 'Grill type',    group: 'Balcony' },
  grill_glass_condition:    { label: 'Grill glass condition', group: 'Balcony' },
  flooring_type:            { label: 'Flooring type', group: 'Balcony' },

  // ── Laundry & Drying (balcony) ─────────────────────────────────────────────
  wm_tap_point:             { label: 'WM tap point',            group: 'Laundry & Drying' },
  wm_drainage:              { label: 'WM drainage point',       group: 'Laundry & Drying' },
  additional_water_tap:     { label: 'Additional water tap',    group: 'Laundry & Drying' },
  drying_provision:         { label: 'Clothes drying provision',group: 'Laundry & Drying' },
  floor_waterproofed:       { label: 'Floor waterproofed',      group: 'Laundry & Drying' },

  // ── Gas (balcony) ──────────────────────────────────────────────────────────
  gas_cylinder_storage:     { label: 'Gas cylinder storage', group: 'Gas' },
  gas_cylinder_capacity:    { label: 'Cylinder capacity',    group: 'Gas' },

  // ── Utility Sink (balcony) ─────────────────────────────────────────────────
  utility_sink_present:     { label: 'Utility sink present', group: 'Utility Sink' },

  // ── Fittings (shared: living room, bedroom, kitchen, balcony) ─────────────
  ac_provision_count:       { label: 'AC provision points', group: 'Fittings' },
  fan_count:                { label: 'Ceiling fans',        group: 'Fittings' },
  fan_brand:                { label: 'Ceiling fan brand',   group: 'Fittings' },
  fan_present:              { label: 'Ceiling fan',         group: 'Fittings' },
  light_count:              { label: 'Light fixtures',      group: 'Fittings' },
  light_type:               { label: 'Light type',          group: 'Fittings' },
  light_brand:              { label: 'Light brand',         group: 'Fittings' },
  light_present:            { label: 'Light fixture',       group: 'Fittings' },
  switchboard_count:        { label: 'Switchboards',        group: 'Fittings' },
  switchboard_brand:        { label: 'Switchboard brand',   group: 'Fittings' },
  switchboard_present:      { label: 'Switchboard',         group: 'Fittings' },
  wifi_point:               { label: 'WiFi point wiring',   group: 'Fittings' },
  wifi_brand:               { label: 'WiFi / router brand', group: 'Fittings' },
  curtain_blind:            { label: 'Curtain / blind',     group: 'Fittings' },
  curtain_blind_type:       { label: 'Curtain / blind type',group: 'Fittings' },

  // ── Room Lock ──────────────────────────────────────────────────────────────
  room_lock_brand:          { label: 'Room lock brand',        group: 'Room Lock' },
  room_lock_keys:           { label: 'Room lock — no. of keys',group: 'Room Lock' },

  // ── Washroom Lock (bathroom) ───────────────────────────────────────────────
  washroom_lock_brand:      { label: 'Washroom lock brand', group: 'Washroom Lock' },

  // ── Balcony Lock ───────────────────────────────────────────────────────────
  balcony_lock_brand:       { label: 'Balcony lock brand',       group: 'Balcony Lock' },
  balcony_lock_keys:        { label: 'Balcony lock — no. of keys',group: 'Balcony Lock' },

  // ── Structural (all room types) ────────────────────────────────────────────
  seepage_observed:         { label: 'Seepage / dampness', group: 'Structural' },
  seepage_details:          { label: 'Seepage details',    group: 'Structural' },
  cracks_observed:          { label: 'Cracks observed',   group: 'Structural' },
  cracks_details:           { label: 'Crack details',     group: 'Structural' },

  // ── General (default types: study, store, utility, parking, etc.) ──────────
  ventilation:              { label: 'Ventilation',                 group: 'General' },
  electrical_point:         { label: 'Dedicated electrical point',  group: 'General' },
  general_notes:            { label: 'General notes',               group: 'General' },
};
