-- Phase 1 Commons: RLS policies, triggers, and function updates.
--
-- This migration bundles all cross-table policy + trigger work that depends on
-- the enum values (migration 1), new columns (migrations 2-3), and new tables
-- (migrations 4-6) being in place. Runs last in the Phase 1 sequence.
--
-- Contents (all idempotent — safe to re-run):
--   1. property_images_select_owner        — owner can see own uploads regardless of status
--   2. properties_select                   — widened to include edit_pending_review
--   3. property_activity_log RLS           — owner reads own; public reads is_public; admin reads all
--   4. property_edit_requests RLS          — owner reads/inserts own; admin reads all
--   5. owner_action_acknowledgments RLS    — owner reads/inserts/deletes own
--   6. handle_property_status_change       — updated to keep is_active=true on edit_pending_review
--   7. enforce_property_owner_transitions  — new BEFORE INSERT/UPDATE trigger validating owner status changes
--   8. property_activity_log_writer        — new AFTER INSERT/UPDATE trigger emitting log rows
--   9. handle_new_user / handle_user_updated — extended to populate profile_photo_url + display_name from Google
--
-- Trigger ordering note: Postgres fires BEFORE triggers alphabetically by name.
-- `enforce_property_owner_transitions_trigger` sorts before `handle_property_status_change`,
-- so validation runs first, then column mutation. AFTER triggers fire after the UPDATE,
-- so `property_activity_log_writer_trigger` observes the final row.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. property_images_select_owner
--    Fills the gap in property_images_select_public (which only covered listed+active).
--    Without this, owner uploads to a pending_review property render as "No photos".
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "property_images_select_owner" ON public.property_images;
CREATE POLICY "property_images_select_owner" ON public.property_images
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_images.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. properties_select — widen public visibility to include edit_pending_review.
--    edit_pending_review keeps the LIVE (unchanged) values visible while a pending
--    edit request holds the proposed values. Public search must show these.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "properties_select" ON public.properties;
CREATE POLICY "properties_select" ON public.properties
  AS PERMISSIVE FOR SELECT
  USING (
    (status IN ('listed'::property_status, 'edit_pending_review'::property_status) AND is_active = true)
    OR (owner_id = (SELECT auth.uid()))
    OR (SELECT is_admin())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. property_activity_log RLS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "activity_log_select_owner" ON public.property_activity_log;
CREATE POLICY "activity_log_select_owner" ON public.property_activity_log
  AS PERMISSIVE FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_activity_log.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "activity_log_select_public" ON public.property_activity_log;
CREATE POLICY "activity_log_select_public" ON public.property_activity_log
  AS PERMISSIVE FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "activity_log_select_admin" ON public.property_activity_log;
CREATE POLICY "activity_log_select_admin" ON public.property_activity_log
  AS PERMISSIVE FOR SELECT
  USING ((SELECT is_admin()));

-- No INSERT/UPDATE/DELETE policies: only service_role writes (via triggers + RPCs).

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. property_edit_requests RLS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "edit_requests_select_owner" ON public.property_edit_requests;
CREATE POLICY "edit_requests_select_owner" ON public.property_edit_requests
  AS PERMISSIVE FOR SELECT
  USING (owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "edit_requests_select_admin" ON public.property_edit_requests;
CREATE POLICY "edit_requests_select_admin" ON public.property_edit_requests
  AS PERMISSIVE FOR SELECT
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "edit_requests_insert_owner" ON public.property_edit_requests;
CREATE POLICY "edit_requests_insert_owner" ON public.property_edit_requests
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.properties
      WHERE properties.id = property_edit_requests.property_id
        AND properties.owner_id = (SELECT auth.uid())
    )
  );

-- UPDATE/DELETE: no owner policy. Supersede/approve/reject go through RPCs
-- that use service_role and enforce their own auth checks.

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. owner_action_acknowledgments RLS
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "acks_select_own" ON public.owner_action_acknowledgments;
CREATE POLICY "acks_select_own" ON public.owner_action_acknowledgments
  AS PERMISSIVE FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "acks_insert_own" ON public.owner_action_acknowledgments;
CREATE POLICY "acks_insert_own" ON public.owner_action_acknowledgments
  AS PERMISSIVE FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "acks_delete_own" ON public.owner_action_acknowledgments;
CREATE POLICY "acks_delete_own" ON public.owner_action_acknowledgments
  AS PERMISSIVE FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. handle_property_status_change — updated
--    Adds edit_pending_review to the "keep is_active=true" set.
--    Everything else preserved byte-identical to 20260425000004.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_property_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  -- When status changes to 'listed': make active and visible on search
  IF NEW.status = 'listed' AND OLD.status != 'listed' THEN
    NEW.is_active := true;
    IF NEW.listed_at IS NULL THEN
      NEW.listed_at := now();
    END IF;
  END IF;

  -- When status changes to 'edit_pending_review': keep active (live listing stays live).
  -- No listed_at change — the property was already listed_at at its original listing time.
  IF NEW.status = 'edit_pending_review' AND OLD.status != 'edit_pending_review' THEN
    NEW.is_active := true;
  END IF;

  -- When status changes to 'occupied': remove from search, record timestamp
  IF NEW.status = 'occupied' AND OLD.status != 'occupied' THEN
    NEW.is_active := false;
    IF NEW.occupied_at IS NULL THEN
      NEW.occupied_at := now();
    END IF;
    NEW.last_leased_at := now();
  END IF;

  -- When status changes away from 'listed' (off_market, inactive, unlisted, archived, etc): hide from search.
  -- edit_pending_review is EXCLUDED here — it keeps is_active=true (set above).
  IF OLD.status = 'listed' AND NEW.status NOT IN ('listed', 'occupied', 'edit_pending_review') THEN
    NEW.is_active := false;
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger itself unchanged from 20260425000004 setup (still enabled on properties).

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. enforce_property_owner_transitions — new BEFORE INSERT/UPDATE trigger.
--
--    Runs BEFORE handle_property_status_change (alphabetical: 'e' < 'h').
--    Validates:
--      - Draft cap of 20 per owner (D-101)
--      - Owner-initiated status transitions match the allowed matrix
--      - Required fields present before submitting for review (D-109)
--      - No field edits while in unlisted state (D-011)
--    Admin bypasses all checks via is_admin().
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_property_owner_transitions()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  photo_count integer;
  draft_count integer;
BEGIN
  -- Admin bypass
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  ----------------------------------------------------------------------------
  -- INSERT: enforce draft cap
  ----------------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'draft' THEN
      SELECT COUNT(*) INTO draft_count
        FROM public.properties
       WHERE owner_id = NEW.owner_id AND status = 'draft';
      IF draft_count >= 20 THEN
        RAISE EXCEPTION 'Draft limit reached: 20 properties in draft status per owner';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  ----------------------------------------------------------------------------
  -- UPDATE with status change: validate transition
  ----------------------------------------------------------------------------
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'draft'               AND NEW.status IN ('pending_review', 'archived'))
      OR (OLD.status = 'pending_review'   AND NEW.status IN ('draft', 'archived'))
      OR (OLD.status = 'changes_requested' AND NEW.status IN ('pending_review', 'archived'))
      OR (OLD.status = 'listed'           AND NEW.status IN ('edit_pending_review', 'unlisted', 'archived'))
      OR (OLD.status = 'edit_pending_review' AND NEW.status IN ('listed', 'archived'))
      OR (OLD.status = 'unlisted'         AND NEW.status IN ('listed', 'archived'))
    ) THEN
      RAISE EXCEPTION 'Owner cannot transition property from % to %', OLD.status, NEW.status;
    END IF;

    -- On → pending_review: required-fields + min-photos check.
    IF NEW.status = 'pending_review' THEN
      IF NEW.locality IS NULL
         OR NEW.building_name IS NULL
         OR NEW.bhk IS NULL
         OR NEW.listed_rent IS NULL
         OR NEW.security_deposit_amount IS NULL
         OR NEW.furnishing IS NULL
         OR NEW.available_from IS NULL
      THEN
        RAISE EXCEPTION 'Cannot submit for review: required fields missing (locality, building_name, bhk, listed_rent, security_deposit_amount, furnishing, available_from)';
      END IF;
      SELECT COUNT(*) INTO photo_count
        FROM public.property_images
       WHERE property_id = NEW.id;
      IF photo_count < 3 THEN
        RAISE EXCEPTION 'Cannot submit for review: at least 3 photos required';
      END IF;
    END IF;
  END IF;

  ----------------------------------------------------------------------------
  -- Block owner field edits while in unlisted state (no status change involved).
  ----------------------------------------------------------------------------
  IF OLD.status = 'unlisted' AND NEW.status = 'unlisted' THEN
    IF NEW.listed_rent               IS DISTINCT FROM OLD.listed_rent
       OR NEW.security_deposit_amount IS DISTINCT FROM OLD.security_deposit_amount
       OR NEW.security_deposit_months IS DISTINCT FROM OLD.security_deposit_months
       OR NEW.description             IS DISTINCT FROM OLD.description
       OR NEW.furnishing              IS DISTINCT FROM OLD.furnishing
       OR NEW.available_from          IS DISTINCT FROM OLD.available_from
       OR NEW.pet_policy              IS DISTINCT FROM OLD.pet_policy
       OR NEW.building_rules          IS DISTINCT FROM OLD.building_rules
       OR NEW.building_notes          IS DISTINCT FROM OLD.building_notes
       OR NEW.title                   IS DISTINCT FROM OLD.title
       OR NEW.amenities               IS DISTINCT FROM OLD.amenities
       OR NEW.furnishing_detail       IS DISTINCT FROM OLD.furnishing_detail
    THEN
      RAISE EXCEPTION 'Cannot edit properties in unlisted state — re-list first';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_property_owner_transitions_trigger ON public.properties;
CREATE TRIGGER enforce_property_owner_transitions_trigger
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.enforce_property_owner_transitions();

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. property_activity_log_writer — new AFTER INSERT/UPDATE trigger.
--    Emits one log row per status change. Marks is_public=true for curated events.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.property_activity_log_writer()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  actor_role_val text;
  action_val     text;
  is_public_val  boolean;
  summary_val    text;
BEGIN
  actor_role_val := CASE WHEN public.is_admin() THEN 'admin' ELSE 'owner' END;

  ----------------------------------------------------------------------------
  -- INSERT of a draft: first log entry.
  ----------------------------------------------------------------------------
  IF TG_OP = 'INSERT' AND NEW.status = 'draft' THEN
    INSERT INTO public.property_activity_log
      (property_id, actor_id, actor_role, action, payload, is_public)
    VALUES
      (NEW.id,
       (SELECT auth.uid()),
       actor_role_val,
       'listing_started',
       jsonb_build_object('summary', 'You started this listing'),
       false);
    RETURN NEW;
  END IF;

  ----------------------------------------------------------------------------
  -- UPDATE with status change: log the transition.
  ----------------------------------------------------------------------------
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Compute action label
    action_val := CASE NEW.status::text
      WHEN 'pending_review'      THEN 'listing_submitted'
      WHEN 'changes_requested'   THEN 'listing_rejected'
      WHEN 'listed'              THEN CASE OLD.status::text
                                        WHEN 'pending_review'      THEN 'listing_approved'
                                        WHEN 'edit_pending_review' THEN 'edit_resolved'
                                        WHEN 'unlisted'            THEN 'relisted'
                                        ELSE 'status_changed'
                                      END
      WHEN 'edit_pending_review' THEN 'edit_submitted'
      WHEN 'unlisted'            THEN 'unlisted'
      WHEN 'archived'            THEN 'archived'
      WHEN 'draft'               THEN CASE OLD.status::text
                                        WHEN 'pending_review' THEN 'listing_withdrawn'
                                        ELSE 'status_changed'
                                      END
      ELSE 'status_changed'
    END;

    -- Curated public events (D-081):
    --   listed (both first-time list and re-list)
    --   unlisted
    is_public_val := (NEW.status::text = 'listed' AND OLD.status::text IN ('pending_review','unlisted'))
                     OR NEW.status::text = 'unlisted';

    summary_val := 'Status changed from ' || OLD.status::text || ' to ' || NEW.status::text;

    INSERT INTO public.property_activity_log
      (property_id, actor_id, actor_role, action, payload, is_public)
    VALUES
      (NEW.id,
       (SELECT auth.uid()),
       actor_role_val,
       action_val,
       jsonb_build_object(
         'summary',      summary_val,
         'from_status',  OLD.status::text,
         'to_status',    NEW.status::text
       ),
       is_public_val);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS property_activity_log_writer_trigger ON public.properties;
CREATE TRIGGER property_activity_log_writer_trigger
  AFTER INSERT OR UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.property_activity_log_writer();

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. handle_new_user — extended to populate profile_photo_url + display_name.
--    Body preserved verbatim except the profiles INSERT is enriched with two
--    new columns pulled from raw_user_meta_data.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Only insert if email OR phone is already confirmed (prevents ghost users).
  IF NEW.email_confirmed_at IS NULL AND NEW.phone_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (
    id, email, phone, full_name, role,
    auth_provider, email_verified, phone_verified,
    is_active, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'::auth_provider
      WHEN NEW.phone IS NOT NULL                          THEN 'phone_otp'::auth_provider
      ELSE                                                     'email_otp'::auth_provider
    END,
    NEW.email_confirmed_at IS NOT NULL,
    NEW.phone_confirmed_at IS NOT NULL,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (
    user_id, is_foreign_citizen, kyc_verified,
    screening_opt_out, no_show_count,
    profile_photo_url, display_name,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
    false, false, false, 0,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    -- Refresh photo from Google if provided; otherwise keep existing.
    profile_photo_url = COALESCE(EXCLUDED.profile_photo_url, public.profiles.profile_photo_url),
    -- Preserve manual edits — only fill display_name if currently NULL.
    display_name      = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    updated_at        = NOW();

  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- handle_user_updated — same extension across both blocks (phone + Google).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_user_updated()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- ── Block 1: Phone OTP ──────────────────────────────────────────────────
  IF (OLD.phone_confirmed_at IS NULL AND NEW.phone_confirmed_at IS NOT NULL) THEN
    INSERT INTO public.users (
      id, phone, email, full_name, role,
      auth_provider, phone_verified, email_verified,
      is_active, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.phone, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'user',
      'phone_otp'::auth_provider,
      true,
      NEW.email_confirmed_at IS NOT NULL,
      true, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      phone          = EXCLUDED.phone,
      phone_verified = true,
      updated_at     = NOW();

    INSERT INTO public.profiles (
      user_id, is_foreign_citizen, kyc_verified,
      screening_opt_out, no_show_count,
      profile_photo_url, display_name,
      created_at, updated_at
    )
    VALUES (
      NEW.id, false, false, false, 0,
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      profile_photo_url = COALESCE(EXCLUDED.profile_photo_url, public.profiles.profile_photo_url),
      display_name      = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
      updated_at        = NOW();
  END IF;

  -- ── Block 2: Google OAuth ───────────────────────────────────────────────
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
    INSERT INTO public.users (
      id, phone, email, full_name, role,
      auth_provider, phone_verified, email_verified,
      is_active, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.phone, NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'user',
      CASE
        WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'::auth_provider
        WHEN NEW.phone IS NOT NULL                          THEN 'phone_otp'::auth_provider
        ELSE                                                     'email_otp'::auth_provider
      END,
      NEW.phone_confirmed_at IS NOT NULL,
      true, true, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email          = EXCLUDED.email,
      email_verified = true,
      updated_at     = NOW();

    INSERT INTO public.profiles (
      user_id, is_foreign_citizen, kyc_verified,
      screening_opt_out, no_show_count,
      profile_photo_url, display_name,
      created_at, updated_at
    )
    VALUES (
      NEW.id, false, false, false, 0,
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      profile_photo_url = COALESCE(EXCLUDED.profile_photo_url, public.profiles.profile_photo_url),
      display_name      = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
      updated_at        = NOW();
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification queries (run after migration):
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New policies exist:
--    SELECT policyname, tablename FROM pg_policies
--    WHERE policyname IN (
--      'property_images_select_owner',
--      'activity_log_select_owner','activity_log_select_public','activity_log_select_admin',
--      'edit_requests_select_owner','edit_requests_select_admin','edit_requests_insert_owner',
--      'acks_select_own','acks_insert_own','acks_delete_own'
--    );
--    Expected: 10 rows.
--
-- 2. properties_select widened:
--    SELECT qual FROM pg_policies WHERE policyname='properties_select';
--    Expected: contains "edit_pending_review".
--
-- 3. Triggers exist:
--    SELECT tgname FROM pg_trigger
--    WHERE tgname IN ('enforce_property_owner_transitions_trigger','property_activity_log_writer_trigger');
--    Expected: 2 rows.
--
-- 4. handle_property_status_change updated:
--    SELECT prosrc FROM pg_proc WHERE proname='handle_property_status_change';
--    Expected: contains "edit_pending_review".
--
-- 5. handle_new_user / handle_user_updated updated:
--    SELECT prosrc FROM pg_proc WHERE proname IN ('handle_new_user','handle_user_updated');
--    Expected: bodies contain "avatar_url" and "display_name".
