-- Adicionar sequencial do candidato no TSE para referência cruzada
ALTER TABLE tse_candidatos 
ADD COLUMN IF NOT EXISTS sequencial_tse text;

-- Adicionar código do local de votação do TSE
ALTER TABLE tse_locais_votacao 
ADD COLUMN IF NOT EXISTS codigo_local_tse integer;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_tse_candidatos_sequencial ON tse_candidatos(sequencial_tse);
CREATE INDEX IF NOT EXISTS idx_tse_locais_codigo ON tse_locais_votacao(codigo_local_tse);