-- Agregação de resultados históricos por mesorregião (IBGE), usada para cruzar
-- com o percentual regional das pesquisas eleitorais atuais (survey_crosstabs).
CREATE OR REPLACE FUNCTION public.hist_regioes(
  p_ano integer,
  p_turno integer,
  p_cargo integer,
  p_candidato text
)
RETURNS TABLE(regiao text, votos bigint, total_regiao bigint, pct numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH mun_total AS (
    SELECT r.nm_municipio_normalizado AS mun, sum(r.qt_votos)::bigint AS total
    FROM public.resultados_eleicoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY 1
  ),
  cand AS (
    SELECT r.nm_municipio_normalizado AS mun,
           sum(
             CASE
               WHEN p_candidato = 'TODOS' OR r.nm_candidato = p_candidato THEN r.qt_votos
               ELSE 0
             END
           )::bigint AS votos
    FROM public.resultados_eleicoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY 1
  ),
  joined AS (
    SELECT m.regiao, c.votos, mt.total
    FROM cand c
    JOIN mun_total mt ON mt.mun = c.mun
    JOIN public.municipios m
      ON upper(translate(m.nome,
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
        'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
      )) = c.mun
    WHERE m.regiao IS NOT NULL
  )
  SELECT
    j.regiao,
    sum(j.votos)::bigint AS votos,
    sum(j.total)::bigint AS total_regiao,
    (sum(j.votos) * 100.0 / NULLIF(sum(j.total), 0))::numeric AS pct
  FROM joined j
  GROUP BY j.regiao
  ORDER BY j.regiao;
$$;

GRANT EXECUTE ON FUNCTION public.hist_regioes(int,int,int,text) TO authenticated;
