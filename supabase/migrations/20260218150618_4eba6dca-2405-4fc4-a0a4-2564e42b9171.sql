ALTER TABLE public.sugestoes_populares
  ADD COLUMN IF NOT EXISTS tema_ids jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS analise_semantica jsonb DEFAULT NULL;