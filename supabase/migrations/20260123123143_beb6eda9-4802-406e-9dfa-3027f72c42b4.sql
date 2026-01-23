-- Adicionar coluna para rastrear estado do processamento de IA
ALTER TABLE pesquisas_eleitorais 
ADD COLUMN IF NOT EXISTS ai_processing_state JSONB DEFAULT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN pesquisas_eleitorais.ai_processing_state IS 'Estado do processamento de IA: {total_chunks, processed_chunks, last_processed_at, partial_results}';