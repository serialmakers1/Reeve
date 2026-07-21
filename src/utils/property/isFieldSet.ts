// Fields where 0 is a meaningful value (not "empty")
const ZERO_IS_VALID = new Set([
  "floor_number",
  "total_floors",
  "balconies",
  "building_age_years",
  "notice_period_days",
  "notice_period_months",
  "annual_rent_increase_pct",
  "lock_in_months",
  "security_deposit_months",
  "security_deposit_amount",
]);

export function isFieldSet(key: string, value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (value === 0 && !ZERO_IS_VALID.has(key)) return false;
  return true;
}
