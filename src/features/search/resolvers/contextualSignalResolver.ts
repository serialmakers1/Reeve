import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";

export interface ContextualSignal {
  type: string;
  displayValue: string;
  intent: "warning" | "neutral";
  anchor?: string;
}

export function resolveContextualSignal(result: SearchPropertyResult): ContextualSignal | null {
  if (result.listingMode === "rent") {
    if (result.rentBrokerageType === "zero") {
      return { type: "zero_brokerage", displayValue: "Zero Brokerage", intent: "neutral" };
    }
    if (result.hasVideoWalkthrough) {
      return { type: "video", displayValue: "Video Tour", intent: "neutral" };
    }
    if (result.petPolicy === "allowed") {
      return { type: "pets", displayValue: "Pets OK", intent: "neutral" };
    }
    if (result.lockInMonths === 0) {
      return { type: "no_lockin", displayValue: "No Lock-in", intent: "neutral" };
    }
    if (result.priceNegotiable === true) {
      return { type: "negotiable", displayValue: "Negotiable", intent: "neutral" };
    }
  } else {
    if (result.hasVideoWalkthrough) {
      return { type: "video", displayValue: "Video Tour", intent: "neutral" };
    }
    if (result.priceNegotiable === true) {
      return { type: "negotiable", displayValue: "Negotiable", intent: "neutral" };
    }
    if (result.saleBrokeragePct === 0) {
      return { type: "zero_brokerage", displayValue: "Zero Brokerage", intent: "neutral" };
    }
  }
  return null;
}
