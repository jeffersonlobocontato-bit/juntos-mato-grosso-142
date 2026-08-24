CREATE TABLE public.resultados_secoes_historicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_eleicao integer NOT NULL,
  num_turno integer NOT NULL,
  sg_uf text NOT NULL DEFAULT 'MT',
  cd_municipio_tse integer,
  nm_municipio text NOT NULL,
  nr_zona integer NOT NULL,
  nr_secao integer NOT NULL,
  cd_cargo integer NOT NULL,
  ds_cargo text NOT NULL,
  nr_candidato text NOT NULL,
  nm_candidato text NOT NULL,
  qt_votos integer NOT NULL DEFAULT 0,
  nr_local_votacao integer,
  nm_local_votacao text,
  ds_endereco text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  geocode_relevance numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_rsh_unico ON public.resultados_secoes_historicos (ano_eleicao, num_turno, cd_cargo, nr_zona, nr_secao, nr_candidato);
CREATE INDEX idx_rsh_ano_cargo ON public.resultados_secoes_historicos (ano_eleicao, num_turno, cd_cargo);
CREATE INDEX idx_rsh_municipio ON public.resultados_secoes_historicos (nm_municipio);
CREATE INDEX idx_rsh_coords ON public.resultados_secoes_historicos (latitude, longitude) WHERE latitude IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resultados_secoes_historicos TO authenticated;
GRANT ALL ON public.resultados_secoes_historicos TO service_role;

ALTER TABLE public.resultados_secoes_historicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin le resultados secoes" ON public.resultados_secoes_historicos
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_master gerencia resultados secoes" ON public.resultados_secoes_historicos
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin_master'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_master'::app_role));