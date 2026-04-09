-- Migration: Add handle_user_updated trigger for phone OTP user row creation
--
-- Root cause: handle_new_user fires on INSERT into auth.users (ON CONFLICT DO NOTHING).
-- Phone OTP login issues an UPDATE to auth.users (setting phone_confirmed_at) —
-- not an INSERT — so handle_new_user never fires and public.users never gets a row.
--
-- This migration adds an AFTER UPDATE trigger that fires when phone_confirmed_at
-- transitions from NULL to non-NULL and upserts the user into public.users.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Function: handle_user_updated
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_user_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only act when phone_confirmed_at transitions NULL → non-NULL
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
      phone        = EXCLUDED.phone,
      phone_verified = true,
      updated_at   = NOW();

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

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Trigger: on_auth_user_updated
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_updated();


-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (commented out — run manually to undo)
-- ─────────────────────────────────────────────────────────────────────────────
/*
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_user_updated();
*/
