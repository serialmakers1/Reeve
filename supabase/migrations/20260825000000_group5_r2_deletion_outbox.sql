-- Group 5 — durable DB-first R2 image-deletion cleanup outbox.
--
-- ROOT CAUSE (from image-system diagnosis):
--   delete-property-image deletes the DB row, then issues an R2 DELETE whose
--   HTTP response is discarded (fire-and-forget). Any R2/network failure
--   (401/403/404/429/5xx/timeout) leaves an orphan object while the app reports
--   success, and nothing records the pending cleanup — so it is never retried.
--
-- FIX (foundation only): a minimal, credential-free internal outbox plus an
--   AFTER DELETE trigger on property_images that enqueues the trusted object key
--   in the SAME transaction as the DB delete. This closes the Edge-crash-after-
--   commit gap and automatically covers every future path that removes a
--   property_images row (direct delete, delete_property_photo RPC, FK cascade on
--   property hard-delete) without special-casing them. The Edge Function still
--   deletes DB-first, then R2, then clears the outbox row on success.
--
-- SCOPE: table + trigger only. No draining/reconciliation worker (later prompt),
--   no lifecycle cleanup (archive/reject/supersede), no change to delete_property_photo,
--   enforce_property_image_policy, property_images RLS, or the upload path.
--
-- Canonical R2 public prefix (matches the Edge Function's key derivation):
--   https://images.reeve.in/  →  object key = properties/<id>/photos/<ts>-<uuid>.<ext>
--
-- NOT executed anywhere before review. Deploy separately after review.

-- ── Step 1: Internal cleanup outbox table ────────────────────────────────────
-- Deliberately NO property_id FK: a cascade would erase the cleanup record
-- exactly when a property is hard-deleted — the case we most need to catch.
-- object_key is UNIQUE so re-enqueue of the same object is a safe no-op.

CREATE TABLE IF NOT EXISTS public.pending_r2_deletions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_key      text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  attempt_count   integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  last_error      text
);

COMMENT ON TABLE public.pending_r2_deletions IS
  'Durable R2 cleanup outbox. A row means an R2 object whose DB reference is gone '
  'and which must eventually be deleted from R2. Service-role/backend only — never '
  'written or read by anon/authenticated clients. No property FK by design.';

-- ── Step 2: RLS deny-all clients + explicit service-role grant ───────────────
-- Mirror the email_send_log service-only idiom: RLS enabled with ZERO policies
-- (no anon/authenticated access). Supabase changed new-table Data API defaults in
-- 2026 and may not auto-grant service_role, so grant it explicitly — the staged-
-- delete enqueue, clearOutbox, and failure-metadata updates all use service-role REST.

ALTER TABLE public.pending_r2_deletions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pending_r2_deletions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pending_r2_deletions TO service_role;

-- ── Step 3: AFTER DELETE trigger — transactional enqueue ─────────────────────
-- Runs in the same transaction as the property_images DELETE, so a durable
-- cleanup record exists even if the Edge Function crashes right after commit.
-- SECURITY DEFINER (owner postgres) so it can write the outbox regardless of the
-- caller's RLS. search_path pinned empty with fully-qualified refs (same hardening
-- as private.is_property_publicly_visible / get_owner_card). Only enqueues when the
-- url carries the canonical public prefix; otherwise a trusted key cannot be
-- derived and we skip rather than store a bad key.

CREATE OR REPLACE FUNCTION public.enqueue_r2_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prefix constant text := 'https://images.reeve.in/';
  v_key text;
BEGIN
  IF OLD.url IS NOT NULL AND left(OLD.url, length(v_prefix)) = v_prefix THEN
    v_key := substring(OLD.url FROM length(v_prefix) + 1);
    IF v_key <> '' THEN
      INSERT INTO public.pending_r2_deletions (object_key)
      VALUES (v_key)
      ON CONFLICT (object_key) DO NOTHING;
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.enqueue_r2_deletion() OWNER TO postgres;

-- Trigger-only function: EXECUTE is checked at CREATE TRIGGER time, so revoke it
-- from every role (owner postgres still fires it as the trigger).
REVOKE ALL ON FUNCTION public.enqueue_r2_deletion() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE TRIGGER enqueue_r2_deletion_trigger
  AFTER DELETE ON public.property_images
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_r2_deletion();
