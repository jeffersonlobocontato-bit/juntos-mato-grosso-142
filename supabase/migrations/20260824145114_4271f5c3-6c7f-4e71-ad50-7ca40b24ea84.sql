CREATE TABLE public.user_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_modules TO authenticated;
GRANT ALL ON public.user_modules TO service_role;

ALTER TABLE public.user_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own modules"
ON public.user_modules FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage modules"
ON public.user_modules FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX idx_user_modules_user ON public.user_modules(user_id);