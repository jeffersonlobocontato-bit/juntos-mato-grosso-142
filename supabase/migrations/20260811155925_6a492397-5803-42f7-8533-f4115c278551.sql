CREATE OR REPLACE FUNCTION public.painel_cruzamento_lista_sugestoes(
  p_eixo text DEFAULT NULL,
  p_regiao text DEFAULT NULL,
  p_municipio text DEFAULT NULL,
  p_genero text DEFAULT NULL,
  p_limit integer DEFAULT 400,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, municipio text, mesorregiao text, eixo text, descricao text, genero text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select s.id,
         coalesce(s.municipio,'Não informado'),
         coalesce(m.regiao,'Não identificada'),
         coalesce(nullif(s.eixo,''),'Geral'),
         coalesce(s.descricao,''),
         coalesce(g.genero,'indefinido'),
         s.created_at
  from public.sugestoes_populares s
  left join public.municipios m on m.nome = s.municipio
  left join public.sugestao_genero g on g.sugestao_id = s.id
  where (p_eixo is null or coalesce(nullif(s.eixo,''),'Geral') = p_eixo)
    and (p_regiao is null or coalesce(m.regiao,'Não identificada') = p_regiao)
    and (p_municipio is null or s.municipio = p_municipio)
    and (p_genero is null or coalesce(g.genero,'indefinido') = p_genero)
    and coalesce(s.descricao,'') <> ''
  order by s.created_at desc
  limit greatest(1, least(coalesce(p_limit,400), 1000))
  offset coalesce(p_offset,0);
end; $function$;

REVOKE ALL ON FUNCTION public.painel_cruzamento_lista_sugestoes(text,text,text,text,integer,integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.painel_cruzamento_lista_sugestoes(text,text,text,text,integer,integer) TO authenticated, service_role;