ALTER TABLE public.electoral_surveys ADD COLUMN IF NOT EXISTS measured_municipios jsonb DEFAULT '[]'::jsonb;

GRANT SELECT, INSERT, UPDATE ON public.electoral_surveys TO authenticated;
GRANT ALL ON public.electoral_surveys TO service_role;