export type PreferenceMode = "rent" | "buy" | "both";

export type BuyingPurpose =
  | "self_use"
  | "investment"
  | "family_member"
  | "still_deciding";

export type PurchaseTimeline =
  | "as_soon_as_possible"
  | "within_1_month"
  | "within_1_to_3_months"
  | "within_3_to_6_months"
  | "more_than_6_months"
  | "still_exploring";

export type FundingStage =
  | "self_funded"
  | "loan_pre_approved"
  | "planning_home_loan"
  | "savings_and_home_loan"
  | "still_evaluating"
  | "prefer_not_to_disclose";

export const PREFERENCE_MODE_OPTIONS = [
  { value: "rent" as PreferenceMode, label: "Rent" },
  { value: "buy" as PreferenceMode, label: "Buy" },
  { value: "both" as PreferenceMode, label: "Both" },
];

export const BUYING_PURPOSE_OPTIONS: { value: BuyingPurpose; label: string }[] = [
  { value: "self_use", label: "Self use" },
  { value: "investment", label: "Investment" },
  { value: "family_member", label: "For a family member" },
  { value: "still_deciding", label: "Still deciding" },
];

export const PURCHASE_TIMELINE_OPTIONS: { value: PurchaseTimeline; label: string }[] = [
  { value: "as_soon_as_possible", label: "As soon as possible" },
  { value: "within_1_month", label: "Within 1 month" },
  { value: "within_1_to_3_months", label: "Within 1–3 months" },
  { value: "within_3_to_6_months", label: "Within 3–6 months" },
  { value: "more_than_6_months", label: "More than 6 months" },
  { value: "still_exploring", label: "Still exploring" },
];

export const FUNDING_STAGE_OPTIONS: { value: FundingStage; label: string }[] = [
  { value: "self_funded", label: "Self funded" },
  { value: "loan_pre_approved", label: "Loan pre-approved" },
  { value: "planning_home_loan", label: "Planning a home loan" },
  { value: "savings_and_home_loan", label: "Savings + home loan" },
  { value: "still_evaluating", label: "Still evaluating" },
  { value: "prefer_not_to_disclose", label: "Prefer not to disclose" },
];

export const BUYING_PURPOSE_LABELS: Record<string, string> = Object.fromEntries(
  BUYING_PURPOSE_OPTIONS.map((o) => [o.value, o.label]),
);
export const PURCHASE_TIMELINE_LABELS: Record<string, string> = Object.fromEntries(
  PURCHASE_TIMELINE_OPTIONS.map((o) => [o.value, o.label]),
);
export const FUNDING_STAGE_LABELS: Record<string, string> = Object.fromEntries(
  FUNDING_STAGE_OPTIONS.map((o) => [o.value, o.label]),
);

// ── Shared rental preference option sets (single source of truth) ──────────────
// Consumed by TenantPreferences (the form) and the owner request filters so the
// labels never drift. Values match the rental_preferences columns / snapshot.

export type Gender = "male" | "female" | "other";
export type MaritalStatus = "single" | "married" | "family" | "live_in";
export type Occupation = "salaried" | "self_employed" | "student" | "retired" | "other";
export type Diet = "veg" | "non_veg";
export type StayDuration =
  | "less_than_6_months"
  | "6_to_11_months"
  | "1_year"
  | "2_years"
  | "3_years_plus"
  | "flexible";
export type PetType = "dog" | "cat" | "other";

export const OCCUPATION_OPTIONS: { value: Occupation; label: string }[] = [
  { value: "salaried", label: "Salaried" },
  { value: "self_employed", label: "Self-employed" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const MARITAL_STATUS_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "family", label: "Family" },
  { value: "live_in", label: "Live-in" },
];

export const DIET_OPTIONS: { value: Diet; label: string }[] = [
  { value: "veg", label: "Veg" },
  { value: "non_veg", label: "Non-veg" },
];

export const STAY_OPTIONS: { value: StayDuration; label: string }[] = [
  { value: "less_than_6_months", label: "Less than 6 months" },
  { value: "6_to_11_months", label: "6–11 months" },
  { value: "1_year", label: "1 year" },
  { value: "2_years", label: "2 years" },
  { value: "3_years_plus", label: "3+ years" },
  { value: "flexible", label: "Flexible" },
];

export const PET_TYPE_OPTIONS: { value: PetType; label: string }[] = [
  { value: "dog", label: "Dog" },
  { value: "cat", label: "Cat" },
  { value: "other", label: "Other" },
];

const toLabelMap = (opts: { value: string; label: string }[]): Record<string, string> =>
  Object.fromEntries(opts.map((o) => [o.value, o.label]));

export const OCCUPATION_LABELS = toLabelMap(OCCUPATION_OPTIONS);
export const GENDER_LABELS = toLabelMap(GENDER_OPTIONS);
export const MARITAL_STATUS_LABELS = toLabelMap(MARITAL_STATUS_OPTIONS);
export const DIET_LABELS = toLabelMap(DIET_OPTIONS);
export const STAY_LABELS = toLabelMap(STAY_OPTIONS);
export const PET_TYPE_LABELS = toLabelMap(PET_TYPE_OPTIONS);

export function isRentModeActive(mode: PreferenceMode | null | undefined): boolean {
  return mode === "rent" || mode === "both";
}

export function isBuyModeActive(mode: PreferenceMode | null | undefined): boolean {
  return mode === "buy" || mode === "both";
}

export interface RentCompletenessFields {
  age?: number | null;
  occupation?: string | null;
  is_foreign_citizen?: boolean | null;
  gender?: string | null;
  number_of_occupants?: number | null;
  expected_stay_duration?: string | null;
}

export interface BuyCompletenessFields {
  age?: number | null;
  occupation?: string | null;
  is_foreign_citizen?: boolean | null;
  buying_purpose?: string | null;
  purchase_timeline?: string | null;
  funding_stage?: string | null;
}

export function isRentComplete(prefs: RentCompletenessFields): boolean {
  return (
    !!prefs.age &&
    !!prefs.occupation &&
    prefs.is_foreign_citizen !== null &&
    prefs.is_foreign_citizen !== undefined &&
    !!prefs.gender &&
    typeof prefs.number_of_occupants === "number" &&
    prefs.number_of_occupants >= 1 &&
    !!prefs.expected_stay_duration
  );
}

export function isBuyComplete(prefs: BuyCompletenessFields): boolean {
  return (
    !!prefs.age &&
    !!prefs.occupation &&
    prefs.is_foreign_citizen !== null &&
    prefs.is_foreign_citizen !== undefined &&
    !!prefs.buying_purpose &&
    !!prefs.purchase_timeline &&
    !!prefs.funding_stage
  );
}
