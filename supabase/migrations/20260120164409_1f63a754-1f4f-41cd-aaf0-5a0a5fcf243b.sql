-- Create table for storing AI evaluations of proposals
CREATE TABLE public.proposal_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas_tecnicas(id) ON DELETE CASCADE,
  score_total DECIMAL(3,1) NOT NULL CHECK (score_total >= 0 AND score_total <= 10),
  scores JSONB NOT NULL DEFAULT '{}',
  justificativa TEXT,
  pontos_fortes TEXT[],
  pontos_atencao TEXT[],
  fontes_cruzadas JSONB,
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  evaluated_by UUID REFERENCES public.profiles(id),
  is_stale BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by proposal
CREATE INDEX idx_proposal_evaluations_proposta ON public.proposal_evaluations(proposta_id);
CREATE INDEX idx_proposal_evaluations_score ON public.proposal_evaluations(score_total);

-- Enable RLS
ALTER TABLE public.proposal_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view evaluations"
  ON public.proposal_evaluations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and leaders can create evaluations"
  ON public.proposal_evaluations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'lider_tematico', 'admin_master')
    )
  );

CREATE POLICY "Admins and leaders can update evaluations"
  ON public.proposal_evaluations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'lider_tematico', 'admin_master')
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER update_proposal_evaluations_updated_at
  BEFORE UPDATE ON public.proposal_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to mark evaluation as stale when proposal is updated
CREATE OR REPLACE FUNCTION public.mark_evaluation_stale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.proposal_evaluations
  SET is_stale = true
  WHERE proposta_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER mark_evaluation_stale_on_proposal_update
  AFTER UPDATE ON public.propostas_tecnicas
  FOR EACH ROW
  WHEN (OLD.descricao IS DISTINCT FROM NEW.descricao 
    OR OLD.titulo IS DISTINCT FROM NEW.titulo 
    OR OLD.questionario IS DISTINCT FROM NEW.questionario)
  EXECUTE FUNCTION public.mark_evaluation_stale();