-- Migration: Extend handle_user_updated to handle Google OAuth users
--
-- Root cause: For Google OAuth sign-in, Supabase creates auth.users with
-- email_confirmed_at NULL, then UPDATEs it to set email_confirmed_at.
-- The existing trigger only watches phone_confirmed_at, so Google OAuth
-- users never get a public.users row from the UPDATE trigger.
--
-- This migration adds a second IF block to handle the
-- email_confirmed_at NULL → non-NULL transition.

CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- ── Block 1: Phone OTP ─────────────────────────────────────────────────────
  -- Fires when phone_confirmed_at transitions NULL → non-NULL
  IF (OLD.phone_confirmed_at IS NULL AND NEW.phone_confirmed_at IS NOT NULL) THEN
    INSERT INTO public.users (
      id, phone, email, full_name, role,
      auth_provider, phone_verified, email_verified,
      is_active, created_at, updated_at
    )
    VALUES (
      NEW.id,
      NEW.phone,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'user',
      'phone_otp'::auth_provider,
      true,
      NEW.email_confirmed_at IS NOT NULL,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      phone          = EXCLUDED.phone,
      phone_verified = true,
      updated_at     = NOW();

    INSERT INTO public.profiles (
      user_id, is_foreign_citizen, kyc_verified,
      screening_opt_out, no_show_count, created_at, updated_at
    )
    VALUES (
      NEW.id, false, false, false, 0, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- ── Block 2: Google OAuth ──────────────────────────────────────────────────
  -- Fires when email_confirmed_at transitions NULL → non-NULL.
  -- Google OAuth: Supabase sets email_confirmed_at on the update after creation.
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
    INSERT INTO public.users (
      id, phone, email, full_name, role,
      auth_provider, phone_verified, email_verified,
      is_active, created_at, updated_at
    )
    VALUES (
      NEW.id,
      NEW.phone,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'user',
      CASE
        WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'google'::auth_provider
        WHEN NEW.phone IS NOT NULL                          THEN 'phone_otp'::auth_provider
        ELSE                                                     'email_otp'::auth_provider
      END,
      NEW.phone_confirmed_at IS NOT NULL,
      true,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email          = EXCLUDED.email,
      email_verified = true,
      updated_at     = NOW();

    INSERT INTO public.profiles (
      user_id, is_foreign_citizen, kyc_verified,
      screening_opt_out, no_show_count, created_at, updated_at
    )
    VALUES (
      NEW.id, false, false, false, 0, NOW(), NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists from previous migration — no need to recreate.
-- DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
-- CREATE TRIGGER on_auth_user_updated
--   AFTER UPDATE ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_user_updated();


-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (commented out — run manually to undo)
-- ─────────────────────────────────────────────────────────────────────────────
/*
-- Revert to phone_confirmed_at-only version:
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF (OLD.phone_confirmed_at IS NULL AND NEW.phone_confirmed_at IS NOT NULL) THEN
    INSERT INTO public.users (id, phone, email, full_name, role, auth_provider, phone_verified, email_verified, is_active, created_at, updated_at)
    VALUES (NEW.id, NEW.phone, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'user', 'phone_otp'::auth_provider, true, NEW.email_confirmed_at IS NOT NULL, true, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, phone_verified = true, updated_at = NOW();
    INSERT INTO public.profiles (user_id, is_foreign_citizen, kyc_verified, screening_opt_out, no_show_count, created_at, updated_at)
    VALUES (NEW.id, false, false, false, 0, NOW(), NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
*/
