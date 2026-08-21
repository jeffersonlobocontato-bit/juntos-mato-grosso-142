-- Tabelas de associação política por município, usadas pelo Mapa Estratégico
-- (coloração de municípios/choropleth). Portado da plataforma Politiza IA (politiza.ia.br).
-- Tabelas ficam vazias — a equipe preenche via admin quando houver dados reais de MT.

CREATE TABLE IF NOT EXISTS public.municipality_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acronym text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.association_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES public.municipality_associations(id) ON DELETE CASCADE,
  municipality_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.municipality_associations TO authenticated;
GRANT SELECT ON public.association_members TO authenticated;
GRANT ALL ON public.municipality_associations TO service_role;
GRANT ALL ON public.association_members TO service_role;

ALTER TABLE public.municipality_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_members ENABLE ROW LEVEL SECURITY;

-- Leitura pública para qualquer usuário autenticado (o mapa é uma ferramenta interna da equipe)
CREATE POLICY "authenticated read municipality_associations"
  ON public.municipality_associations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated read association_members"
  ON public.association_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Gestão restrita a admin_master e admin
CREATE POLICY "admins manage municipality_associations"
  ON public.municipality_associations
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage association_members"
  ON public.association_members
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));
