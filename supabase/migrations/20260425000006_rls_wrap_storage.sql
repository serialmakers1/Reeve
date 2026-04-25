-- Migration: R3 — wrap auth.uid() / is_admin() in storage.objects RLS policies
--
-- Wraps 4 tenant_docs_* policies on storage.objects so Postgres evaluates
-- auth.uid() and is_admin() once per query plan, not once per row.
--
-- Pattern: DROP + CREATE (not ALTER POLICY) for clean diff and idempotency.
-- Policy clauses (name, command, role, expressions) preserved byte-exactly
-- except for the (SELECT ...) wraps.
--
-- owner_docs_* policies were already dropped in a prior migration — not present
-- in DB, nothing to do here.
--
-- DOWN:
--   Recreate the four policies without (SELECT ...) wraps.

-- ── tenant_docs_admin_all ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_docs_admin_all" ON storage.objects;
CREATE POLICY "tenant_docs_admin_all" ON storage.objects
  AS PERMISSIVE FOR ALL
  USING (
    (bucket_id = 'tenant-documents'::text)
    AND (SELECT is_admin())
  )
  WITH CHECK (
    (bucket_id = 'tenant-documents'::text)
    AND (SELECT is_admin())
  );

-- ── tenant_docs_select_own ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_docs_select_own" ON storage.objects;
CREATE POLICY "tenant_docs_select_own" ON storage.objects
  AS PERMISSIVE FOR SELECT
  USING (
    (bucket_id = 'tenant-documents'::text)
    AND ((storage.foldername(name))[1] = ((SELECT auth.uid()))::text)
  );

-- ── tenant_docs_insert_own ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_docs_insert_own" ON storage.objects;
CREATE POLICY "tenant_docs_insert_own" ON storage.objects
  AS PERMISSIVE FOR INSERT
  WITH CHECK (
    (bucket_id = 'tenant-documents'::text)
    AND ((storage.foldername(name))[1] = ((SELECT auth.uid()))::text)
  );

-- ── tenant_docs_delete_own ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_docs_delete_own" ON storage.objects;
CREATE POLICY "tenant_docs_delete_own" ON storage.objects
  AS PERMISSIVE FOR DELETE
  USING (
    (bucket_id = 'tenant-documents'::text)
    AND ((storage.foldername(name))[1] = ((SELECT auth.uid()))::text)
  );

-- ── Verification ──────────────────────────────────────────────────────────────
-- Expected: 0 rows — no unwrapped auth.uid() in storage policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename  = 'objects'
  AND (
    qual       LIKE '%auth.uid()%' AND qual       NOT LIKE '%(select auth.uid())%' AND qual       NOT LIKE '%( SELECT auth.uid())%'
    OR
    with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(select auth.uid())%' AND with_check NOT LIKE '%( SELECT auth.uid())%'
    OR
    qual       LIKE '%is_admin()%' AND qual       NOT LIKE '%(select is_admin())%' AND qual       NOT LIKE '%( SELECT is_admin())%'
    OR
    with_check LIKE '%is_admin()%' AND with_check NOT LIKE '%(select is_admin())%' AND with_check NOT LIKE '%( SELECT is_admin())%'
  );

-- Expected: 4 rows — the four tenant_docs_* policies are present
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename  = 'objects'
  AND policyname LIKE 'tenant_docs_%'
ORDER BY policyname;
