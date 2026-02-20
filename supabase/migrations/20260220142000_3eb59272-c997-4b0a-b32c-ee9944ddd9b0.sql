
-- Update existing data: convert 'validada' and 'consolidada' to 'em_analise'
UPDATE public.propostas_tecnicas SET status = 'em_analise' WHERE status IN ('validada', 'consolidada');

-- Add RLS policy for leaders to update proposals in their axis
CREATE POLICY "Leaders can update proposals in their axis"
ON public.propostas_tecnicas
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.eixos_tematicos e
    WHERE e.id = propostas_tecnicas.eixo_id AND e.lider_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_eixos ue
    WHERE ue.user_id = auth.uid() AND ue.eixo_id = propostas_tecnicas.eixo_id
  )
);
