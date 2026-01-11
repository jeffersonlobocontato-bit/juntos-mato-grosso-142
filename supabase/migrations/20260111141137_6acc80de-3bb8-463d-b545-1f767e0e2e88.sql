-- Adicionar constraint única faltante para permitir upsert de candidatos
ALTER TABLE public.tse_candidatos
ADD CONSTRAINT tse_candidatos_eleicao_numero_uf_unique 
UNIQUE (eleicao_id, numero_urna, uf);