-- Bucket para anexos de propostas (entrevistas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposta-anexos', 'proposta-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Visualização pública
CREATE POLICY "Public can view proposta anexos"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposta-anexos');

-- Upload por usuários autenticados
CREATE POLICY "Authenticated can upload proposta anexos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposta-anexos');

-- Update pelo dono ou admin
CREATE POLICY "Owners and admins can update proposta anexos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR public.is_admin(auth.uid()))
);

-- Delete pelo dono ou admin
CREATE POLICY "Owners and admins can delete proposta anexos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR public.is_admin(auth.uid()))
);