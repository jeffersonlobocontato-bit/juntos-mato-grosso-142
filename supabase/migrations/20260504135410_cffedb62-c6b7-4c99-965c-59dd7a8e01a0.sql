
CREATE TABLE public.ai_document_temas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  tema_id uuid NOT NULL REFERENCES public.temas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, tema_id)
);

ALTER TABLE public.ai_document_temas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ai_document_temas"
  ON public.ai_document_temas FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authorized users view ai_document_temas"
  ON public.ai_document_temas FOR SELECT
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'lider_tematico'::app_role));

CREATE INDEX idx_adt_document ON public.ai_document_temas(document_id);
CREATE INDEX idx_adt_tema ON public.ai_document_temas(tema_id);

-- Backfill: docs com eixo definido recebem todos os temas daquele eixo
INSERT INTO public.ai_document_temas (document_id, tema_id)
SELECT d.id, t.id
FROM public.ai_documents d
JOIN public.temas t ON t.eixo_id = d.eixo_id
WHERE d.eixo_id IS NOT NULL
ON CONFLICT (document_id, tema_id) DO NOTHING;
