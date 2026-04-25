-- Migration: R5 — fix ON DELETE behavior for 2 FK constraints
--
-- visit_events.visit_id  → CASCADE   (was NO ACTION)
--   Rationale: visit_events rows are an audit trail for a specific visit.
--   If the visit row is deleted, the event rows are orphaned and meaningless.
--   CASCADE is the correct semantic.
--
-- payments.application_id → SET NULL  (was NO ACTION)
--   Rationale: a payment record is a financial fact and must survive if
--   the application is deleted. SET NULL preserves the payment row while
--   severing the dangling FK reference. payments.application_id is nullable.
--
-- ── DEFERRED — requires product/schema decision before proceeding ─────────────
--
-- applications.tenant_id → SET NULL / CASCADE / RESTRICT
--   Status: DEFERRED. The column is NOT NULL — adding SET NULL requires
--   dropping the NOT NULL constraint first, which changes the data model.
--   Decision needed: can an application exist without a tenant (SET NULL +
--   drop NOT NULL), should it cascade-delete (CASCADE), or should tenant
--   deletion be blocked while active applications exist (RESTRICT)?
--   Do not implement until the product owner has confirmed the expected
--   behaviour on tenant account deletion.
--
-- leases.application_id → SET NULL / CASCADE / RESTRICT
--   Status: DEFERRED. The column is NOT NULL — same reasoning as above.
--   A lease is a legal document; silently cascade-deleting it if its source
--   application is deleted is almost certainly wrong. Clarify retention policy
--   (keep lease with NULL application_id, or block application deletion while
--   a lease exists) before adding ON DELETE behaviour here.
--
-- ── Implementation ────────────────────────────────────────────────────────────
--
-- Pattern: drop the existing FK constraint by name, re-add with new ON DELETE.
-- The constraint name must match what Postgres assigned at table creation time.
-- If the live DB used a different name, this will fail with
-- "constraint does not exist" — run the verification query below first to
-- confirm names before applying.
--
-- DOWN:
--   Drop the two constraints and re-add them without ON DELETE specification
--   (Postgres defaults to NO ACTION).

BEGIN;

-- visit_events.visit_id → CASCADE
ALTER TABLE public.visit_events
  DROP CONSTRAINT IF EXISTS visit_events_visit_id_fkey;

ALTER TABLE public.visit_events
  ADD CONSTRAINT visit_events_visit_id_fkey
    FOREIGN KEY (visit_id)
    REFERENCES public.visits (id)
    ON DELETE CASCADE;

-- payments.application_id → SET NULL
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_application_id_fkey;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_application_id_fkey
    FOREIGN KEY (application_id)
    REFERENCES public.applications (id)
    ON DELETE SET NULL;

COMMIT;

-- ── Verification ──────────────────────────────────────────────────────────────
-- Expected: 2 rows showing correct confdeltype values
--   visit_events_visit_id_fkey  → confdeltype = 'c'  (CASCADE)
--   payments_application_id_fkey → confdeltype = 'n' (SET NULL)
SELECT
  conname,
  conrelid::regclass AS table_name,
  confdeltype
FROM pg_constraint
WHERE contype = 'f'
  AND conname IN (
    'visit_events_visit_id_fkey',
    'payments_application_id_fkey'
  )
ORDER BY conname;
