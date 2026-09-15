DROP POLICY "Admins manage module visibility" ON public.module_visibility;
CREATE POLICY "Only admin master manages module visibility"
ON public.module_visibility
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));