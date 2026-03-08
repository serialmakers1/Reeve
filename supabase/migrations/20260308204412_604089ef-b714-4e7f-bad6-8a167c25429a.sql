
-- Create private storage bucket for tenant KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own documents
CREATE POLICY "tenant_docs_insert_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tenant-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to read their own documents
CREATE POLICY "tenant_docs_select_own" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'tenant-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own documents
CREATE POLICY "tenant_docs_delete_own" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'tenant-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins full access
CREATE POLICY "tenant_docs_admin_all" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'tenant-documents'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'tenant-documents'
  AND public.is_admin()
);
