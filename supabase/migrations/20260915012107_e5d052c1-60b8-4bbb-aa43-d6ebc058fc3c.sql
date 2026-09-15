CREATE TABLE public.module_visibility (
  module_key text PRIMARY KEY,
  visible boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.module_visibility TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.module_visibility TO authenticated;
GRANT ALL ON public.module_visibility TO service_role;

ALTER TABLE public.module_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read module visibility"
ON public.module_visibility FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage module visibility"
ON public.module_visibility FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_master'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'admin_master'));

CREATE TRIGGER update_module_visibility_updated_at
BEFORE UPDATE ON public.module_visibility
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();