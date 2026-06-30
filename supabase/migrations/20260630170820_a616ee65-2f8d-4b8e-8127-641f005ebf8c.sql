CREATE TABLE public.comms_content_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contexto TEXT NOT NULL,
  temas_mapeados JSONB NOT NULL DEFAULT '[]',
  conteudos JSONB NOT NULL DEFAULT '{}',
  fontes_utilizadas JSONB,
  formatos_gerados TEXT[] NOT NULL DEFAULT '{}',
  generated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comms_content_generations TO authenticated;
GRANT ALL ON public.comms_content_generations TO service_role;

CREATE INDEX idx_comms_content_created_at ON public.comms_content_generations(created_at DESC);
CREATE INDEX idx_comms_content_generated_by ON public.comms_content_generations(generated_by);

ALTER TABLE public.comms_content_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e lideres podem ver geracoes de conteudo"
  ON public.comms_content_generations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','admin_master','lider_tematico')));

CREATE POLICY "Admins e lideres podem criar geracoes de conteudo"
  ON public.comms_content_generations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','admin_master','lider_tematico')));

CREATE POLICY "Admins e lideres podem editar geracoes de conteudo"
  ON public.comms_content_generations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','admin_master','lider_tematico')));

CREATE POLICY "Admins e lideres podem excluir geracoes de conteudo"
  ON public.comms_content_generations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','admin_master','lider_tematico')));

CREATE TRIGGER update_comms_content_generations_updated_at
  BEFORE UPDATE ON public.comms_content_generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();