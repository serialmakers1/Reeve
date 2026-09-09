-- SEC-AUDIT-03: prevent browser self-assignment of privileged public.users roles.
--
-- Root cause: public.users INSERT is authorized only by `users_insert_own`, whose
-- WITH CHECK bound identity alone (id = auth.uid()) and never constrained `role`.
-- The prevent_user_privilege_escalation trigger fires BEFORE UPDATE only, so a browser
-- (`authenticated`/`anon`) caller with no existing row could self-INSERT role='admin'
-- and thereafter satisfy is_admin(). Anonymous sign-in is OFF and phone/Google profile
-- creation is atomic with the session, so this is a latent weakness rather than a proven
-- active exploit — but the capability is one Reeve never intends to grant.
--
-- Invariant enforced: a browser-created self profile row may only carry role='user'.
-- Trigger-owned profile creation (handle_new_user / handle_user_updated) is SECURITY
-- DEFINER owned by postgres and bypasses RLS, so it is unaffected. Trusted admin
-- assignment via service_role/postgres (normally an UPDATE of an existing row) is
-- likewise unaffected. `users_insert_own` is the sole permissive INSERT policy, so no
-- OR-composition can reopen the path; the id = auth.uid() half continues to block anon.
--
-- Forward-only, single-purpose: policy predicate change only. No data mutation, no grant/
-- trigger/enum/Auth changes.

ALTER POLICY users_insert_own ON public.users
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = 'user'::user_role
  );
