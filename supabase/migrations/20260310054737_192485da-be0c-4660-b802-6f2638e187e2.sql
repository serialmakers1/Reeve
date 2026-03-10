CREATE POLICY "documents_delete_own_uploads"
ON public.documents
FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());