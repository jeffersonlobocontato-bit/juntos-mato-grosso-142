-- Módulo Histórico Eleitoral (base de resultados oficiais do TSE por município)
-- Porta a arquitetura que funcionou no Politiza IA (tabela plana + funções SQL de
-- agregação), em vez do pipeline de edge function de auto-download que já existe
-- em AdminTSE/tse-import e não é usado por este módulo.

CREATE TABLE IF NOT EXISTS public.resultados_eleicoes_historicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_eleicao int NOT NULL,
  num_turno int NOT NULL,
  nm_municipio_tse text NOT NULL,
  nm_municipio text NOT NULL,
  cd_cargo int NOT NULL,
  ds_cargo text NOT NULL,
  nr_candidato text NOT NULL,
  nm_candidato text NOT NULL,
  sg_partido text NOT NULL,
  qt_votos int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  nm_municipio_normalizado text GENERATED ALWAYS AS (
    upper(translate(nm_municipio,
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
      'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
    ))
  ) STORED
);

GRANT SELECT ON public.resultados_eleicoes_historicos TO authenticated;
GRANT ALL ON public.resultados_eleicoes_historicos TO service_role;

ALTER TABLE public.resultados_eleicoes_historicos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_reh_ano_cargo_turno
  ON public.resultados_eleicoes_historicos (ano_eleicao, cd_cargo, num_turno);
CREATE INDEX IF NOT EXISTS idx_reh_municipio_norm
  ON public.resultados_eleicoes_historicos (nm_municipio_normalizado);
CREATE INDEX IF NOT EXISTS idx_reh_candidato
  ON public.resultados_eleicoes_historicos (nm_candidato);

CREATE POLICY "admin le resultados historicos"
  ON public.resultados_eleicoes_historicos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_master gerencia resultados historicos"
  ON public.resultados_eleicoes_historicos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'));

-- Combinações ano/turno/cargo disponíveis (alimenta os selects de filtro)
CREATE OR REPLACE FUNCTION public.hist_combos()
RETURNS TABLE(ano integer, turno integer, cargo integer, label text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'access denied';
  END IF;

  RETURN QUERY
  SELECT DISTINCT r.ano_eleicao, r.num_turno, r.cd_cargo, r.ds_cargo
  FROM public.resultados_eleicoes_historicos r
  ORDER BY 1, 3, 2;
END;
$$;

REVOKE ALL ON FUNCTION public.hist_combos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hist_combos() TO authenticated;

-- Ranking estadual de candidatos do recorte selecionado
CREATE OR REPLACE FUNCTION public.hist_candidatos(p_ano int, p_turno int, p_cargo int)
RETURNS TABLE (nm_candidato text, sg_partido text, nr_candidato text, votos bigint, pct numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH agg AS (
    SELECT r.nm_candidato, min(r.sg_partido) AS sg_partido, min(r.nr_candidato) AS nr_candidato,
           sum(r.qt_votos)::bigint AS votos
    FROM public.resultados_eleicoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
    GROUP BY r.nm_candidato
  )
  SELECT a.nm_candidato, a.sg_partido, a.nr_candidato, a.votos,
         (a.votos * 100.0 / NULLIF(sum(a.votos) OVER (), 0))::numeric AS pct
  FROM agg a
  ORDER BY a.votos DESC;
$$;

GRANT EXECUTE ON FUNCTION public.hist_candidatos(int,int,int) TO authenticated;

-- Votos por município do candidato selecionado (ou 'TODOS'), já casado com o
-- código IBGE via a tabela municipios que a plataforma MT já mantém.
CREATE OR REPLACE FUNCTION public.hist_municipios(
  p_ano integer,
  p_turno integer,
  p_cargo integer,
  p_candidato text
)
RETURNS TABLE(cd_municipio_ibge text, nm_municipio text, votos bigint, pct numeric)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  WITH estado_total AS (
    SELECT sum(r.qt_votos)::bigint AS total
    FROM public.resultados_eleicoes_historicos r
    WHERE r.ano_eleicao = p_ano AND r.num_turno = p_turno AND r.cd_cargo = p_cargo
  ),
  mun_total AS (
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
  )
  SELECT m.codigo_ibge::text, m.nome::text, c.votos,
         CASE
           WHEN p_candidato = 'TODOS' THEN (c.votos * 100.0 / NULLIF(e.total, 0))::numeric
           ELSE (c.votos * 100.0 / NULLIF(mt.total, 0))::numeric
         END AS pct
  FROM cand c
  JOIN mun_total mt ON mt.mun = c.mun
  CROSS JOIN estado_total e
  JOIN public.municipios m
    ON upper(translate(m.nome,'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç','AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')) = c.mun
  WHERE c.votos > 0;
$$;

GRANT EXECUTE ON FUNCTION public.hist_municipios(int,int,int,text) TO authenticated;
