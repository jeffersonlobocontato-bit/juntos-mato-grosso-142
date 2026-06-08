REVOKE SELECT ON public.eixos_tematicos FROM anon;
GRANT SELECT (id, nome, descricao, subtitulo, ordem, created_at) ON public.eixos_tematicos TO anon;