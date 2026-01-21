-- Create table for totalization results (aggregated data by municipality/zone)
CREATE TABLE public.tse_resultados_totalizacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eleicao_id UUID NOT NULL REFERENCES public.tse_eleicoes(id) ON DELETE CASCADE,
  turno INTEGER NOT NULL DEFAULT 1,
  uf TEXT NOT NULL,
  codigo_municipio_tse INTEGER,
  nome_municipio TEXT,
  zona INTEGER,
  cargo_id UUID REFERENCES public.tse_cargos(id),
  candidato_id UUID REFERENCES public.tse_candidatos(id),
  numero_candidato INTEGER NOT NULL,
  nome_candidato TEXT,
  nome_urna TEXT,
  partido_id UUID REFERENCES public.tse_partidos(id),
  sigla_partido TEXT,
  situacao_totalizacao TEXT,
  qt_votos INTEGER NOT NULL DEFAULT 0,
  qt_aptos INTEGER,
  qt_comparecimento INTEGER,
  qt_abstencoes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint to prevent duplicates
  CONSTRAINT tse_resultados_unique UNIQUE (eleicao_id, turno, uf, codigo_municipio_tse, zona, numero_candidato)
);

-- Enable RLS
ALTER TABLE public.tse_resultados_totalizacao ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read tse_resultados_totalizacao" 
ON public.tse_resultados_totalizacao 
FOR SELECT 
TO authenticated
USING (true);

-- Create index for common queries
CREATE INDEX idx_tse_resultados_eleicao_uf ON public.tse_resultados_totalizacao(eleicao_id, uf);
CREATE INDEX idx_tse_resultados_municipio ON public.tse_resultados_totalizacao(codigo_municipio_tse);
CREATE INDEX idx_tse_resultados_candidato ON public.tse_resultados_totalizacao(candidato_id);

-- Add unique constraint to tse_importacoes for upsert operations
ALTER TABLE public.tse_importacoes DROP CONSTRAINT IF EXISTS tse_importacoes_unique;
ALTER TABLE public.tse_importacoes ADD CONSTRAINT tse_importacoes_unique UNIQUE (ano, uf, tipo_arquivo);