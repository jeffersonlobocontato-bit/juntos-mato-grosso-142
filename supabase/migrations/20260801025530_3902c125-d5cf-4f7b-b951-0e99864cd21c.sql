REVOKE EXECUTE ON FUNCTION public.classificar_genero_sugestao(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_classificar_genero() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reclassificar_genero_sugestoes(boolean, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.definir_genero_manual(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.painel_genero_resumo() FROM anon;
REVOKE EXECUTE ON FUNCTION public.painel_genero_por_regiao() FROM anon;
REVOKE EXECUTE ON FUNCTION public.painel_genero_indefinidos(integer, integer) FROM anon;