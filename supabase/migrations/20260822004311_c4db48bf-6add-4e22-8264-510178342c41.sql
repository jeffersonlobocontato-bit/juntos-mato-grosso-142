UPDATE public.resultados_eleicoes_historicos
SET nm_municipio = 'Santo Antônio de Leverger'
WHERE upper(unaccent(nm_municipio)) IN ('SANTO ANTONIO DO LEVERGER','SANTO ANTONIO DE LEVERGER');