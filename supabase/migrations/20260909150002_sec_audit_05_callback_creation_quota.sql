-- SEC-AUDIT-05 (part 3/3) — INV-2: server-side callback creation quota + authoritative time source.
--
-- ROOT CAUSE (confirmed against live state, read-only)
--   Callback creation is a direct authenticated INSERT with no server-side quota. INV-1
--   (one-active index) already bounds a user to one active row and — since regular users can
--   neither self-transition (UPDATE-own-pending forces status='pending') nor DELETE their rows
--   — cannot self-recycle today. INV-2 is defense-in-depth the product owner explicitly wants:
--   a per-user rolling quota that also holds if admins resolve rows, if a user-cancel flow is
--   added later, or if the active-status set changes.
--
-- POLICY (product-owner approved): at most 3 callbacks per rolling 24 hours per user.
--
-- TWO SUBTLE HAZARDS, BOTH ADDRESSED:
--   (a) BEFORE INSERT triggers run BEFORE the INSERT RLS WITH CHECK. A SECURITY DEFINER trigger
--       that locked/counted on NEW.user_id would be a cross-user side channel (lock/probe a
--       victim's quota before RLS rejects). The function is SECURITY INVOKER, derives identity
--       from auth.uid(), verifies NEW.user_id = auth.uid() BEFORE any lock/count, and uses the
--       DERIVED id (never NEW.user_id) for the lock key and the count. Invoker rights also make
--       the count RLS-scoped to the caller's own rows structurally.
--   (b) authenticated/anon hold column-level INSERT+UPDATE on created_at (default now() only
--       fills an omitted column), so a caller could backdate created_at to escape the window.
--       The INSERT trigger overwrites NEW.created_at := now() (authenticated path); a dedicated
--       BEFORE UPDATE trigger pins created_at := OLD.created_at for browser callers. The shared
--       update_updated_at_column() function is NOT touched.
--
-- Advisory lock: a plain SELECT-count trigger is race-prone under READ COMMITTED; a per-user
-- transaction advisory lock serializes same-user inserts. search_path is pinned explicitly to
-- keep function_search_path_mutable at zero (CLAUDE.md). Both functions are trigger-only and
-- REVOKEd from PUBLIC (not directly callable).

-- ─── INV-2: per-user rolling quota (BEFORE INSERT) ───────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_callback_creation_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid   uuid;
  v_count integer;
  v_limit  constant integer  := 3;
  v_window constant interval := interval '24 hours';
BEGIN
  v_uid := (SELECT auth.uid());

  -- Trusted/service context (no browser JWT): no browser quota, no created_at override.
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Never trust attacker-controlled NEW.user_id (this runs before the INSERT RLS WITH CHECK).
  -- Reject a spoofed identity WITHOUT locking or querying anyone's quota state.
  IF NEW.user_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Authoritative server creation timestamp: discard any caller-supplied created_at.
  NEW.created_at := now();

  -- Serialize concurrent inserts by this user so the count below is race-safe.
  PERFORM pg_advisory_xact_lock(hashtext('callback_quota:' || v_uid::text));

  SELECT count(*) INTO v_count
  FROM public.callback_requests
  WHERE user_id = v_uid
    AND created_at > now() - v_window;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'CALLBACK_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_callback_creation_quota() FROM PUBLIC;

CREATE TRIGGER trg_callback_requests_quota
  BEFORE INSERT ON public.callback_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_callback_creation_quota();

-- ─── created_at immutability for browser callers (BEFORE UPDATE) ──────────────
CREATE OR REPLACE FUNCTION public.pin_callback_created_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- created_at is a creation timestamp with no legitimate update path. Pin it for browser
  -- callers (auth.uid() present); leave trusted/service updates (auth.uid() IS NULL) free.
  IF (SELECT auth.uid()) IS NOT NULL THEN
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.pin_callback_created_at() FROM PUBLIC;

-- Name sorts before trg_callback_requests_updated_at ('p' < 'u'); different columns, so order
-- is irrelevant. BEFORE UPDATE only — no interaction with the BEFORE INSERT quota trigger.
CREATE TRIGGER trg_callback_requests_pin_created_at
  BEFORE UPDATE ON public.callback_requests
  FOR EACH ROW EXECUTE FUNCTION public.pin_callback_created_at();

-- ─── Fail loudly if anything is missing ──────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.callback_requests'::regclass
      AND tgname = 'trg_callback_requests_quota' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'SEC-AUDIT-05: quota trigger missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.callback_requests'::regclass
      AND tgname = 'trg_callback_requests_pin_created_at' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'SEC-AUDIT-05: created_at pin trigger missing';
  END IF;

  -- The shared updated_at trigger MUST still be present.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.callback_requests'::regclass
      AND tgname = 'trg_callback_requests_updated_at' AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'SEC-AUDIT-05: trg_callback_requests_updated_at unexpectedly missing';
  END IF;
END $$;
