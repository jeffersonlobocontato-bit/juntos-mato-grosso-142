
-- 1) Keyword dictionary for the official taxonomy
CREATE TABLE public.taxonomia_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eixo_id uuid NOT NULL REFERENCES public.eixos_tematicos(id) ON DELETE CASCADE,
  tema_id uuid REFERENCES public.temas(id) ON DELETE CASCADE,
  subtema_id uuid REFERENCES public.subtemas(id) ON DELETE CASCADE,
  padrao text NOT NULL,
  peso integer NOT NULL DEFAULT 1,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.taxonomia_keywords TO authenticated;
GRANT ALL ON public.taxonomia_keywords TO service_role;
ALTER TABLE public.taxonomia_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e lideres leem keywords"
ON public.taxonomia_keywords FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'lider_tematico'));

CREATE POLICY "Admins gerenciam keywords"
ON public.taxonomia_keywords FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_taxonomia_keywords_updated_at
BEFORE UPDATE ON public.taxonomia_keywords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Classification of suggestions against the official taxonomy
CREATE TABLE public.sugestao_taxonomia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sugestao_id uuid NOT NULL REFERENCES public.sugestoes_populares(id) ON DELETE CASCADE,
  eixo_id uuid NOT NULL REFERENCES public.eixos_tematicos(id) ON DELETE CASCADE,
  tema_id uuid REFERENCES public.temas(id) ON DELETE CASCADE,
  subtema_id uuid REFERENCES public.subtemas(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 1,
  origem text NOT NULL DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sugestao_taxonomia_unica UNIQUE (sugestao_id, eixo_id, tema_id, subtema_id)
);

CREATE INDEX idx_sugestao_taxonomia_sugestao ON public.sugestao_taxonomia(sugestao_id);
CREATE INDEX idx_sugestao_taxonomia_tema ON public.sugestao_taxonomia(tema_id);
CREATE INDEX idx_sugestao_taxonomia_eixo ON public.sugestao_taxonomia(eixo_id);

GRANT SELECT ON public.sugestao_taxonomia TO authenticated;
GRANT ALL ON public.sugestao_taxonomia TO service_role;
ALTER TABLE public.sugestao_taxonomia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins e lideres leem classificacao"
ON public.sugestao_taxonomia FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'lider_tematico'));

CREATE POLICY "Admins gerenciam classificacao"
ON public.sugestao_taxonomia FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_sugestao_taxonomia_updated_at
BEFORE UPDATE ON public.sugestao_taxonomia
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Seed keywords: every tema and subtema name is itself a pattern
INSERT INTO public.taxonomia_keywords (eixo_id, tema_id, subtema_id, padrao, peso)
SELECT t.eixo_id, t.id, NULL, lower(public.unaccent(t.nome)), 4
FROM public.temas t;

INSERT INTO public.taxonomia_keywords (eixo_id, tema_id, subtema_id, padrao, peso)
SELECT t.eixo_id, t.id, s.id, lower(public.unaccent(s.nome)), 5
FROM public.subtemas s
JOIN public.temas t ON t.id = s.tema_id
WHERE length(s.nome) > 5;

-- 3b) Curated keyword patterns per tema (regex, unaccented lowercase)
INSERT INTO public.taxonomia_keywords (eixo_id, tema_id, subtema_id, padrao, peso)
SELECT t.eixo_id, t.id, NULL, k.padrao, 3
FROM (VALUES
  ('Saúde', 'saude|hospital|posto de saude|upa|sus|medic[ao]|enfermeir|vacina|remedio|farmacia|consulta|exame|fila de espera|ambulanc|samu|dentista|odontolog|psicolog|psiquiatr'),
  ('Educação', 'educacao|escola|professor|aluno|creche|universidade|faculdade|ensino|colegio|merenda|alfabetiza|analfabet|bolsa de estudo|magisterio'),
  ('Assistência Social', 'assistencia social|cras|creas|vulnerab|bolsa familia|pobreza|fome|cesta basica|idoso|abrigo|situacao de rua|refugiad|inclusao social|deficien'),
  ('Cultura', 'cultura|teatro|musica|biblioteca|museu|artist|festival|literatura|danca|patrimonio historico'),
  ('Esporte', 'esporte|quadra|ginasio|atleta|lazer|futebol|academia ao ar livre|jogos escolares'),
  ('Segurança Pública e Combate ao Crime Organizado', 'seguranca|policia|policial|pmpr|viatura|policiamento|delegacia|guarda municipal|vigilancia|crime|criminalidade|assalto|roubo|furto|homicidio|feminicidio|violencia|traficante|trafico|faccao'),
  ('Combate à Corrupção', 'corrupcao|desvio de verba|propina|superfatura|improbidade|impunidade'),
  ('Inteligência, Tecnologia e Prevenção', 'camera|videomonitoramento|monitoramento|inteligencia artificial na seguranca|prevencao ao crime|drone'),
  ('Sistema Prisional e Ressocialização', 'presidio|penitenciari|cadeia|preso|detento|ressocializ|apenado'),
  ('Defesa Civil e Proteção da Vida', 'defesa civil|bombeiro|enchente|alagamento|desastre|vendaval|tornado|resgate'),
  ('Justiça e Cidadania', 'justica|judiciario|direitos humanos|cidadania|advocacia|defensoria|conciliacao'),
  ('Agricultura', 'agricultura|agronegocio|produtor rural|agropecuari|lavoura|plantio|colheita|pequeno agricultor|agricultura familiar|irrigacao|maquinario agricola'),
  ('Indústria', 'industria|fabrica|parque industrial|manufatura|polo industrial'),
  ('Comércio e Serviços', 'comercio|loja|lojista|servicos|shopping|feira livre|camelo'),
  ('Turismo', 'turismo|turista|pousada|hotelaria|ecoturismo|ponto turistico'),
  ('Transportes', 'logistica|caminhoneiro|frete|transporte de carga'),
  ('Empreendedorismo e MPEs', 'empreendedor|mei|microempresa|pequena empresa|startup|incubadora'),
  ('Inovação, Pesquisa, Tecnologia e Economia Digital', 'inovacao|tecnologia|pesquisa cientifica|economia digital|digitaliza|programacao|software'),
  ('Internacionalização e Atração de Investimentos', 'exportacao|investimento estrangeiro|internacionaliza|atracao de empresas'),
  ('Apoio ao Crédito', 'credito|financiamento|fomento|emprestimo|juros|banco publico|fomento parana'),
  ('Trabalho, Renda e Qualificação', 'emprego|desemprego|trabalho|renda|qualificacao profissional|curso profissionaliz|capacitacao|primeiro emprego|sine'),
  ('Meio Ambiente e Sustentabilidade', 'meio ambiente|sustentab|reciclagem|poluicao|desmatamento|arborizacao|preservacao|nascente|licenciamento ambiental|animais|protecao animal|castracao'),
  ('Mobilidade Urbana e Regional', 'transporte publico|onibus|terminal|ciclovia|bicicleta|calcada|acessibilidade|mobilidade|semaforo|transito|estacionamento'),
  ('Logística de Transportes', 'rodovia|estrada|asfalto|pavimenta|ponte|pedagio|ferrovia|porto|aeroporto|duplicacao|br-|pr-'),
  ('Saneamento', 'saneamento|esgoto|agua encanada|drenagem|lixo|residuo|coleta de lixo|aterro|agua potavel|sanepar'),
  ('Habitação e Regularização Fundiária', 'habitacao|moradia|cohab|casa propria|regularizacao fundiaria|loteamento|aluguel social|favela|ocupacao irregular'),
  ('Infraestrutura Urbana e Reurbanização', 'infraestrutura|obra publica|calcamento|iluminacao publica|praca|revitaliza|reurbaniza|meio fio|buraco na rua'),
  ('Energia e Gás', 'energia|energia solar|eletrica|copel|apagao|gas|biometano|energia renovavel'),
  ('Conectividade e Telecomunicações', 'internet|banda larga|fibra otica|sinal de celular|telefonia|wifi|antena|5g'),
  ('Consórcios Intermunicipais', 'consorcio intermunicipal|consorcios|regionalizacao de servicos'),
  ('Modernização da Gestão Pública', 'gestao publica|eficiencia|servidor publico|concurso publico|governo digital|modernizacao|atendimento ao cidadao|burocracia|desburocratiza'),
  ('Responsabilidade Fiscal', 'imposto|icms|tributo|carga tributaria|responsabilidade fiscal|gasto publico|orcamento|divida publica|isencao'),
  ('Transparência e Integridade', 'transparencia|compliance|licitacao|auditoria|prestacao de contas|controle interno|portal da transparencia'),
  ('Previdência Social', 'previdencia|aposentadoria|aposentad|pensionista|inss|paranaprevidencia')
) AS k(tema, padrao)
JOIN public.temas t ON lower(public.unaccent(t.nome)) = lower(public.unaccent(k.tema));

-- 4) Classifier: returns taxonomy matches for a free text
CREATE OR REPLACE FUNCTION public.classificar_texto_taxonomia(p_texto text)
RETURNS TABLE(eixo_id uuid, tema_id uuid, subtema_id uuid, score integer)
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
  WITH txt AS (
    SELECT lower(public.unaccent(coalesce(p_texto, ''))) AS t
  ), hits AS (
    SELECT k.eixo_id, k.tema_id, k.subtema_id, k.peso
    FROM public.taxonomia_keywords k, txt
    WHERE k.ativo AND length(txt.t) > 3 AND txt.t ~ k.padrao
  )
  SELECT h.eixo_id, h.tema_id, h.subtema_id, sum(h.peso)::int AS score
  FROM hits h
  GROUP BY h.eixo_id, h.tema_id, h.subtema_id
$$;

GRANT EXECUTE ON FUNCTION public.classificar_texto_taxonomia(text) TO authenticated, service_role;

-- 5) Classify one suggestion (replaces its automatic rows, keeps manual ones)
CREATE OR REPLACE FUNCTION public.classificar_sugestao_taxonomia(p_sugestao_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_texto text;
  v_eixo_txt text;
  v_count integer := 0;
BEGIN
  SELECT coalesce(s.descricao, '') || ' ' || coalesce(s.eixo, ''), s.eixo
    INTO v_texto, v_eixo_txt
  FROM public.sugestoes_populares s WHERE s.id = p_sugestao_id;

  IF v_texto IS NULL THEN RETURN 0; END IF;

  DELETE FROM public.sugestao_taxonomia
  WHERE sugestao_id = p_sugestao_id AND origem = 'auto';

  INSERT INTO public.sugestao_taxonomia (sugestao_id, eixo_id, tema_id, subtema_id, score, origem)
  SELECT p_sugestao_id, c.eixo_id, c.tema_id, c.subtema_id, c.score, 'auto'
  FROM public.classificar_texto_taxonomia(v_texto) c
  ON CONFLICT (sugestao_id, eixo_id, tema_id, subtema_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- fallback: citizen-selected eixo when nothing was detected
  IF v_count = 0 AND coalesce(v_eixo_txt, '') <> '' THEN
    INSERT INTO public.sugestao_taxonomia (sugestao_id, eixo_id, tema_id, subtema_id, score, origem)
    SELECT p_sugestao_id, e.id, NULL, NULL, 1, 'auto'
    FROM public.eixos_tematicos e
    WHERE lower(public.unaccent(e.nome)) = lower(public.unaccent(v_eixo_txt))
    ON CONFLICT (sugestao_id, eixo_id, tema_id, subtema_id) DO NOTHING;
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.classificar_sugestao_taxonomia(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.classificar_sugestao_taxonomia(uuid) TO authenticated, service_role;

-- 6) Bulk reclassification (admins only)
CREATE OR REPLACE FUNCTION public.reclassificar_sugestoes_taxonomia(p_somente_pendentes boolean DEFAULT true, p_limite integer DEFAULT 5000)
RETURNS TABLE(processadas integer, vinculos integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r record;
  v_proc integer := 0;
  v_links integer := 0;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  FOR r IN
    SELECT s.id FROM public.sugestoes_populares s
    WHERE (NOT p_somente_pendentes)
       OR NOT EXISTS (SELECT 1 FROM public.sugestao_taxonomia st WHERE st.sugestao_id = s.id)
    ORDER BY s.created_at DESC
    LIMIT p_limite
  LOOP
    v_links := v_links + public.classificar_sugestao_taxonomia(r.id);
    v_proc := v_proc + 1;
  END LOOP;

  RETURN QUERY SELECT v_proc, v_links;
END;
$$;

REVOKE ALL ON FUNCTION public.reclassificar_sugestoes_taxonomia(boolean, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reclassificar_sugestoes_taxonomia(boolean, integer) TO authenticated, service_role;

-- 7) Trigger: classify every new suggestion
CREATE OR REPLACE FUNCTION public.trigger_classificar_sugestao_taxonomia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.classificar_sugestao_taxonomia(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_classificar_sugestao_taxonomia ON public.sugestoes_populares;
CREATE TRIGGER trg_classificar_sugestao_taxonomia
AFTER INSERT OR UPDATE OF descricao, eixo ON public.sugestoes_populares
FOR EACH ROW EXECUTE FUNCTION public.trigger_classificar_sugestao_taxonomia();

-- 8) Summary RPC for the dashboards
CREATE OR REPLACE FUNCTION public.painel_taxonomia_resumo()
RETURNS TABLE(eixo text, tema text, subtema text, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT e.nome, t.nome, sb.nome, count(DISTINCT st.sugestao_id)
  FROM public.sugestao_taxonomia st
  JOIN public.eixos_tematicos e ON e.id = st.eixo_id
  LEFT JOIN public.temas t ON t.id = st.tema_id
  LEFT JOIN public.subtemas sb ON sb.id = st.subtema_id
  WHERE public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'lider_tematico')
  GROUP BY e.nome, t.nome, sb.nome
  ORDER BY count(DISTINCT st.sugestao_id) DESC
$$;

REVOKE ALL ON FUNCTION public.painel_taxonomia_resumo() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.painel_taxonomia_resumo() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.painel_taxonomia_cobertura()
RETURNS TABLE(total_sugestoes bigint, classificadas bigint, com_tema bigint, com_subtema bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    (SELECT count(*) FROM public.sugestoes_populares),
    (SELECT count(DISTINCT sugestao_id) FROM public.sugestao_taxonomia),
    (SELECT count(DISTINCT sugestao_id) FROM public.sugestao_taxonomia WHERE tema_id IS NOT NULL),
    (SELECT count(DISTINCT sugestao_id) FROM public.sugestao_taxonomia WHERE subtema_id IS NOT NULL)
  WHERE public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'lider_tematico')
$$;

REVOKE ALL ON FUNCTION public.painel_taxonomia_cobertura() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.painel_taxonomia_cobertura() TO authenticated, service_role;
