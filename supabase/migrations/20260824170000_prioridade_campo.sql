-- Cruzamento "Prioridade de Campo": junta o histórico por local de votação
-- (resultados_secoes_historicos, 2018 x 2022) com a cobertura de tracking de
-- campo (tracking_interviews) para apontar onde a campanha tem pouco dado
-- de campo E o local historicamente oscilou mais — não é predição, é
-- interseção de dois fatos reais (voto passado + presença de campo).
--
-- Regra estatística: só calculamos oscilação (diff_pp) para candidatos que
-- de fato concorreram nos dois anos no mesmo cargo — comparar um candidato
-- que só concorreu em um ano dá um "0%" artificial no outro ano, que não é
-- oscilação real, é ausência de candidatura. candidatos_secoes_comuns()
-- existe justamente para restringir o seletor da UI a essa interseção.
--
-- Chave de identidade do local entre anos: (nm_municipio, ds_endereco), não
-- cd_municipio_tse/nr_local_votacao — esses podem ser nulos ou mudar de
-- numeração entre eleições, e nm_municipio é a coluna garantidamente
-- preenchida no schema atual.

CREATE OR REPLACE FUNCTION public.candidatos_secoes_comuns(p_cd_cargo integer)
RETURNS TABLE(nm_candidato text)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT r.nm_candidato
  FROM public.resultados_secoes_historicos r
  WHERE r.cd_cargo = p_cd_cargo
  GROUP BY r.nm_candidato
  HAVING count(DISTINCT r.ano_eleicao) = 2
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.candidatos_secoes_comuns(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.locais_prioridade_campo(
  p_cd_cargo integer,
  p_nm_candidato text
)
RETURNS TABLE(
  nm_municipio text,
  ds_endereco text,
  nm_local_votacao text,
  latitude double precision,
  longitude double precision,
  votos_2018 bigint,
  total_2018 bigint,
  pct_2018 numeric,
  votos_2022 bigint,
  total_2022 bigint,
  pct_2022 numeric,
  diff_pp numeric,
  tem_cobertura_campo boolean
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH totals AS (
    SELECT ano_eleicao, nm_municipio, ds_endereco, sum(qt_votos)::bigint AS total
    FROM public.resultados_secoes_historicos
    WHERE cd_cargo = p_cd_cargo AND ds_endereco IS NOT NULL
    GROUP BY 1, 2, 3
  ),
  votos AS (
    SELECT
      ano_eleicao, nm_municipio, ds_endereco,
      min(nm_local_votacao) AS nm_local_votacao,
      min(latitude)::double precision AS latitude,
      min(longitude)::double precision AS longitude,
      sum(CASE WHEN nm_candidato = p_nm_candidato THEN qt_votos ELSE 0 END)::bigint AS votos_cand
    FROM public.resultados_secoes_historicos
    WHERE cd_cargo = p_cd_cargo AND ds_endereco IS NOT NULL
    GROUP BY 1, 2, 3
  ),
  joined AS (
    SELECT
      v.ano_eleicao, v.nm_municipio, v.ds_endereco, v.nm_local_votacao,
      v.latitude, v.longitude, v.votos_cand, t.total,
      (v.votos_cand * 100.0 / NULLIF(t.total, 0))::numeric AS pct
    FROM votos v
    JOIN totals t
      ON t.ano_eleicao = v.ano_eleicao
     AND t.nm_municipio = v.nm_municipio
     AND t.ds_endereco = v.ds_endereco
  ),
  pivot AS (
    SELECT
      nm_municipio, ds_endereco,
      max(nm_local_votacao) FILTER (WHERE ano_eleicao = 2022) AS nm_local_votacao,
      max(latitude) FILTER (WHERE ano_eleicao = 2022) AS latitude,
      max(longitude) FILTER (WHERE ano_eleicao = 2022) AS longitude,
      max(votos_cand) FILTER (WHERE ano_eleicao = 2018) AS votos_2018,
      max(total) FILTER (WHERE ano_eleicao = 2018) AS total_2018,
      max(pct) FILTER (WHERE ano_eleicao = 2018) AS pct_2018,
      max(votos_cand) FILTER (WHERE ano_eleicao = 2022) AS votos_2022,
      max(total) FILTER (WHERE ano_eleicao = 2022) AS total_2022,
      max(pct) FILTER (WHERE ano_eleicao = 2022) AS pct_2022
    FROM joined
    GROUP BY 1, 2
  )
  SELECT
    p.nm_municipio, p.ds_endereco, p.nm_local_votacao, p.latitude, p.longitude,
    p.votos_2018, p.total_2018, p.pct_2018,
    p.votos_2022, p.total_2022, p.pct_2022,
    CASE WHEN p.pct_2018 IS NOT NULL AND p.pct_2022 IS NOT NULL
      THEN (p.pct_2022 - p.pct_2018)
      ELSE NULL
    END AS diff_pp,
    EXISTS (
      SELECT 1 FROM public.tracking_interviews ti
      WHERE upper(translate(ti.municipality, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç','AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'))
          = upper(translate(p.nm_municipio, 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç','AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'))
    ) AS tem_cobertura_campo
  FROM pivot p
  WHERE p.latitude IS NOT NULL AND p.pct_2018 IS NOT NULL AND p.pct_2022 IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.locais_prioridade_campo(int,text) TO authenticated;
