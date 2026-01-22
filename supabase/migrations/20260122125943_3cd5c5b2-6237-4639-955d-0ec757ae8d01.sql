-- 1. Deletar votos existentes de 2022/PR
DELETE FROM tse_votos 
WHERE eleicao_id = '384a54a6-5146-4c4b-950c-ded6bc60487f';

-- 2. Deletar candidatos órfãos de 2022/PR
DELETE FROM tse_candidatos 
WHERE eleicao_id = '384a54a6-5146-4c4b-950c-ded6bc60487f';

-- 3. Resetar metadados da importação
UPDATE tse_importacoes 
SET 
  current_byte_offset = 0,
  current_batch = 0,
  registros_importados = 0,
  total_registros = 0,
  status = 'pendente',
  erro_mensagem = NULL,
  updated_at = now()
WHERE ano = 2022 AND uf = 'PR' AND tipo_arquivo = 'votacao_secao';

-- 4. Criar índice único para prevenir duplicatas futuras
CREATE UNIQUE INDEX IF NOT EXISTS idx_tse_votos_unique 
ON tse_votos (eleicao_id, candidato_id, local_id, zona, secao)
WHERE candidato_id IS NOT NULL AND local_id IS NOT NULL;