DROP FUNCTION IF EXISTS public.painel_cruzamento_resumo();

CREATE OR REPLACE FUNCTION public.painel_cruzamento_resumo()
RETURNS TABLE(total_sugestoes bigint, total_municipios bigint, total_regioes bigint, total_eixos bigint, total_nao_identificados bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select
    (select count(*) from public.sugestoes_populares),
    (select count(distinct m.nome) from public.sugestoes_populares s join public.municipios m on m.nome = s.municipio),
    (select count(distinct m.regiao) from public.sugestoes_populares s join public.municipios m on m.nome = s.municipio),
    (select count(distinct coalesce(eixo,'Não classificado')) from public.sugestoes_populares),
    (select count(*) from public.sugestoes_populares s left join public.municipios m on m.nome = s.municipio where m.id is null);
end;
$function$;