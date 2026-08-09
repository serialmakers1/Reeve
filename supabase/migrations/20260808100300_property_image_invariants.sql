-- M4 — property_images invariants for the risk-based model.
--
--  * BEFORE INSERT/UPDATE/DELETE guard: non-admin/non-GUC owners cannot directly
--    insert/delete images on a non-draft listing, cannot move an image between properties,
--    and on a live listing may only change sort_order (guarded-instant reorder). New photos
--    on a live listing therefore flow through staged upload + review; cover/delete go via RPCs.
--  * set_primary_property_photo / delete_property_photo: self-authorizing SECURITY DEFINER
--    RPCs (owner status-gated; admin unrestricted; min-3 owner-only; atomic cover promotion).
--    They SET LOCAL reeve.system_action after authz so the guard permits their own writes.
--  * Partial unique index → at most one primary per property.
--  * enforce_single_primary_on_publish: exactly one primary required on → pending_review
--    (complements the existing min-3 check in enforce_property_owner_transitions).
--
-- Reversible: DROP objects listed at the bottom.

BEGIN;

-- ── Dedupe any pre-existing multi-primary rows so the unique index can build ──
UPDATE public.property_images pi SET is_primary = false
WHERE is_primary
  AND id <> (
    SELECT id FROM public.property_images x
    WHERE x.property_id = pi.property_id AND x.is_primary
    ORDER BY x.sort_order ASC, x.created_at ASC
    LIMIT 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS uniq_property_images_one_primary
  ON public.property_images (property_id) WHERE is_primary;

-- ── Guard trigger ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_property_image_policy()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_status_new property_status;
  v_status_old property_status;
BEGIN
  -- Admin + trusted-RPC (GUC) exempt.
  IF public.is_admin() OR COALESCE(current_setting('reeve.system_action', true), '') <> '' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT status INTO v_status_new FROM public.properties WHERE id = NEW.property_id;
    IF v_status_new IN ('pending_review','listed','edit_pending_review','unlisted','archived') THEN
      RAISE EXCEPTION 'New photos on a % listing must go through review', v_status_new;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status_old FROM public.properties WHERE id = OLD.property_id;
    IF v_status_old IN ('pending_review','listed','edit_pending_review','unlisted','archived') THEN
      RAISE EXCEPTION 'Use delete_property_photo to remove photos from a % listing', v_status_old;
    END IF;
    RETURN OLD;

  ELSE -- UPDATE
    IF OLD.property_id IS DISTINCT FROM NEW.property_id THEN
      RAISE EXCEPTION 'Cannot move an image between properties';
    END IF;
    SELECT status INTO v_status_old FROM public.properties WHERE id = OLD.property_id;
    IF v_status_old IN ('listed','edit_pending_review') THEN
      -- Guarded-instant reorder: only sort_order may change directly.
      IF NEW.url IS DISTINCT FROM OLD.url
         OR NEW.thumbnail_url IS DISTINCT FROM OLD.thumbnail_url
         OR NEW.caption IS DISTINCT FROM OLD.caption
         OR NEW.is_floor_plan IS DISTINCT FROM OLD.is_floor_plan
         OR NEW.is_primary IS DISTINCT FROM OLD.is_primary
         OR NEW.section IS DISTINCT FROM OLD.section
         OR NEW.uploaded_by IS DISTINCT FROM OLD.uploaded_by
      THEN
        RAISE EXCEPTION 'On a live listing only photo order may change directly; use set_primary_property_photo for the cover';
      END IF;
      RETURN NEW;
    ELSIF v_status_old IN ('pending_review','unlisted','archived') THEN
      RAISE EXCEPTION 'Photos are frozen in % status', v_status_old;
    END IF;
    RETURN NEW; -- draft / changes_requested
  END IF;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_property_image_policy_trigger ON public.property_images;
CREATE TRIGGER enforce_property_image_policy_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.property_images
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_image_policy();

-- ── set_primary_property_photo ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_primary_property_photo(p_image_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_caller   uuid := (SELECT auth.uid());
  v_prop_id  uuid;
  v_owner    uuid;
  v_status   property_status;
  v_is_admin boolean := public.is_admin();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT pi.property_id, p.owner_id, p.status
    INTO v_prop_id, v_owner, v_status
    FROM public.property_images pi
    JOIN public.properties p ON p.id = pi.property_id
   WHERE pi.id = p_image_id
   FOR UPDATE OF p;
  IF v_prop_id IS NULL THEN RAISE EXCEPTION 'Image not found'; END IF;

  IF v_owner <> v_caller AND NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT v_is_admin AND v_status NOT IN ('listed','edit_pending_review') THEN
    RAISE EXCEPTION 'Cover changes are not allowed in % status', v_status;
  END IF;

  -- Authorized → trusted mutation.
  PERFORM set_config('reeve.system_action', 'photo_op', true);
  UPDATE public.property_images SET is_primary = false
    WHERE property_id = v_prop_id AND is_primary AND id <> p_image_id;
  UPDATE public.property_images SET is_primary = true WHERE id = p_image_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.set_primary_property_photo(uuid) TO authenticated;

-- ── delete_property_photo ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_property_photo(p_image_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_caller     uuid := (SELECT auth.uid());
  v_prop_id    uuid;
  v_owner      uuid;
  v_status     property_status;
  v_is_admin   boolean := public.is_admin();
  v_was_primary boolean;
  v_total      integer;
  v_next_id    uuid;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT pi.property_id, p.owner_id, p.status, pi.is_primary
    INTO v_prop_id, v_owner, v_status, v_was_primary
    FROM public.property_images pi
    JOIN public.properties p ON p.id = pi.property_id
   WHERE pi.id = p_image_id
   FOR UPDATE OF p;
  IF v_prop_id IS NULL THEN RAISE EXCEPTION 'Image not found'; END IF;

  IF v_owner <> v_caller AND NOT v_is_admin THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF NOT v_is_admin AND v_status NOT IN ('listed','edit_pending_review') THEN
    RAISE EXCEPTION 'Photo deletion is not allowed in % status', v_status;
  END IF;

  -- Owner-only min-3 (admins may delete below 3 for corrections).
  SELECT COUNT(*) INTO v_total FROM public.property_images WHERE property_id = v_prop_id;
  IF NOT v_is_admin AND (v_total - 1) < 3 THEN
    RAISE EXCEPTION 'At least 3 photos required — cannot delete';
  END IF;

  PERFORM set_config('reeve.system_action', 'photo_op', true);
  DELETE FROM public.property_images WHERE id = p_image_id;

  -- Atomic cover promotion if we removed the primary and any remain.
  IF v_was_primary THEN
    SELECT id INTO v_next_id FROM public.property_images
      WHERE property_id = v_prop_id
      ORDER BY sort_order ASC, created_at ASC
      LIMIT 1;
    IF v_next_id IS NOT NULL THEN
      UPDATE public.property_images SET is_primary = true WHERE id = v_next_id;
    END IF;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_property_photo(uuid) TO authenticated;

-- ── Exactly-one-primary net on → pending_review (complements min-3) ───────────
CREATE OR REPLACE FUNCTION public.enforce_single_primary_on_publish()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_primaries integer;
BEGIN
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF NEW.status = 'pending_review' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT COUNT(*) INTO v_primaries FROM public.property_images
     WHERE property_id = NEW.id AND is_primary;
    IF v_primaries <> 1 THEN
      RAISE EXCEPTION 'Exactly one cover photo is required before submitting for review (found %)', v_primaries;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_single_primary_on_publish_trigger ON public.properties;
CREATE TRIGGER enforce_single_primary_on_publish_trigger
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_primary_on_publish();

COMMIT;

-- Rollback:
--   DROP TRIGGER IF EXISTS enforce_single_primary_on_publish_trigger ON public.properties;
--   DROP FUNCTION IF EXISTS public.enforce_single_primary_on_publish();
--   DROP FUNCTION IF EXISTS public.delete_property_photo(uuid);
--   DROP FUNCTION IF EXISTS public.set_primary_property_photo(uuid);
--   DROP TRIGGER IF EXISTS enforce_property_image_policy_trigger ON public.property_images;
--   DROP FUNCTION IF EXISTS public.enforce_property_image_policy();
--   DROP INDEX IF EXISTS public.uniq_property_images_one_primary;
