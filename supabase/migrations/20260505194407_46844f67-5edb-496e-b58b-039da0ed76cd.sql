
DROP POLICY IF EXISTS "Anyone can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Public can view proposta anexos" ON storage.objects;

CREATE POLICY "Admins can view ai-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'ai-documents' AND is_admin(auth.uid()));

CREATE POLICY "Owners and admins can view proposta-anexos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR is_admin(auth.uid()))
);
