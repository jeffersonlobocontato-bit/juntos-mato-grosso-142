-- Tabela de controle de acesso ao módulo "Cruzamento Wellington"
-- Portado do módulo "Cruzamento Moro" da plataforma Politiza IA (politiza.ia.br)

-- Garante que a função has_role() exista (idempotente — não sobrescreve se já existir com a mesma assinatura)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE TABLE IF NOT EXISTS public.cruzamento_wellington_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

GRANT SELECT ON public.cruzamento_wellington_access TO authenticated;
GRANT ALL ON public.cruzamento_wellington_access TO service_role;

ALTER TABLE public.cruzamento_wellington_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_master manages cruzamento_wellington_access"
  ON public.cruzamento_wellington_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

CREATE POLICY "user sees own cruzamento_wellington_access"
  ON public.cruzamento_wellington_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
