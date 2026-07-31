
create extension if not exists unaccent;

create table if not exists public.sugestao_classificacao_semantica (
  sugestao_id uuid not null references public.sugestoes_populares(id) on delete cascade,
  eixo_detectado text not null,
  subeixo_detectado text not null default '',
  origem text not null default 'auto',
  created_at timestamptz not null default now(),
  primary key (sugestao_id, eixo_detectado, subeixo_detectado)
);

grant select on public.sugestao_classificacao_semantica to authenticated;
grant all on public.sugestao_classificacao_semantica to service_role;
alter table public.sugestao_classificacao_semantica enable row level security;

drop policy if exists "admins read classificacao semantica" on public.sugestao_classificacao_semantica;
create policy "admins read classificacao semantica"
on public.sugestao_classificacao_semantica for select to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'admin_master') or public.has_role(auth.uid(),'lider_tematico'));

create or replace function public.classificar_sugestao(p_texto text)
returns table(eixo text, subeixo text)
language plpgsql
immutable
set search_path = public, extensions
as $$
declare
  v_txt text := lower(public.unaccent(coalesce(p_texto,'')));
begin
  if v_txt ~ 'seguranca|policia|policial|pmpr|viatura|policiamento|delegacia|guarda municipal|vigilancia' then
    return query select 'Segurança, Justiça, Combate à Corrupção'::text, 'Segurança Pública'::text;
  end if;
  if v_txt ~ 'droga|trafico|traficante|proerd|drogadicao' then
    return query select 'Segurança, Justiça, Combate à Corrupção'::text, 'Combate às Drogas'::text;
  end if;
  if v_txt ~ 'justica|presidio|penitenciari|cadeia|preso|corrupcao|impunidade' then
    return query select 'Segurança, Justiça, Combate à Corrupção'::text, 'Justiça e Sistema Prisional'::text;
  end if;
  if v_txt ~ 'violencia|crime|criminalidade|assalto|roubo|furto|homicidio|feminicidio' then
    return query select 'Segurança, Justiça, Combate à Corrupção'::text, 'Violência e Criminalidade'::text;
  end if;

  if v_txt ~ 'saude|hospital|posto de saude|sus |medico|vacina|saude mental' then
    return query select 'Desenvolvimento Social'::text, 'Saúde'::text;
  end if;
  if v_txt ~ 'educacao|escola|professor|aluno|creche|universidade|faculdade|ensino' then
    return query select 'Desenvolvimento Social'::text, 'Educação'::text;
  end if;
  if v_txt ~ 'assistencia social|cras|vulnerabilidade|bolsa familia|pobreza|fome' then
    return query select 'Desenvolvimento Social'::text, 'Assistência Social'::text;
  end if;
  if v_txt ~ 'esporte|cultura|lazer' then
    return query select 'Desenvolvimento Social'::text, 'Esporte e Cultura'::text;
  end if;

  if v_txt ~ 'emprego|desemprego|trabalho|renda' then
    return query select 'Desenvolvimento Econômico Sustentável'::text, 'Emprego e Renda'::text;
  end if;
  if v_txt ~ 'agricultura|agronegocio|produtor rural|agropecuari' then
    return query select 'Desenvolvimento Econômico Sustentável'::text, 'Agronegócio'::text;
  end if;
  if v_txt ~ 'turismo|comercio|empreendedor|industria' then
    return query select 'Desenvolvimento Econômico Sustentável'::text, 'Turismo e Comércio'::text;
  end if;
  if v_txt ~ 'meio ambiente|sustentabilidade|energia' then
    return query select 'Desenvolvimento Econômico Sustentável'::text, 'Meio Ambiente'::text;
  end if;

  if v_txt ~ 'estrada|rodovia|asfalto|pavimentacao|ponte|transporte publico|onibus|pedagio|ferrovia' then
    return query select 'Desenvolvimento das Cidades e Infraestrutura'::text, 'Mobilidade e Transporte'::text;
  end if;
  if v_txt ~ 'saneamento|esgoto|agua encanada|drenagem' then
    return query select 'Desenvolvimento das Cidades e Infraestrutura'::text, 'Saneamento e Água'::text;
  end if;
  if v_txt ~ 'habitacao|moradia|cohab' then
    return query select 'Desenvolvimento das Cidades e Infraestrutura'::text, 'Habitação'::text;
  end if;
  if v_txt ~ 'internet|infraestrutura|obra publica|calcamento|zoneamento' then
    return query select 'Desenvolvimento das Cidades e Infraestrutura'::text, 'Conectividade e Obras'::text;
  end if;

  if v_txt ~ 'transparencia|compliance|licitacao|burocracia|auditoria' then
    return query select 'Gestão Pública Eficiente'::text, 'Transparência e Combate à Burocracia'::text;
  end if;
  if v_txt ~ 'gestao publica|eficiencia|servidor publico|concurso publico|digitalizacao' then
    return query select 'Gestão Pública Eficiente'::text, 'Eficiência e Servidor Público'::text;
  end if;

  return;
end;
$$;

create or replace function public.trigger_classificar_sugestao()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.sugestao_classificacao_semantica where sugestao_id = new.id;
  insert into public.sugestao_classificacao_semantica (sugestao_id, eixo_detectado, subeixo_detectado)
  select new.id, c.eixo, coalesce(c.subeixo,'') from public.classificar_sugestao(new.descricao) c
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_classificar_sugestao on public.sugestoes_populares;
create trigger trg_classificar_sugestao
after insert or update of descricao on public.sugestoes_populares
for each row execute function public.trigger_classificar_sugestao();

-- backfill
insert into public.sugestao_classificacao_semantica (sugestao_id, eixo_detectado, subeixo_detectado)
select s.id, c.eixo, coalesce(c.subeixo,'')
from public.sugestoes_populares s
cross join lateral public.classificar_sugestao(s.descricao) c
on conflict do nothing;

-- guard helper
create or replace function public.pode_ver_painel_cruzamento()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'admin_master') or public.has_role(auth.uid(),'lider_tematico');
$$;

create or replace function public.painel_cruzamento_resumo()
returns table(total_sugestoes bigint, total_municipios bigint, total_regioes bigint, total_eixos bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select (select count(*) from public.sugestoes_populares),
         (select count(distinct municipio) from public.sugestoes_populares where municipio is not null),
         (select count(distinct m.regiao) from public.sugestoes_populares s join public.municipios m on m.nome = s.municipio),
         (select count(distinct coalesce(eixo,'Não classificado')) from public.sugestoes_populares);
end; $$;

create or replace function public.painel_cruzamento_por_regiao()
returns table(mesorregiao text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select m.regiao, count(*) from public.sugestoes_populares s
  join public.municipios m on m.nome = s.municipio
  group by m.regiao order by 2 desc;
end; $$;

create or replace function public.painel_cruzamento_por_eixo()
returns table(eixo text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select coalesce(s.eixo,'Não classificado'), count(*) from public.sugestoes_populares s
  group by 1 order by 2 desc;
end; $$;

create or replace function public.painel_cruzamento_regiao_eixo()
returns table(mesorregiao text, eixo text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select m.regiao, coalesce(s.eixo,'Não classificado'), count(*) from public.sugestoes_populares s
  join public.municipios m on m.nome = s.municipio
  group by 1,2 order by 3 desc;
end; $$;

create or replace function public.painel_cruzamento_ranking_cidades()
returns table(municipio text, mesorregiao text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select s.municipio, coalesce(m.regiao,'Não identificada'), count(*)
  from public.sugestoes_populares s
  left join public.municipios m on m.nome = s.municipio
  where s.municipio is not null and s.municipio <> ''
  group by 1,2 order by 3 desc;
end; $$;

create or replace function public.painel_cruzamento_semantico_regiao()
returns table(mesorregiao text, eixo_detectado text, subeixo_detectado text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select coalesce(m.regiao,'Não identificada'), c.eixo_detectado, c.subeixo_detectado, count(*)
  from public.sugestao_classificacao_semantica c
  join public.sugestoes_populares s on s.id = c.sugestao_id
  left join public.municipios m on m.nome = s.municipio
  group by 1,2,3 order by 4 desc;
end; $$;

create or replace function public.painel_cruzamento_reclassificacao()
returns table(geral_total bigint, geral_com_tema bigint, geral_sem_tema bigint, multi_tema bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  with g as (select s.id from public.sugestoes_populares s where coalesce(s.eixo,'Geral') in ('Geral','Não classificado')),
  ct as (select c.sugestao_id, count(distinct c.eixo_detectado) as n from public.sugestao_classificacao_semantica c group by 1)
  select (select count(*) from g),
         (select count(*) from g join ct on ct.sugestao_id = g.id),
         (select count(*) from g left join ct on ct.sugestao_id = g.id where ct.sugestao_id is null),
         (select count(*) from g join ct on ct.sugestao_id = g.id where ct.n >= 2);
end; $$;

create or replace function public.painel_cruzamento_nuvem_palavras(p_limit int default 80)
returns table(palavra text, freq bigint)
language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  select w.word::text, count(*)::bigint
  from public.sugestoes_populares s,
       lateral unnest(tsvector_to_array(to_tsvector('portuguese', coalesce(s.descricao,'')))) as w(word)
  where length(w.word) > 3 and w.word !~ '^[0-9]+$'
  group by 1 order by 2 desc limit greatest(p_limit, 1);
end; $$;

create or replace function public.painel_cruzamento_cidade_eixo(p_limit int default 20)
returns table(municipio text, eixo text, total bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.pode_ver_painel_cruzamento() then raise exception 'not authorized'; end if;
  return query
  with top as (
    select s.municipio, count(*) as t from public.sugestoes_populares s
    where s.municipio is not null and s.municipio <> ''
    group by 1 order by 2 desc limit greatest(p_limit,1)
  )
  select s.municipio, coalesce(s.eixo,'Não classificado'), count(*)
  from public.sugestoes_populares s join top on top.municipio = s.municipio
  group by 1,2;
end; $$;

revoke all on function public.painel_cruzamento_resumo() from anon;
revoke all on function public.painel_cruzamento_por_regiao() from anon;
revoke all on function public.painel_cruzamento_por_eixo() from anon;
revoke all on function public.painel_cruzamento_regiao_eixo() from anon;
revoke all on function public.painel_cruzamento_ranking_cidades() from anon;
revoke all on function public.painel_cruzamento_semantico_regiao() from anon;
revoke all on function public.painel_cruzamento_reclassificacao() from anon;
revoke all on function public.painel_cruzamento_nuvem_palavras(int) from anon;
revoke all on function public.painel_cruzamento_cidade_eixo(int) from anon;

grant execute on function public.painel_cruzamento_resumo() to authenticated;
grant execute on function public.painel_cruzamento_por_regiao() to authenticated;
grant execute on function public.painel_cruzamento_por_eixo() to authenticated;
grant execute on function public.painel_cruzamento_regiao_eixo() to authenticated;
grant execute on function public.painel_cruzamento_ranking_cidades() to authenticated;
grant execute on function public.painel_cruzamento_semantico_regiao() to authenticated;
grant execute on function public.painel_cruzamento_reclassificacao() to authenticated;
grant execute on function public.painel_cruzamento_nuvem_palavras(int) to authenticated;
grant execute on function public.painel_cruzamento_cidade_eixo(int) to authenticated;

alter publication supabase_realtime add table public.sugestoes_populares;
