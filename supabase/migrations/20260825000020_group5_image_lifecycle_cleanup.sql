-- Group 5 — property-image lifecycle cleanup (feeds the Prompt-1 pending_r2_deletions outbox).
--
-- Closes the staged-photo leak: staged photos live only in
-- property_edit_requests.payload->'photo_changes'->'add' (never property_images rows
-- until approval), so reject / supersede / withdraw / archive currently abandon their
-- R2 objects. This migration enqueues those objects as cleanup candidates, transactionally
-- with the lifecycle state change. Archive additionally deletes live property_images rows
-- (DB-first) so the existing Prompt-1 AFTER DELETE trigger enqueues their keys.
--
-- Enqueue is only a CANDIDATE signal — the weekly cleanup worker re-checks live references
-- (fail-closed) immediately before any R2 DELETE, so carried-forward (supersede) or
-- newly-live URLs are never deleted here.
--
-- Scope: helpers + 3 triggers only. No RPC bodies are rewritten (a single status trigger
-- covers reject/supersede/withdraw). No worker/scheduler here. unlisted is intentionally
-- untouched (images retained).
--
-- NOT executed anywhere before review. Deploy separately after review.

CREATE SCHEMA IF NOT EXISTS private;

-- ── A1: property-bound staged-URL enqueue helpers (private, not REST-exposed) ────
-- Canonical object-key shape shared with the worker's isValidPhotoKey:
--   properties/<uuid>/photos/<non-empty filename, no further slash>

CREATE OR REPLACE FUNCTION private.enqueue_staged_urls(p_property_id uuid, p_add jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_bind  constant text := 'https://images.reeve.in/properties/' || p_property_id::text || '/photos/';
  v_strip constant text := 'https://images.reeve.in/';
  v_key_re constant text :=
    '^properties/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/photos/[^/]+$';
  v_elem jsonb;
  v_url  text;
  v_key  text;
BEGIN
  -- Defensive: malformed historical payloads must never abort the lifecycle transaction.
  IF p_add IS NULL OR jsonb_typeof(p_add) <> 'array' THEN
    RETURN;
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_add) LOOP
    v_url := v_elem->>'url';
    IF v_url IS NULL THEN CONTINUE; END IF;
    -- Bind to THIS property exactly (submit RPC only checks substring presence of the
    -- UUID, so a corrupt payload could carry property B's key with A's UUID elsewhere).
    IF left(v_url, length(v_bind)) <> v_bind THEN CONTINUE; END IF;
    v_key := substring(v_url FROM length(v_strip) + 1);
    IF v_key !~ v_key_re THEN CONTINUE; END IF;
    INSERT INTO public.pending_r2_deletions (object_key)
    VALUES (v_key)
    ON CONFLICT (object_key) DO NOTHING;
  END LOOP;
END;
$$;

ALTER FUNCTION private.enqueue_staged_urls(uuid, jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.enqueue_staged_urls(uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.enqueue_property_staged_photos(p_property_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT payload FROM public.property_edit_requests WHERE property_id = p_property_id
  LOOP
    PERFORM private.enqueue_staged_urls(p_property_id, r.payload->'photo_changes'->'add');
  END LOOP;
END;
$$;

ALTER FUNCTION private.enqueue_property_staged_photos(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION private.enqueue_property_staged_photos(uuid) FROM PUBLIC, anon, authenticated, service_role;

-- ── A2: one status trigger for reject / supersede / withdraw ─────────────────────
-- Catches every pending → {rejected,superseded,withdrawn} transition (any writer),
-- without touching the three RPC bodies. 'approved' is excluded (those URLs become
-- live property_images rows).

CREATE OR REPLACE FUNCTION public.enqueue_staged_on_request_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.enqueue_staged_urls(NEW.property_id, NEW.payload->'photo_changes'->'add');
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enqueue_staged_on_request_close() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enqueue_staged_on_request_close() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE TRIGGER enqueue_staged_on_request_close_trigger
  AFTER UPDATE OF status ON public.property_edit_requests
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status IN ('rejected', 'superseded', 'withdrawn'))
  EXECUTE FUNCTION public.enqueue_staged_on_request_close();

-- ── A3: archive → permanent image removal ───────────────────────────────────────
-- DB-first: delete live property_images rows (the Prompt-1 AFTER DELETE trigger enqueues
-- their R2 keys), then enqueue staged candidates. The image-policy bypass GUC is scoped
-- to just the delete and restored afterward so it can't leak to the rest of the txn.

CREATE OR REPLACE FUNCTION public.cleanup_images_on_archive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prev text;
BEGIN
  v_prev := current_setting('reeve.system_action', true);
  PERFORM set_config('reeve.system_action', 'photo_op', true);

  DELETE FROM public.property_images WHERE property_id = NEW.id;

  PERFORM set_config('reeve.system_action', COALESCE(v_prev, ''), true);

  PERFORM private.enqueue_property_staged_photos(NEW.id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.cleanup_images_on_archive() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cleanup_images_on_archive() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE TRIGGER cleanup_images_on_archive_trigger
  AFTER UPDATE ON public.properties
  FOR EACH ROW
  WHEN (NEW.status = 'archived' AND OLD.status IS DISTINCT FROM 'archived')
  EXECUTE FUNCTION public.cleanup_images_on_archive();

-- ── A4: hard-delete boundary ────────────────────────────────────────────────────
-- BEFORE DELETE so staged edit-request URLs are enqueued while their rows still exist
-- (property_edit_requests FK is ON DELETE CASCADE). Live images are covered by the
-- property_images FK cascade + Prompt-1 AFTER DELETE trigger. No-op for drafts today
-- (only hard-deletable status) but correct if hard-delete ever widens. Adds no delete
-- capability of its own.

CREATE OR REPLACE FUNCTION public.enqueue_images_before_property_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.enqueue_property_staged_photos(OLD.id);
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.enqueue_images_before_property_delete() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.enqueue_images_before_property_delete() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE TRIGGER enqueue_images_before_property_delete_trigger
  BEFORE DELETE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_images_before_property_delete();
