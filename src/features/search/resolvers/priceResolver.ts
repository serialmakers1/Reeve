import type { SearchPropertyResult } from "@/features/search/data/searchResultContract";
import { formatIndianRupee, formatPriceShort } from "@/features/search/domain/formatCurrency";

export interface DisplayPrice {
  primary: string;
  isTotalMonthly?: boolean;
}

export function resolveDisplayPrice(result: SearchPropertyResult): DisplayPrice | null {
  const { price } = result;
  if (!price) return null;
  switch (price.kind) {
    case "rent_total":
      return { primary: formatIndianRupee(price.amount) + "/mo", isTotalMonthly: true };
    case "rent_monthly":
      return { primary: formatIndianRupee(price.amount) + "/mo rent", isTotalMonthly: false };
    case "sale":
      return { primary: formatPriceShort(price.amount) };
  }
}
