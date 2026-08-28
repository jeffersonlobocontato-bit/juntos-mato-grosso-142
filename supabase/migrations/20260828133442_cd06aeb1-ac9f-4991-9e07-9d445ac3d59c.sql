ALTER TABLE public.sugestoes_populares ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT 'site';

CREATE TABLE IF NOT EXISTS public.whatsapp_ingest_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'aceito',
  erro text,
  sugestao_id uuid REFERENCES public.sugestoes_populares(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_ingest_log_external_id_key
  ON public.whatsapp_ingest_log (external_id) WHERE external_id IS NOT NULL;

GRANT SELECT ON public.whatsapp_ingest_log TO authenticated;
GRANT ALL ON public.whatsapp_ingest_log TO service_role;

ALTER TABLE public.whatsapp_ingest_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver o log de ingestao do whatsapp"
ON public.whatsapp_ingest_log FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));