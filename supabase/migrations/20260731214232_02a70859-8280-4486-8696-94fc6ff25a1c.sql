CREATE OR REPLACE FUNCTION public.painel_cruzamento_resumo()
 RETURNS TABLE(total_sugestoes bigint, total_municipios bigint, total_regioes bigint, total_eixos bigint, total_nao_identificados bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select
    (select count(*) from public.sugestoes_populares),
    (select count(distinct m.nome) from public.sugestoes_populares s join public.municipios m on m.nome = s.municipio),
    (select count(distinct m.regiao) from public.sugestoes_populares s join public.municipios m on m.nome = s.municipio),
    (select count(*) from public.eixos_tematicos e
      where exists (
        select 1 from public.sugestoes_populares s
        where lower(public.unaccent(s.eixo)) = lower(public.unaccent(e.nome))
      )
      or exists (
        select 1 from public.sugestao_taxonomia st where st.eixo_id = e.id
      )),
    (select count(*) from public.sugestoes_populares s left join public.municipios m on m.nome = s.municipio where m.id is null);
end;
$function$;