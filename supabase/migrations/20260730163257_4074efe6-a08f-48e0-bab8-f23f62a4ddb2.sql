DROP POLICY IF EXISTS "Anyone can increment view count" ON public.shared_presentations;

CREATE OR REPLACE FUNCTION public.increment_presentation_view(p_public_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shared_presentations
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE public_id = p_public_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_presentation_view(TEXT) TO anon, authenticated;

DROP POLICY IF EXISTS "Creators can update their shared presentations" ON public.shared_presentations;
CREATE POLICY "Creators can update their shared presentations"
ON public.shared_presentations
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);