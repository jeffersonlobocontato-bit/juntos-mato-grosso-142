-- Add public UPDATE policy for view_count increment
CREATE POLICY "Anyone can increment view count"
ON public.shared_presentations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.shared_presentations ENABLE ROW LEVEL SECURITY;