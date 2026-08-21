-- Step 6B.2: Supabase Hygiene Cleanup
-- Removes: 21 dead profiles columns, dead auth-trigger INSERT fields,
-- trg_no_show_limit trigger, check_no_show_limit() + ensure_user_exists() functions,
-- owner_bank_details + external_queries tables, 7 dead enum types,
-- expire-stale-applications cron job, 4 tenant-documents storage policies.
--
-- No CASCADE anywhere. Fail-closed guards run first.
-- Sections C + D (handle_new_user / handle_user_updated rewrites) are
-- populated from live pg_get_functiondef output — see plan for retrieval query.

-- ── A. Fail-closed safety guards ─────────────────────────────────────────────
-- ALL checks run before any destructive change. Any non-default data aborts.

DO $$ DECLARE v int;
BEGIN
  -- Legacy defaulted booleans: allow NULL or known default false only
  SELECT COUNT(*) INTO v FROM public.profiles WHERE is_foreign_citizen IS NOT NULL AND is_foreign_citizen <> false;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.is_foreign_citizen has non-default data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE kyc_verified IS NOT NULL AND kyc_verified <> false;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.kyc_verified has non-default data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE screening_opt_out IS NOT NULL AND screening_opt_out <> false;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.screening_opt_out has non-default data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE visit_priority_low IS NOT NULL AND visit_priority_low <> false;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.visit_priority_low has non-default data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE visit_scheduling_blocked IS NOT NULL AND visit_scheduling_blocked <> false;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.visit_scheduling_blocked has non-default data (% rows)', v; END IF;

  -- no_show_count: allow NULL or 0 only
  SELECT COUNT(*) INTO v FROM public.profiles WHERE no_show_count IS NOT NULL AND no_show_count <> 0;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.no_show_count has non-zero data (% rows)', v; END IF;

  -- Remaining nullable fields: abort on any non-NULL value
  SELECT COUNT(*) INTO v FROM public.profiles WHERE kyc_verified_at IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.kyc_verified_at has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE admin_notes IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.admin_notes has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE date_of_birth IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.date_of_birth has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE gender IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.gender has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE occupation IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.occupation has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE marital_status IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.marital_status has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE diet IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.diet has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE has_pets IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.has_pets has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE pet_details IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.pet_details has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE aadhaar_number IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.aadhaar_number has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE aadhaar_last4 IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.aadhaar_last4 has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE pan_number IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.pan_number has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE bank_account_number IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.bank_account_number has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE bank_ifsc IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.bank_ifsc has live data (% rows)', v; END IF;

  SELECT COUNT(*) INTO v FROM public.profiles WHERE bank_account_name IS NOT NULL;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: profiles.bank_account_name has live data (% rows)', v; END IF;

  -- owner_bank_details must be empty
  SELECT COUNT(*) INTO v FROM public.owner_bank_details;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: owner_bank_details has % live rows', v; END IF;

  -- external_queries must be empty
  SELECT COUNT(*) INTO v FROM public.external_queries;
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: external_queries has % live rows', v; END IF;

  -- tenant-documents bucket must be empty
  SELECT COUNT(*) INTO v FROM storage.objects WHERE bucket_id = 'tenant-documents';
  IF v > 0 THEN RAISE EXCEPTION 'Step 6B.2 aborted: tenant-documents bucket has % objects', v; END IF;
END $$;

-- ── B. Drop trg_no_show_limit trigger ─────────────────────────────────────────
-- Must precede column drop: trigger reads NEW.no_show_count.

DROP TRIGGER IF EXISTS trg_no_show_limit ON public.profiles;

-- ── C. Rewrite handle_new_user() ──────────────────────────────────────────────
-- Source: live pg_get_functiondef('public.handle_new_user()'::regprocedure)
-- Change: removed is_foreign_citizen, kyc_verified, screening_opt_out, no_show_count
--         from the profiles INSERT column list and false, false, false, 0 from VALUES.
-- Every other line is byte-for-byte identical to the live definition.

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
    user_id,
    profile_photo_url, display_name,
    created_at, updated_at
  )
  VALUES (
    NEW.id,
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

-- ── D. Rewrite handle_user_updated() ─────────────────────────────────────────
-- Source: live pg_get_functiondef('public.handle_user_updated()'::regprocedure)
-- Change: in BOTH profiles INSERT blocks, removed is_foreign_citizen, kyc_verified,
--         screening_opt_out, no_show_count from the column list and
--         false, false, false, 0 from the VALUES list.
-- Every other line is byte-for-byte identical to the live definition.

CREATE OR REPLACE FUNCTION public.handle_user_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_google_email text;
  v_google_name  text;
  v_final_email  text;
  v_final_name   text;
BEGIN
  -- ── Block 1: Phone OTP verification (phone_confirmed_at NULL → not-null) ──
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
      user_id,
      profile_photo_url, display_name,
      created_at, updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      NOW(), NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      profile_photo_url = COALESCE(EXCLUDED.profile_photo_url, public.profiles.profile_photo_url),
      display_name      = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
      updated_at        = NOW();
  END IF;

  -- ── Block 2: Email verification (email_confirmed_at NULL → not-null) ──
  -- Fires on Google OAuth signup or linkIdentity('google').
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
    -- Source authoritative email + name from the Google identity row.
    SELECT
      NULLIF(i.identity_data->>'email', ''),
      COALESCE(NULLIF(i.identity_data->>'full_name', ''), NULLIF(i.identity_data->>'name', ''))
    INTO v_google_email, v_google_name
    FROM auth.identities i
    WHERE i.user_id = NEW.id AND i.provider = 'google'
    ORDER BY i.created_at DESC
    LIMIT 1;

    v_final_email := COALESCE(NULLIF(NEW.email, ''), v_google_email);
    v_final_name  := COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      v_google_name
    );

    INSERT INTO public.users (
      id, phone, email, full_name, role,
      auth_provider, phone_verified, email_verified,
      is_active, created_at, updated_at
    )
    VALUES (
      NEW.id, NEW.phone, v_final_email,
      COALESCE(v_final_name, ''),
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
      -- Never clobber an existing good email with NULL.
      email          = COALESCE(EXCLUDED.email, public.users.email),
      email_verified = true,
      -- Product rule: name comes from Google. Take Google's value when we have one;
      -- otherwise preserve whatever exists.
      full_name      = COALESCE(EXCLUDED.full_name, public.users.full_name),
      updated_at     = NOW();

    INSERT INTO public.profiles (
      user_id,
      profile_photo_url, display_name,
      created_at, updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
      v_final_name,
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

-- ── E. DROP 21 dead profiles columns ──────────────────────────────────────────

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS is_foreign_citizen,
  DROP COLUMN IF EXISTS kyc_verified,
  DROP COLUMN IF EXISTS screening_opt_out,
  DROP COLUMN IF EXISTS no_show_count,
  DROP COLUMN IF EXISTS visit_scheduling_blocked,
  DROP COLUMN IF EXISTS kyc_verified_at,
  DROP COLUMN IF EXISTS visit_priority_low,
  DROP COLUMN IF EXISTS admin_notes,
  DROP COLUMN IF EXISTS date_of_birth,
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS occupation,
  DROP COLUMN IF EXISTS marital_status,
  DROP COLUMN IF EXISTS diet,
  DROP COLUMN IF EXISTS has_pets,
  DROP COLUMN IF EXISTS pet_details,
  DROP COLUMN IF EXISTS aadhaar_number,
  DROP COLUMN IF EXISTS aadhaar_last4,
  DROP COLUMN IF EXISTS pan_number,
  DROP COLUMN IF EXISTS bank_account_number,
  DROP COLUMN IF EXISTS bank_ifsc,
  DROP COLUMN IF EXISTS bank_account_name;

-- ── F. DROP dead functions ────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.check_no_show_limit();
DROP FUNCTION IF EXISTS public.ensure_user_exists();

-- ── G. DROP owner_bank_details table ─────────────────────────────────────────
-- Row guard confirmed empty in Section A.

DROP TABLE IF EXISTS public.owner_bank_details;

-- ── H. DROP external_queries table ───────────────────────────────────────────
-- Row guard confirmed empty in Section A.

DROP TABLE IF EXISTS public.external_queries;

-- ── I. DROP 7 dead enum types ─────────────────────────────────────────────────
-- All dependent columns dropped in E; dependent tables dropped in G + H.
-- No CASCADE: unexpected surviving dependency will fail the migration safely.

DROP TYPE IF EXISTS public.gender_type;
DROP TYPE IF EXISTS public.occupation_type;
DROP TYPE IF EXISTS public.marital_status;
DROP TYPE IF EXISTS public.diet_type;
DROP TYPE IF EXISTS public.damage_severity;
DROP TYPE IF EXISTS public.external_query_category;
DROP TYPE IF EXISTS public.external_query_status;

-- ── J. Unschedule expire-stale-applications cron ─────────────────────────────
-- Created via Supabase Dashboard; not in any migration. Query by name, unschedule
-- by jobid so real errors surface instead of being swallowed.

DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'expire-stale-applications';
  IF FOUND THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

-- ── K. DROP 4 storage policies on storage.objects ─────────────────────────────
-- Source: 20260425000006_rls_wrap_storage.sql

DROP POLICY IF EXISTS tenant_docs_admin_all   ON storage.objects;
DROP POLICY IF EXISTS tenant_docs_select_own  ON storage.objects;
DROP POLICY IF EXISTS tenant_docs_insert_own  ON storage.objects;
DROP POLICY IF EXISTS tenant_docs_delete_own  ON storage.objects;
