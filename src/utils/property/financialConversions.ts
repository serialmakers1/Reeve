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

// F2-D5: `computeBrokerageMonths` deleted. Brokerage is now a flat amount
// column (`rent_brokerage_fixed_amount`); consumers derive months as
// `amount / listed_rent` inline where thresholds are needed
// (see NoSurprisesCard). No shared helper is required.
