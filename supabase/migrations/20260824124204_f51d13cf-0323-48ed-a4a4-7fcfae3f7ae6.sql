-- Popula o módulo "Base de Pesquisas" (pesquisas_eleitorais) a partir da pesquisa PercentBrasil já carregada
delete from pesquisa_cruzamentos where resultado_id in (select id from pesquisa_resultados where pesquisa_id='11111111-2222-4333-8444-555555555555');
delete from pesquisa_respostas where resultado_id in (select id from pesquisa_resultados where pesquisa_id='11111111-2222-4333-8444-555555555555');
delete from pesquisa_resultados where pesquisa_id='11111111-2222-4333-8444-555555555555';
delete from pesquisas_eleitorais where id='11111111-2222-4333-8444-555555555555';

insert into pesquisas_eleitorais (id,titulo,instituto,tipo_pesquisa,data_campo_inicio,data_campo_fim,data_publicacao,registro_tse,universo,amostra_total,margem_erro,nivel_confianca,abrangencia,status,is_active,file_name,metodologia)
select '11111111-2222-4333-8444-555555555555',
 'Pesquisa Eleitoral Mato Grosso — PercentBrasil (Agosto/2026)', s.institute, 'quantitativa',
 s.collection_start, s.collection_end, s.release_date, s.tse_registration,
 'Mato-grossenses com 15 anos ou mais', s.sample_size, s.margin_of_error, 95, 'estadual', 'ativa', true, s.file_name,
 jsonb_build_object('metodologia', s.methodology, 'territorio', s.territory, 'cargos', s.cargos)
from electoral_surveys s
where s.id='93cd3b7c-1f71-4b83-a7b3-9a50ca8288ac';

insert into pesquisa_resultados (id, pesquisa_id, tipo_pergunta, pergunta, cenario_descricao, ordem)
select (md5(q.id::text||'pesq'))::uuid,
 '11111111-2222-4333-8444-555555555555',
 (case q.question_type when 'espontanea' then 'intencao_espontanea' when 'estimulada' then 'intencao_estimulada' when 'rejeicao' then 'rejeicao' else 'outro' end)::pergunta_tipo,
 initcap(q.cargo)||' — '||q.scenario_label,
 q.scenario_label,
 q.sort_order
from survey_questions q
where q.survey_id='93cd3b7c-1f71-4b83-a7b3-9a50ca8288ac';

insert into pesquisa_respostas (resultado_id, opcao, percentual, ordem)
select (md5(r.question_id::text||'pesq'))::uuid, r.candidate_name, r.percentage,
 row_number() over (partition by r.question_id order by r.percentage desc)
from survey_results r
where r.question_id in (select id from survey_questions where survey_id='93cd3b7c-1f71-4b83-a7b3-9a50ca8288ac');

insert into pesquisa_cruzamentos (resultado_id, segmento_tipo, segmento_valor, opcao, percentual)
select (md5(c.question_id::text||'pesq'))::uuid, c.filter_type, c.segment_label, c.candidate_name, c.percentage
from survey_crosstabs c
where c.question_id in (select id from survey_questions where survey_id='93cd3b7c-1f71-4b83-a7b3-9a50ca8288ac');

update pesquisas_eleitorais p set content = (
  select string_agg(bloco, E'\n\n' order by ordem)
  from (
    select res.ordem, '### '||res.pergunta||E'\n'||coalesce((
      select string_agg('- '||a.opcao||': '||a.percentual||'%', E'\n' order by a.percentual desc)
      from pesquisa_respostas a where a.resultado_id = res.id), '(sem respostas)') as bloco
    from pesquisa_resultados res where res.pesquisa_id = p.id
  ) t
)
where p.id='11111111-2222-4333-8444-555555555555';