-- SEC-AUDIT-01 — Bind property_images.url to its property's R2 namespace (defense-in-depth).
--
-- ROOT CAUSE (already confirmed against live state)
--   An ordinary authenticated owner could INSERT a property_images row for a property they
--   own whose `url` points at ANOTHER property's public R2 object, then use the legitimate
--   delete-property-image flow to physically delete that foreign object. The INSERT RLS
--   policy (property_images_insert) checks only property_id -> owner; nothing bound `url` to
--   `property_id`. The Edge Function fix (delete-property-image + r2ObjectKey.ts) closes the
--   destructive path; this constraint is the independent database boundary that stops a
--   malformed/foreign url from ever being stored in the first place.
--
-- INVARIANT (identical predicate to the shared Edge validator getOwnedR2ObjectKey())
--   url MUST equal:
--     https://images.reeve.in/properties/<this row's property_id>/photos/<object>
--   where <object> is Reeve's canonical server-generated key shape:
--     <Date.now() digits>-<crypto.randomUUID()>.<ext>
--   i.e. [0-9]+-<8-4-4-4-12 hex>.<alphanumeric ext>. Extension is intentionally open (no
--   jpg/png/webp allow-list) so future formats work; every other character — extra path
--   segments, '.'/'..', percent-encoding, backslashes, query strings, fragments — is rejected.
--   This is a SAME-ROW rule (references property_id and url of the same row only).
--
-- WHY A CHECK CONSTRAINT
--   Simplest reliable same-row enforcement (CLAUDE.md: "Prefer the simplest reliable same-row
--   enforcement"). Applies to INSERT and UPDATE, for owners and admins alike, and needs no
--   trigger. url never legitimately changes after insert (the BEFORE UPDATE image-policy
--   trigger already blocks url edits on live listings), so UPDATE coverage is harmless.
--
-- EXISTING DATA
--   Verified read-only before authoring: 8 property_images rows, all already canonical, 0
--   violations. The guard DO block below re-checks at apply time and FAILS LOUDLY (whole
--   migration aborts, nothing applied) if any row would violate the constraint — so the
--   validating ADD CONSTRAINT can never partially apply over dirty data.
--
-- NOT CHANGED
--   RLS policies, grants (table/column), indexes, triggers, functions, other columns
--   (thumbnail_url is always null on insert and is never used for R2 deletion), schema, and
--   all image upload/delete/edit-review/cleanup behaviour. No generated-type shape change (a
--   CHECK constraint does not alter column/nullability), so src/integrations/supabase/types.ts
--   is unaffected and is NOT regenerated. No CASCADE.
--
-- RECOVERY
--   Deployed migrations are immutable. If this constraint is ever found to reject a legitimate
--   historical url shape, ship a NEW forward migration that DROPs and re-adds the constraint
--   with a corrected predicate. No data rewrite is anticipated.

-- ── Guard: abort loudly if any existing row would violate the new invariant ──────────
DO $$
DECLARE
  v_violations bigint;
BEGIN
  SELECT count(*)
    INTO v_violations
    FROM public.property_images
   WHERE url !~ (
     '^https://images\.reeve\.in/properties/'
       || property_id::text
       || '/photos/[0-9]+-[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\.[A-Za-z0-9]+$'
   );

  IF v_violations > 0 THEN
    RAISE EXCEPTION
      'SEC-AUDIT-01: % property_images row(s) violate the canonical url<->property binding; remediate before applying this constraint', v_violations;
  END IF;
END;
$$;

-- ── Constraint: canonical url <-> property_id binding (validated immediately) ─────────
ALTER TABLE public.property_images
  ADD CONSTRAINT property_images_url_property_binding
  CHECK (
    url ~ (
      '^https://images\.reeve\.in/properties/'
        || property_id::text
        || '/photos/[0-9]+-[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\.[A-Za-z0-9]+$'
    )
  );
