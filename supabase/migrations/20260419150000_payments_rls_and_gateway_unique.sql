
-- Phase 1 of Razorpay UPI token payment implementation.
--
-- 1. Enable RLS on payments table (was disabled — no existing policies).
-- 2. Add tenant SELECT policy so tenants can read their own payment rows.
--    Service role (used by Edge Functions) bypasses RLS automatically.
-- 3. Add UNIQUE constraint on gateway_reference (Razorpay order ID) to
--    serve as the idempotency anchor for webhook deduplication.
--    Uses a DO block because Postgres does not support ADD CONSTRAINT IF NOT EXISTS.

-- ── 1. Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ── 2. Tenant SELECT policy ───────────────────────────────────────────────────
-- Matches project RLS pattern: user SELECT uses USING (user_id = auth.uid())
-- payments uses payer_id as the tenant owner column.
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = payer_id);

-- Admin SELECT policy — mirrors is_admin() pattern used across the project.
DROP POLICY IF EXISTS "payments_select_admin" ON public.payments;
CREATE POLICY "payments_select_admin"
  ON public.payments
  FOR SELECT
  USING (is_admin());

-- ── 3. UNIQUE constraint on gateway_reference ─────────────────────────────────
-- gateway_reference stores the Razorpay order ID (e.g. order_XXXX).
-- UNIQUE enforces idempotency: duplicate webhook deliveries hit ON CONFLICT
-- and are silently discarded rather than creating duplicate payment rows.
-- NULL values are excluded from UNIQUE enforcement by Postgres (each NULL is distinct),
-- so existing rows with NULL gateway_reference are unaffected.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_gateway_reference_unique'
      AND conrelid = 'public.payments'::regclass
  ) THEN
    ALTER TABLE public.payments
      ADD CONSTRAINT payments_gateway_reference_unique UNIQUE (gateway_reference);
  END IF;
END $$;
