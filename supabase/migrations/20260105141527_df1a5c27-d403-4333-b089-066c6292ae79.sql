-- Add JSONB column to store structured questionnaire responses
ALTER TABLE public.propostas_tecnicas 
ADD COLUMN IF NOT EXISTS questionario JSONB DEFAULT '{}'::jsonb;

-- Add comment to document the structure
COMMENT ON COLUMN public.propostas_tecnicas.questionario IS 'Structured questionnaire data with sections: diagnostico, objetivos, propostas, implementacao, territorializacao, indicadores, legado';