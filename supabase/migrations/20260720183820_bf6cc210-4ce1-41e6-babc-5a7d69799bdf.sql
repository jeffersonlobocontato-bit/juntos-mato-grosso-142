CREATE OR REPLACE FUNCTION public.get_sugestoes_formulario_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint FROM public.sugestoes_populares;
$$;

GRANT EXECUTE ON FUNCTION public.get_sugestoes_formulario_count() TO anon, authenticated;