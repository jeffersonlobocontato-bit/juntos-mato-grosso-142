-- Módulo "Resultados por Seção Eleitoral" — granularidade mais fina que
-- resultados_eleicoes_historicos (que é por município). Cada linha é um
-- candidato/opção numa seção específica, com o local de votação (prédio
-- físico onde a seção funciona) e sua coordenada geocodificada via Mapbox
-- a partir do endereço publicado pelo TSE (não há lat/lng oficial do TSE
-- por seção — só o endereço textual do local).
--
-- Várias seções compartilham o mesmo local de votação (e portanto a mesma
-- coordenada) — para os pins do mapa, agregar por (município, local), não
-- por seção crua, senão os pins ficam empilhados no mesmo ponto.

CREATE TABLE IF NOT EXISTS public.resultados_secoes_eleitorais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_eleicao int NOT NULL,
  num_turno int NOT NULL,
  sg_uf text NOT NULL,
  cd_municipio_tse int NOT NULL,
  nm_municipio text NOT NULL,
  nr_zona int NOT NULL,
  nr_secao int NOT NULL,
  cd_cargo int NOT NULL,
  ds_cargo text NOT NULL,
  nr_candidato text NOT NULL,
  nm_candidato text NOT NULL,
  qt_votos int NOT NULL,
  nr_local_votacao int NOT NULL,
  nm_local_votacao text,
  ds_endereco text,
  latitude double precision,
  longitude double precision,
  geocode_relevance numeric(4,3),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.resultados_secoes_eleitorais TO authenticated;
GRANT ALL ON public.resultados_secoes_eleitorais TO service_role;

ALTER TABLE public.resultados_secoes_eleitorais ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rse_ano_cargo_turno
  ON public.resultados_secoes_eleitorais (ano_eleicao, cd_cargo, num_turno);
CREATE INDEX IF NOT EXISTS idx_rse_municipio_local
  ON public.resultados_secoes_eleitorais (cd_municipio_tse, nr_local_votacao);
CREATE INDEX IF NOT EXISTS idx_rse_candidato
  ON public.resultados_secoes_eleitorais (nm_candidato);

CREATE POLICY "admin le resultados secoes"
  ON public.resultados_secoes_eleitorais FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_master gerencia resultados secoes"
  ON public.resultados_secoes_eleitorais FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- Pins do mapa: agregado por local de votação (não por seção crua, que
-- duplicaria pontos exatamente na mesma coordenada).
CREATE OR REPLACE FUNCTION public.secoes_locais(
  p_ano integer,
  p_turno integer,
  p_cargo integer,
  p_candidato text
)
RETURNS TABLE(
  cd_municipio_tse int,
  nm_municipio text,
  nr_local_votacao int,
  nm_local_votacao text,
  ds_endereco text,
  latitude double precision,
  longitude double precision,
  qtd_secoes bigint,
  votos bigint,
  total_local bigint,
  pct numeric
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH local_total AS (
    SELECT r.cd_municipio_tse, r.nr_local_votacao, sum(r.qt_votos)::bigint AS total
    FROM public.resultados_secoes_eleitorais r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY 1, 2
  ),
  cand AS (
    SELECT
      r.cd_municipio_tse, r.nr_local_votacao,
      min(r.nm_municipio) AS nm_municipio,
      min(r.nm_local_votacao) AS nm_local_votacao,
      min(r.ds_endereco) AS ds_endereco,
      min(r.latitude) AS latitude,
      min(r.longitude) AS longitude,
      count(DISTINCT r.nr_secao)::bigint AS qtd_secoes,
      sum(
        CASE WHEN p_candidato = 'TODOS' OR r.nm_candidato = p_candidato THEN r.qt_votos ELSE 0 END
      )::bigint AS votos
    FROM public.resultados_secoes_eleitorais r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY 1, 2
  )
  SELECT
    c.cd_municipio_tse, c.nm_municipio, c.nr_local_votacao, c.nm_local_votacao,
    c.ds_endereco, c.latitude, c.longitude, c.qtd_secoes, c.votos, lt.total,
    (c.votos * 100.0 / NULLIF(lt.total, 0))::numeric AS pct
  FROM cand c
  JOIN local_total lt ON lt.cd_municipio_tse = c.cd_municipio_tse AND lt.nr_local_votacao = c.nr_local_votacao
  WHERE c.latitude IS NOT NULL AND c.votos > 0;
$$;

GRANT EXECUTE ON FUNCTION public.secoes_locais(int,int,int,text) TO authenticated;

-- Detalhe por seção dentro de um local (usado ao abrir/expandir um pin).
CREATE OR REPLACE FUNCTION public.secoes_por_local(
  p_ano integer,
  p_turno integer,
  p_cargo integer,
  p_cd_municipio_tse integer,
  p_nr_local_votacao integer
)
RETURNS TABLE(nr_zona int, nr_secao int, nm_candidato text, nr_candidato text, qt_votos int)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT r.nr_zona, r.nr_secao, r.nm_candidato, r.nr_candidato, r.qt_votos
  FROM public.resultados_secoes_eleitorais r
  WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    AND r.cd_municipio_tse = p_cd_municipio_tse AND r.nr_local_votacao = p_nr_local_votacao
  ORDER BY r.nr_zona, r.nr_secao, r.qt_votos DESC;
$$;

GRANT EXECUTE ON FUNCTION public.secoes_por_local(int,int,int,int,int) TO authenticated;
