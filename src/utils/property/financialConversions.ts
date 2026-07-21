export function computeDepositMonths(
  security_deposit_amount: number | null | undefined,
  listed_rent: number | null | undefined,
): number | null {
  if (
    security_deposit_amount === null ||
    security_deposit_amount === undefined ||
    listed_rent === null ||
    listed_rent === undefined ||
    listed_rent <= 0
  ) {
    return null;
  }
  return security_deposit_amount / listed_rent;
}

export interface BrokerageResult {
  months: number | null;
  display: string | null;
}

export function computeBrokerageMonths(
  rent_brokerage_type: string | null | undefined,
  rent_brokerage_fixed_amount: number | null | undefined,
  rent_brokerage_months: number | null | undefined,
  listed_rent: number | null | undefined,
): BrokerageResult {
  if (rent_brokerage_type === "none") {
    return { months: 0, display: "Zero brokerage" };
  }
  if (rent_brokerage_type === "fixed") {
    const amt = rent_brokerage_fixed_amount ?? null;
    const months =
      amt !== null && listed_rent !== null && listed_rent !== undefined && listed_rent > 0
        ? amt / listed_rent
        : null;
    return {
      months,
      display: amt !== null ? `₹${amt.toLocaleString("en-IN")}` : null,
    };
  }
  if (rent_brokerage_type === "months") {
    const m = rent_brokerage_months ?? null;
    return {
      months: m,
      display: m !== null ? `${m} month${m === 1 ? "" : "s"} rent` : null,
    };
  }
  return { months: null, display: null };
}
