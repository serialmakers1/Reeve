type EnumMap = Record<string, Record<string, string>>;

const PARKING_LABELS: Record<string, string> = {
  none: "None",
  covered: "Covered",
  uncovered: "Open",
  both: "Covered & Open",
};

const ENUM_LABELS: EnumMap = {
  bhk: {
    "1BHK": "1 BHK",
    "2BHK": "2 BHK",
    "3BHK": "3 BHK",
    "4BHK": "4 BHK",
    "5BHK_plus": "5+ BHK",
    studio: "Studio",
  },
  furnishing: {
    unfurnished: "Unfurnished",
    semi_furnished: "Semi-furnished",
    fully_furnished: "Fully furnished",
  },
  listing_type: {
    rent: "For Rent",
    sale: "For Sale",
  },
  possession_status: {
    ready_to_move: "Ready to Move",
    under_construction: "Under Construction",
    new_launch: "New Launch",
  },
  rent_brokerage_type: {
    none: "Zero brokerage",
  },
  parking_2w: PARKING_LABELS,
  parking_4w: PARKING_LABELS,
  gas_type: {
    pipeline: "Piped gas",
    cylinder: "Cylinder gas",
  },
  khata_type: {
    A: "A Khata",
    B: "B Khata",
    not_applicable: "Not applicable",
  },
  water_storage: {
    sump_only: "Sump only",
    overhead_only: "Overhead tank",
    both: "Sump + overhead",
    none: "No storage",
  },
  main_door_lock_type: {
    standard: "Standard lock",
    godrej_manual: "Branded manual lock",
    digital_keypad: "Digital keypad",
    smart_lock: "Smart lock",
  },
};

function toTitleCase(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function formatEnumLabel(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const mapped = ENUM_LABELS[key]?.[str];
  if (mapped) return mapped;
  return toTitleCase(str);
}
