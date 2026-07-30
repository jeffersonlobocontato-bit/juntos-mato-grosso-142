DROP POLICY IF EXISTS "Authenticated users can view evaluations" ON public.proposal_evaluations;

CREATE POLICY "Scoped access to evaluations"
ON public.proposal_evaluations
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.propostas_tecnicas p
    WHERE p.id = proposal_evaluations.proposta_id
      AND (
        p.autor_id = auth.uid()
        OR p.lider_responsavel_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.eixos_tematicos e WHERE e.id = p.eixo_id AND e.lider_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.user_eixos ue WHERE ue.user_id = auth.uid() AND ue.eixo_id = p.eixo_id)
        OR EXISTS (SELECT 1 FROM public.user_municipios um WHERE um.user_id = auth.uid() AND um.municipio_id = p.municipio_id)
      )
  )
);