
-- 1. Update is_admin to include admin_master
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::app_role, 'admin_master'::app_role)
  )
$$;

-- 2. Lock down shared_presentations: remove broad public read; provide a SECURITY DEFINER fetch function instead
DROP POLICY IF EXISTS "Anyone can view shared presentations" ON public.shared_presentations;

CREATE POLICY "Creators and admins can view shared presentations"
ON public.shared_presentations FOR SELECT
USING (auth.uid() = created_by OR is_admin(auth.uid()));

-- Tighten INSERT to enforce ownership
DROP POLICY IF EXISTS "Authenticated users can create shared presentations" ON public.shared_presentations;
CREATE POLICY "Authenticated users can create shared presentations"
ON public.shared_presentations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

-- Public access function (only by exact public_id; no enumeration possible)
CREATE OR REPLACE FUNCTION public.get_shared_presentation_public(_public_id text)
RETURNS TABLE(
  id uuid,
  public_id text,
  title text,
  presentation_data jsonb,
  view_count integer,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id, public_id, title, presentation_data, view_count, created_at
  FROM public.shared_presentations
  WHERE public_id = _public_id
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_shared_presentation_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_presentation_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_shared_presentation_view(text) TO anon, authenticated;

-- 3. Scope political proposals access by axis/municipality (no more global access for leaders/curators)
DROP POLICY IF EXISTS "Leaders can view political proposals" ON public.propostas_politicas;
DROP POLICY IF EXISTS "Curators can view political proposals" ON public.propostas_politicas;

CREATE POLICY "Leaders view political proposals in their axis"
ON public.propostas_politicas FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_eixos ue
    WHERE ue.user_id = auth.uid() AND ue.eixo_id = propostas_politicas.eixo_id
  )
  OR EXISTS (
    SELECT 1 FROM public.eixos_tematicos e
    WHERE e.id = propostas_politicas.eixo_id AND e.lider_id = auth.uid()
  )
);

-- Curators only see public ones (already covered by "Anyone can view public political proposals")
-- Plus their own authored ones:
CREATE POLICY "Authors view their own political proposals"
ON public.propostas_politicas FOR SELECT
USING (auth.uid() = autor_id);

-- 4. TSE CSV bucket: remove broad authenticated read
DROP POLICY IF EXISTS "Authenticated can read TSE files" ON storage.objects;
