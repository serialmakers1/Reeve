-- Add buy-mode columns to rental_preferences (My Preferences universal form).
-- Existing rows are treated as Rent preferences: preference_mode defaults to 'rent'.
-- is_foreign_citizen: remove default false so NULL = unanswered, TRUE = Yes, FALSE = No.
-- preferred_city and preferred_localities are intentionally left untouched.
-- RLS, triggers, existing constraints, and all other tables are untouched.

-- 1. Add preference_mode
ALTER TABLE public.rental_preferences
  ADD COLUMN IF NOT EXISTS preference_mode text NOT NULL DEFAULT 'rent';

ALTER TABLE public.rental_preferences
  ADD CONSTRAINT rental_preferences_preference_mode_check
  CHECK (preference_mode IN ('rent', 'buy', 'both'));

-- 2. Add buying_purpose
ALTER TABLE public.rental_preferences
  ADD COLUMN IF NOT EXISTS buying_purpose text NULL;

ALTER TABLE public.rental_preferences
  ADD CONSTRAINT rental_preferences_buying_purpose_check
  CHECK (buying_purpose IS NULL OR buying_purpose IN (
    'self_use',
    'investment',
    'family_member',
    'still_deciding'
  ));

-- 3. Add purchase_timeline
ALTER TABLE public.rental_preferences
  ADD COLUMN IF NOT EXISTS purchase_timeline text NULL;

ALTER TABLE public.rental_preferences
  ADD CONSTRAINT rental_preferences_purchase_timeline_check
  CHECK (purchase_timeline IS NULL OR purchase_timeline IN (
    'as_soon_as_possible',
    'within_1_month',
    'within_1_to_3_months',
    'within_3_to_6_months',
    'more_than_6_months',
    'still_exploring'
  ));

-- 4. Add funding_stage
ALTER TABLE public.rental_preferences
  ADD COLUMN IF NOT EXISTS funding_stage text NULL;

ALTER TABLE public.rental_preferences
  ADD CONSTRAINT rental_preferences_funding_stage_check
  CHECK (funding_stage IS NULL OR funding_stage IN (
    'self_funded',
    'loan_pre_approved',
    'planning_home_loan',
    'savings_and_home_loan',
    'still_evaluating',
    'prefer_not_to_disclose'
  ));

-- 5. is_foreign_citizen: remove the DEFAULT false and reset all test-data rows to NULL.
--    NULL = unanswered, TRUE = Yes, FALSE = No.
ALTER TABLE public.rental_preferences
  ALTER COLUMN is_foreign_citizen DROP DEFAULT;

UPDATE public.rental_preferences
  SET is_foreign_citizen = NULL;
