-- Migration: Phone OTP auth support
-- Drop onboarding_completed column, fix handle_new_user trigger for phone OTP,
-- remove onboarding_completed from ensure_user_exists.
--
-- Order is intentional:
--   1. handle_new_user  — remove onboarding_completed from INSERT, add phone guard
--   2. ensure_user_exists — remove onboarding_completed from INSERT
--   3. DROP COLUMN — safe now that neither function references it
--
-- If DROP COLUMN ran first, the CREATE OR REPLACE calls above would reference
-- a non-existent column and fail at next execution.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. handle_new_user — extend guard for phone OTP, drop onboarding_completed
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- CRITICAL: Only insert if email OR phone is already confirmed.
  -- This prevents ghost users from OTP requests that are never verified.
  -- The frontend ensure_user_exists() RPC handles row creation after
  -- email OTP verification. Phone OTP sets phone_confirmed_at on verify.
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
      WHEN NEW.phone IS NOT NULL THEN 'phone_otp'::auth_provider
      ELSE 'email_otp'::auth_provider
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
    screening_opt_out, no_show_count, created_at, updated_at
  )
  VALUES (
    NEW.id, false, false, false, 0, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ensure_user_exists — drop onboarding_completed from INSERT
--    All other logic (ON CONFLICT DO UPDATE, profiles insert) unchanged.
--    This function is kept in DB but must not be called from frontend code.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_user_exists()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (
    id, email, phone, full_name, role,
    auth_provider, email_verified, phone_verified,
    is_active, created_at, updated_at
  )
  VALUES (
    auth.uid(),
    auth.email(),
    NULL,
    '',
    'user',
    CASE
      WHEN (auth.jwt()->>'app_metadata')::jsonb->>'provider' = 'google' THEN 'google'::auth_provider
      ELSE 'email_otp'::auth_provider
    END,
    true, -- always true: RPC only called after OTP verified
    false,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email_verified = true,
    role = CASE
      WHEN public.users.role::text IN ('tenant', 'owner') THEN 'user'::user_role
      ELSE public.users.role
    END,
    updated_at = NOW();

  -- Create profile row if it doesn't exist
  INSERT INTO public.profiles (
    user_id, is_foreign_citizen, kyc_verified,
    screening_opt_out, no_show_count, created_at, updated_at
  )
  VALUES (
    auth.uid(), false, false, false, 0, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Drop onboarding_completed column — safe now that both functions are updated
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users DROP COLUMN onboarding_completed;


-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (commented out — run manually to undo this migration)
-- ─────────────────────────────────────────────────────────────────────────────
/*

-- Step 3 rollback: re-add the column (data is lost — set a safe default)
ALTER TABLE public.users ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

-- Step 2 rollback: restore ensure_user_exists with onboarding_completed
CREATE OR REPLACE FUNCTION public.ensure_user_exists()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.users (
    id, email, phone, full_name, role,
    auth_provider, email_verified, phone_verified,
    is_active, onboarding_completed, created_at, updated_at
  )
  VALUES (
    auth.uid(),
    auth.email(),
    NULL,
    '',
    'user',
    CASE
      WHEN (auth.jwt()->>'app_metadata')::jsonb->>'provider' = 'google' THEN 'google'::auth_provider
      ELSE 'email_otp'::auth_provider
    END,
    true,
    false,
    true,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email_verified = true,
    role = CASE
      WHEN public.users.role::text IN ('tenant', 'owner') THEN 'user'::user_role
      ELSE public.users.role
    END,
    updated_at = NOW();

  INSERT INTO public.profiles (
    user_id, is_foreign_citizen, kyc_verified,
    screening_opt_out, no_show_count, created_at, updated_at
  )
  VALUES (
    auth.uid(), false, false, false, 0, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

-- Step 1 rollback: restore handle_new_user with email-only guard and onboarding_completed
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.users (
    id, email, phone, full_name, role,
    auth_provider, email_verified, phone_verified,
    is_active, onboarding_completed, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    CASE
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'::auth_provider
      WHEN NEW.phone IS NOT NULL THEN 'phone_otp'::auth_provider
      ELSE 'email_otp'::auth_provider
    END,
    NEW.email_confirmed_at IS NOT NULL,
    NEW.phone_confirmed_at IS NOT NULL,
    true,
    false,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (
    user_id, is_foreign_citizen, kyc_verified,
    screening_opt_out, no_show_count, created_at, updated_at
  )
  VALUES (
    NEW.id, false, false, false, 0, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

*/
