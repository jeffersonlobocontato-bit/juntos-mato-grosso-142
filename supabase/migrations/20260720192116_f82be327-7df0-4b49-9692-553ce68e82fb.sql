GRANT INSERT ON public.sugestoes_populares TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.sugestoes_populares TO authenticated;
GRANT ALL ON public.sugestoes_populares TO service_role;