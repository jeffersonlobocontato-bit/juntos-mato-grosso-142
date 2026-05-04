-- 1. audit_logs: only server-side (security definer) should insert; remove user insert
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- 2. propostas_politicas: restrict insert to authenticated and enforce autor_id = auth.uid()
DROP POLICY IF EXISTS "Anyone can submit political proposals" ON public.propostas_politicas;
CREATE POLICY "Authenticated users can submit political proposals"
ON public.propostas_politicas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = autor_id);

-- 3. shared_presentations: replace blanket UPDATE policy with secure view-count function
DROP POLICY IF EXISTS "Anyone can increment view count" ON public.shared_presentations;

CREATE OR REPLACE FUNCTION public.increment_shared_presentation_view(_public_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.shared_presentations
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE public_id = _public_id;
$$;

CREATE POLICY "Creators can update their shared presentations"
ON public.shared_presentations
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);