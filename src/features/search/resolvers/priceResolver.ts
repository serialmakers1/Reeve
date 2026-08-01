import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";
import { formatIndianRupee, formatPriceShort } from "@/features/search/domain/formatCurrency";

export interface DisplayPrice {
  primary: string;
  isTotalMonthly?: boolean;
  /** Emphasized amount only (no unit), e.g. "₹40,000". */
  amount: string;
  /** Subtle unit suffix beside the amount, e.g. "/ month". */
  unit?: string;
  /** Subtle descriptor line, e.g. "Total monthly" / "Rent only" / "Total price". */
  label: string;
}

export function resolveDisplayPrice(result: SearchPropertyResult): DisplayPrice | null {
  const { price } = result;
  if (!price) return null;
  switch (price.kind) {
    case "rent_total":
      return {
        primary: formatIndianRupee(price.amount) + "/mo",
        isTotalMonthly: true,
        amount: formatIndianRupee(price.amount),
        unit: "/ month",
        label: "Total monthly",
      };
    case "rent_monthly":
      return {
        primary: formatIndianRupee(price.amount) + "/mo rent",
        isTotalMonthly: false,
        amount: formatIndianRupee(price.amount),
        unit: "/ month",
        label: "Rent only",
      };
    case "sale":
      return {
        primary: formatPriceShort(price.amount),
        amount: formatPriceShort(price.amount),
        label: "Total price",
      };
  }
}
