DROP FUNCTION IF EXISTS public.painel_cruzamento_nuvem_palavras(integer);

CREATE OR REPLACE FUNCTION public.painel_cruzamento_nuvem_palavras(p_limit integer DEFAULT 80)
RETURNS TABLE(palavra text, nivel text, freq bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;

  return query
  with termos as (
    select e.nome as termo, 'eixo'::text as nivel from public.eixos_tematicos e
    union all
    select t.nome, 'tema'::text from public.temas t
    union all
    select s.nome, 'subtema'::text from public.subtemas s
  ),
  variantes as (
    select tm.termo, tm.nivel,
           lower(public.unaccent(btrim(v.parte))) as chave
    from termos tm,
         lateral unnest(
           string_to_array(
             replace(replace(replace(tm.termo, ' e ', ','), ' / ', ','), ';', ','),
             ','
           )
         ) as v(parte)
    where length(btrim(v.parte)) >= 4
  ),
  sug as (
    select s.id, lower(public.unaccent(coalesce(s.descricao, ''))) as txt
    from public.sugestoes_populares s
  ),
  hits as (
    select distinct va.termo, va.nivel, sg.id
    from variantes va
    join sug sg on sg.txt ~ ('\m' || regexp_replace(va.chave, '([\\.^$|()\[\]*+?{}])', '\\\1', 'g') || 's?\M')
  )
  select h.termo, h.nivel, count(distinct h.id)::bigint as freq
  from hits h
  group by 1, 2
  order by 3 desc
  limit greatest(p_limit, 1);
end;
$function$;