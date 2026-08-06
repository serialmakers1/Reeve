-- Stale-listing system (1/6): freshness timestamp columns.
-- current_listed_period_started_at = start of the current continuously-public
-- listing period (does NOT reset on edit_pending_review round-trips).
-- sale_listing_confirmed_at = owner's last "still available" confirmation for
-- sale listings (mirror of availability_confirmed_at for rentals).
-- listed_at is intentionally left untouched (used elsewhere).

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS current_listed_period_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS sale_listing_confirmed_at        timestamptz;

-- Backfill (existing rows are test data; no rollout grace period needed).
UPDATE public.properties
   SET current_listed_period_started_at = COALESCE(listed_at, now())
 WHERE status IN ('listed', 'edit_pending_review')
   AND current_listed_period_started_at IS NULL;

UPDATE public.properties
   SET sale_listing_confirmed_at = COALESCE(sale_listing_confirmed_at, listed_at, now())
 WHERE status IN ('listed', 'edit_pending_review')
   AND listing_type = 'sale'
   AND sale_listing_confirmed_at IS NULL;
