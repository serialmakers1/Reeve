-- SEC-001 — Restrict direct UPDATE on public.users and public.profiles.
--
-- PROBLEM
-- Both tables held a blanket TABLE-LEVEL UPDATE grant for anon and authenticated
-- (relacl: anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres). Combined with
-- the own-row RLS policies (users_update_own / profiles_update_own), any ordinary
-- authenticated user could bypass the UI and PATCH their own row directly through
-- PostgREST using the public publishable key plus their own session JWT.
--
-- The only compensating control, the prevent_user_privilege_escalation BEFORE UPDATE
-- trigger, guards just 5 of the 13 users columns (role, email_verified,
-- phone_verified, auth_provider, is_active) and does not cover profiles at all.
-- Protection was expressed as a deny-list in a trigger where it belongs as an
-- allow-list in the grants. Consequences: profiles.bio could be written with none
-- of validate_short_text's contact-detail filtering and is shown to the owner
-- before approval; users.phone / users.email could be forged and persist
-- indefinitely (handle_user_updated only fires on verification transitions).
--
-- ACL SHAPE (verified live before writing this migration)
-- Unlike 20260824000010 (anon SELECT on properties), where anon additionally held
-- 40 separate column-level grants, pg_attribute.attacl is NULL for EVERY column on
-- both of these tables. All effective UPDATE flows from the table-level grant
-- alone, so a table-level REVOKE fully clears it and NO column-level revoke step
-- is required here. This is intentional, not an oversight.
--
-- AFTER
--   anon           : no UPDATE on users, no UPDATE on profiles
--   authenticated  : no UPDATE on users; on profiles only the 6-column allow-list
--   service_role   : unchanged
--   postgres/owner : unchanged
--
-- The allow-list is exactly what the one legitimate direct-write feature needs:
-- the /profile Emergency Contact save (src/pages/Profile.tsx:337), plus is_public,
-- which is retained for regression safety pending a separate product decision on
-- profile visibility.
--
-- NOT CHANGED by this migration:
--   * RLS is untouched. users_update_own / profiles_update_own still confine writes
--     to the caller's own row; they were never the defect.
--   * prevent_user_privilege_escalation is deliberately RETAINED. It becomes
--     unreachable for browser roles once this migration applies, but it remains
--     correct defence-in-depth if a grant is ever restored.
--   * SELECT, INSERT and DELETE privileges on both tables.
--   * All trusted writers keep working — they are SECURITY DEFINER owned by
--     postgres (handle_user_updated, sync_verified_phone_from_auth,
--     touch_last_login, update_profile_bio) or run as service_role
--     (send-sms-otp / verify-phone-otp Edge Functions).
--
-- FORWARD-LOOKING
-- Any column added to public.profiles in future is NOT directly writable by
-- authenticated by default. A new browser-writable column requires an explicit
-- GRANT UPDATE (col) here, added by a later forward migration.

-- ── Step 1: Remove all direct UPDATE on public.users from browser roles ──────
--
-- The frontend performs ZERO writes to public.users (verified repo-wide: every
-- reference in src/ is a .select()). last_login_at continues to be written by the
-- touch_last_login() SECURITY DEFINER RPC, and phone/email/full_name by the auth
-- triggers and the phone-verification Edge Functions.

REVOKE UPDATE ON TABLE public.users FROM anon, authenticated;

-- ── Step 2: Remove broad direct UPDATE on public.profiles from browser roles ──

REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;

-- ── Step 3: Grant back only the approved authenticated allow-list ────────────
--
-- emergency_contact_* + updated_at: written together by the /profile Emergency
--   Contact save. profiles has no updated_at trigger, so the client must set it.
-- is_public: no UI currently writes it; retained deliberately so this security
--   migration cannot regress profile visibility if one is added.
--
-- Deliberately excluded (now closed to direct browser writes):
--   bio               — must go through update_profile_bio (validate_short_text)
--   display_name      — retired from the product 2026-07-19
--   profile_photo_url — sourced from the Google avatar by handle_user_updated
--   user_id, id       — row identity (already RLS-blocked; now grant-blocked too)
--   created_at        — system timestamp

GRANT UPDATE (
  emergency_contact_name,
  emergency_contact_phone,
  emergency_contact_email,
  emergency_contact_relationship,
  updated_at,
  is_public
)
ON TABLE public.profiles
TO authenticated;
