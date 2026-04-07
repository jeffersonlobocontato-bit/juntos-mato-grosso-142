-- Add institutional fields to propostas_tecnicas
ALTER TABLE public.propostas_tecnicas
  ADD COLUMN IF NOT EXISTS tipo_proposta text NOT NULL DEFAULT 'tecnica',
  ADD COLUMN IF NOT EXISTS instituicao_nome text,
  ADD COLUMN IF NOT EXISTS instituicao_cnpj text,
  ADD COLUMN IF NOT EXISTS instituicao_segmento text,
  ADD COLUMN IF NOT EXISTS representante_nome text,
  ADD COLUMN IF NOT EXISTS representante_cargo text,
  ADD COLUMN IF NOT EXISTS representante_telefone text,
  ADD COLUMN IF NOT EXISTS representante_email text;

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_propostas_tipo_proposta ON public.propostas_tecnicas (tipo_proposta);