/** Shared property status helpers for owner-facing UI */

export interface StatusDisplay {
  label: string;
  color: string; // tailwind border/text/bg class fragment
  nextAction: string;
}

const STATUS_CONFIG: Record<string, StatusDisplay> = {
  draft: {
    label: "Setup Started",
    color: "border-amber-500 text-amber-600 bg-amber-50",
    nextAction: "Upload documents & request inspection",
  },
  inspection_proposed: {
    label: "Under Review",
    color: "border-blue-500 text-blue-600 bg-blue-50",
    nextAction: "Waiting for Reeve to schedule inspection",
  },
  inspection_scheduled: {
    label: "Under Review",
    color: "border-blue-500 text-blue-600 bg-blue-50",
    nextAction: "Inspection scheduled — no action needed",
  },
  inspected: {
    label: "Under Review",
    color: "border-blue-500 text-blue-600 bg-blue-50",
    nextAction: "Waiting for Reeve review",
  },
  listed: {
    label: "Live",
    color: "border-green-500 text-green-600 bg-green-50",
    nextAction: "Property is live — view applications",
  },
  occupied: {
    label: "Occupied",
    color: "border-green-600 text-green-700 bg-green-50",
    nextAction: "No action needed",
  },
  off_market: {
    label: "Off Market",
    color: "border-gray-400 text-gray-500 bg-gray-50",
    nextAction: "Contact Reeve to re-list",
  },
};

const DEFAULT_STATUS: StatusDisplay = {
  label: "In Progress",
  color: "border-gray-400 text-gray-500 bg-gray-50",
  nextAction: "No action needed",
};

export function getStatusDisplay(status: string | null): StatusDisplay {
  if (!status) return DEFAULT_STATUS;
  return STATUS_CONFIG[status] ?? { ...DEFAULT_STATUS, label: status.replace(/_/g, " ") };
}

/** Short property display ID from UUID, e.g. "RV-A1B2C3D4" */
export function getPropertyDisplayId(uuid: string): string {
  return `RV-${uuid.substring(0, 8).toUpperCase()}`;
}

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  semi_furnished: "Semi-furnished",
  fully_furnished: "Fully furnished",
};

export function getFurnishingLabel(furnishing: string | null): string {
  if (!furnishing) return "—";
  return FURNISHING_LABELS[furnishing] ?? furnishing;
}

export function formatBhk(bhk: string | null): string {
  if (!bhk) return "—";
  return bhk.replace("_plus", "+").replace(/(\d)(BHK)/, "$1 $2");
}
