// Shared option maps for appliance type / condition / ownership.
// Extracted here so both InspectionForm.tsx (UI) and PDF sections can decode
// stored enum values to human-readable labels without duplicating constants.

export const APPLIANCE_TYPE_LABELS: Record<string, string> = {
  refrigerator:     'Refrigerator',
  washing_machine:  'Washing Machine',
  dryer:            'Dryer',
  air_conditioner:  'Air Conditioner',
  geyser:           'Geyser / Water Heater',
  microwave:        'Microwave',
  stove_hob:        'Stove / Hob',
  exhaust_fan:      'Exhaust Fan',
  ceiling_fan:      'Ceiling Fan',
  dishwasher:       'Dishwasher',
  water_purifier:   'Water Purifier',
  tv:               'Television',
  fire_extinguisher:'Fire Extinguisher',
  other:            'Other',
};

export const APPLIANCE_CONDITION_LABELS: Record<string, string> = {
  fully_functional: 'Fully Functional',
  minor_issues:     'Minor Issues',
  non_functional:   'Non-Functional',
};

export const APPLIANCE_OWNERSHIP_LABELS: Record<string, string> = {
  landlord:     'Landlord',
  platform:     'Platform',
  tenant_owned: 'Tenant-Owned',
};

export function labelOf(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return '—';
  return map[value] ?? value;
}
