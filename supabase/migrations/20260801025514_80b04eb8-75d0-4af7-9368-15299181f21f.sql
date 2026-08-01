-- 1. Dicionário de nomes
CREATE TABLE public.nomes_genero (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  genero text NOT NULL CHECK (genero IN ('masculino','feminino')),
  peso integer NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nomes_genero TO authenticated;
GRANT ALL ON public.nomes_genero TO service_role;

ALTER TABLE public.nomes_genero ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nomes_genero_select_auth" ON public.nomes_genero
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "nomes_genero_admin_all" ON public.nomes_genero
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. Gênero por sugestão
CREATE TABLE public.sugestao_genero (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sugestao_id uuid NOT NULL UNIQUE REFERENCES public.sugestoes_populares(id) ON DELETE CASCADE,
  primeiro_nome text,
  genero text NOT NULL DEFAULT 'indefinido' CHECK (genero IN ('masculino','feminino','indefinido')),
  origem text NOT NULL DEFAULT 'automatico' CHECK (origem IN ('automatico','manual')),
  confianca integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sugestao_genero_genero ON public.sugestao_genero(genero);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sugestao_genero TO authenticated;
GRANT ALL ON public.sugestao_genero TO service_role;

ALTER TABLE public.sugestao_genero ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sugestao_genero_read" ON public.sugestao_genero
  FOR SELECT TO authenticated
  USING (public.pode_ver_painel_cruzamento());
CREATE POLICY "sugestao_genero_write" ON public.sugestao_genero
  FOR ALL TO authenticated
  USING (public.pode_ver_painel_cruzamento())
  WITH CHECK (public.pode_ver_painel_cruzamento());

CREATE TRIGGER trg_sugestao_genero_updated_at
  BEFORE UPDATE ON public.sugestao_genero
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Classificador por primeiro nome
CREATE OR REPLACE FUNCTION public.classificar_genero_nome(p_nome text)
RETURNS TABLE(genero text, confianca integer, primeiro_nome text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_first text;
  v_hit record;
BEGIN
  v_first := lower(public.unaccent(btrim(coalesce(p_nome, ''))));
  v_first := regexp_replace(v_first, '[^a-z ].*$', '', 'g');
  v_first := split_part(btrim(v_first), ' ', 1);

  IF length(v_first) < 3 THEN
    RETURN QUERY SELECT 'indefinido'::text, 0, NULLIF(v_first, '');
    RETURN;
  END IF;

  SELECT n.genero, n.peso INTO v_hit
  FROM public.nomes_genero n WHERE n.nome = v_first LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_hit.genero::text, v_hit.peso::integer, v_first;
    RETURN;
  END IF;

  -- regras de terminação (baixa confiança)
  IF v_first ~ '(a|ia|na|ana|ina|ela|ete|ilda|inha)$'
     AND v_first !~ '(uca|cola|garcia|josua|elia s)$' THEN
    RETURN QUERY SELECT 'feminino'::text, 55, v_first;
    RETURN;
  END IF;

  IF v_first ~ '(o|os|or|er|ir|el|il|im|on|son|ton|val|aldo|ando|inho|nei|ney|ilson)$' THEN
    RETURN QUERY SELECT 'masculino'::text, 55, v_first;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'indefinido'::text, 0, v_first;
END;
$$;

-- 4. Classifica uma sugestão
CREATE OR REPLACE FUNCTION public.classificar_genero_sugestao(p_sugestao_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_nome text;
  v_res record;
BEGIN
  SELECT s.nome INTO v_nome FROM public.sugestoes_populares s WHERE s.id = p_sugestao_id;

  SELECT * INTO v_res FROM public.classificar_genero_nome(v_nome);

  INSERT INTO public.sugestao_genero (sugestao_id, primeiro_nome, genero, origem, confianca)
  VALUES (p_sugestao_id, v_res.primeiro_nome, v_res.genero, 'automatico', v_res.confianca)
  ON CONFLICT (sugestao_id) DO UPDATE
    SET primeiro_nome = EXCLUDED.primeiro_nome,
        genero = EXCLUDED.genero,
        confianca = EXCLUDED.confianca,
        updated_at = now()
    WHERE public.sugestao_genero.origem <> 'manual';

  RETURN v_res.genero;
END;
$$;

-- 5. Trigger para novas sugestões
CREATE OR REPLACE FUNCTION public.trigger_classificar_genero()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  PERFORM public.classificar_genero_sugestao(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_classificar_genero
  AFTER INSERT ON public.sugestoes_populares
  FOR EACH ROW EXECUTE FUNCTION public.trigger_classificar_genero();

-- 6. Reclassificação em lote
CREATE OR REPLACE FUNCTION public.reclassificar_genero_sugestoes(p_somente_pendentes boolean DEFAULT true, p_limite integer DEFAULT 5000)
RETURNS TABLE(processadas integer, definidas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  r record;
  v_proc integer := 0;
  v_def integer := 0;
  v_g text;
BEGIN
  IF NOT public.pode_ver_painel_cruzamento() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  FOR r IN
    SELECT s.id FROM public.sugestoes_populares s
    LEFT JOIN public.sugestao_genero g ON g.sugestao_id = s.id
    WHERE coalesce(g.origem, '') <> 'manual'
      AND ((NOT p_somente_pendentes) OR g.sugestao_id IS NULL OR g.genero = 'indefinido')
    ORDER BY s.created_at DESC
    LIMIT p_limite
  LOOP
    v_g := public.classificar_genero_sugestao(r.id);
    v_proc := v_proc + 1;
    IF v_g <> 'indefinido' THEN v_def := v_def + 1; END IF;
  END LOOP;

  RETURN QUERY SELECT v_proc, v_def;
END;
$$;

-- 7. Correção manual
CREATE OR REPLACE FUNCTION public.definir_genero_manual(p_sugestao_id uuid, p_genero text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NOT public.pode_ver_painel_cruzamento() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  IF p_genero NOT IN ('masculino','feminino','indefinido') THEN
    RAISE EXCEPTION 'Gênero inválido';
  END IF;

  INSERT INTO public.sugestao_genero (sugestao_id, genero, origem, confianca)
  VALUES (p_sugestao_id, p_genero, 'manual', 100)
  ON CONFLICT (sugestao_id) DO UPDATE
    SET genero = EXCLUDED.genero, origem = 'manual', confianca = 100, updated_at = now();
END;
$$;

-- 8. RPCs de leitura do painel
CREATE OR REPLACE FUNCTION public.painel_genero_resumo()
RETURNS TABLE(total bigint, masculino bigint, feminino bigint, indefinido bigint, sem_registro bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.pode_ver_painel_cruzamento() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.sugestoes_populares),
    (SELECT count(*) FROM public.sugestao_genero WHERE genero = 'masculino'),
    (SELECT count(*) FROM public.sugestao_genero WHERE genero = 'feminino'),
    (SELECT count(*) FROM public.sugestao_genero WHERE genero = 'indefinido'),
    (SELECT count(*) FROM public.sugestoes_populares s
      LEFT JOIN public.sugestao_genero g ON g.sugestao_id = s.id WHERE g.sugestao_id IS NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.painel_genero_por_regiao()
RETURNS TABLE(mesorregiao text, masculino bigint, feminino bigint, indefinido bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.pode_ver_painel_cruzamento() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT coalesce(m.regiao, 'Não identificada')::text,
         count(*) FILTER (WHERE g.genero = 'masculino'),
         count(*) FILTER (WHERE g.genero = 'feminino'),
         count(*) FILTER (WHERE g.genero IS NULL OR g.genero = 'indefinido')
  FROM public.sugestoes_populares s
  LEFT JOIN public.municipios m ON m.nome = s.municipio
  LEFT JOIN public.sugestao_genero g ON g.sugestao_id = s.id
  GROUP BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.painel_genero_indefinidos(p_limite integer DEFAULT 30, p_offset integer DEFAULT 0)
RETURNS TABLE(sugestao_id uuid, nome text, municipio text, trecho text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.pode_ver_painel_cruzamento() THEN RAISE EXCEPTION 'not authorized'; END IF;
  RETURN QUERY
  SELECT s.id, s.nome, s.municipio, left(coalesce(s.descricao,''), 160), s.created_at
  FROM public.sugestoes_populares s
  LEFT JOIN public.sugestao_genero g ON g.sugestao_id = s.id
  WHERE (g.sugestao_id IS NULL OR g.genero = 'indefinido')
    AND coalesce(btrim(s.nome), '') <> ''
  ORDER BY s.created_at DESC
  LIMIT greatest(p_limite, 1) OFFSET greatest(p_offset, 0);
END;
$$;