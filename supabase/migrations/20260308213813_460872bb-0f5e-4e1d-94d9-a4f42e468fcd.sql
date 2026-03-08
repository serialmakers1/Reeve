
-- Fix search_path for get_user_role
CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid()
$$;

-- Fix search_path for is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role::text IN ('admin', 'super_admin')
  )
$$;

-- Fix search_path for is_property_owner
CREATE OR REPLACE FUNCTION public.is_property_owner(prop_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = prop_id AND owner_id = auth.uid()
  )
$$;

-- Fix search_path for handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_provider auth_provider;
BEGIN
  IF NEW.phone IS NOT NULL THEN
    v_provider := 'phone_otp';
  ELSIF NEW.app_metadata->>'provider' = 'google' THEN
    v_provider := 'google';
  ELSE
    v_provider := 'email_otp';
  END IF;

  INSERT INTO public.users (
    id, phone, email, full_name, role,
    auth_provider, phone_verified, email_verified,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'tenant',
    v_provider,
    COALESCE(NEW.phone_confirmed_at IS NOT NULL, false),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Fix search_path for check_eligibility_before_visit
CREATE OR REPLACE FUNCTION public.check_eligibility_before_visit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM eligibility
    WHERE user_id = NEW.tenant_id
    AND status = 'passed'
  ) THEN
    RAISE EXCEPTION 'Tenant has not passed eligibility check';
  END IF;
  RETURN NEW;
END;
$function$;
