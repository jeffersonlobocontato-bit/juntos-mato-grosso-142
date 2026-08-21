WITH survey AS (
  INSERT INTO public.electoral_surveys (
    institute, territory, cargos, collection_start, collection_end, release_date,
    sample_size, margin_of_error, methodology, tse_registration, file_name
  ) VALUES (
    'PercentBrasil',
    'Estado de Mato Grosso',
    ARRAY['governador','senador'],
    '2026-08-07', '2026-08-10', '2026-08-16',
    1200, 2.83,
    'Pesquisa domiciliar por meio de entrevistas face to face, questionário estruturado. Público-alvo: mato-grossenses com 15 anos ou mais. Amostragem por cotas (sexo, idade, grau de instrução, renda, profissão, região, tempo de moradia). 7 regiões: Centro-Sul, Sudeste, Nordeste, Oeste, Noroeste, Médio Norte e Norte. Nível de confiança de 95%. Fonte dos dados: IBGE Censo 2022, PNAD 2025, TSE 2026.',
    'BR-01495/2026 e MT-03154/2026',
    'Relatorio_de_Pesquisa_Quantitativa_Eleitoral_Estado_de_Mato_Grosso_5_1408.pdf'
  )
  RETURNING id
),
q0 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'governador', 'espontanea', 'Espontânea', 0, false, true FROM survey RETURNING id
),
q1 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'governador', 'estimulada', 'Estimulada', 1, false, true FROM survey RETURNING id
),
q2 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'governador', 'rejeicao', 'Rejeição (Estimulada)', 2, false, false FROM survey RETURNING id
),
q3 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'governador', 'estimulada', '2º Turno · Cenário 1', 3, false, false FROM survey RETURNING id
),
q4 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'governador', 'estimulada', '2º Turno · Cenário 2', 4, false, false FROM survey RETURNING id
),
q5 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'governador', 'estimulada', '2º Turno · Cenário 3', 5, false, false FROM survey RETURNING id
),
q6 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'governador', 'estimulada', '2º Turno · Cenário 4', 6, false, false FROM survey RETURNING id
),
q7 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'governador', 'estimulada', '2º Turno · Cenário 5', 7, false, false FROM survey RETURNING id
),
q8 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'senador', 'espontanea', 'Espontânea', 0, false, true FROM survey RETURNING id
),
q9 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'senador', 'estimulada', 'Estimulada (soma 1ª e 2ª opção)', 1, true, true FROM survey RETURNING id
),
q10 AS (
  INSERT INTO public.survey_questions (survey_id, cargo, question_type, scenario_label, sort_order, is_multiple_choice, is_main_scenario)
  SELECT id, 'senador', 'rejeicao', 'Rejeição (Estimulada)', 2, false, false FROM survey RETURNING id
),
results_data AS (
  SELECT q0.id AS question_id, x.name, x.pct FROM q0, (VALUES ('Wellington Fagundes', 10.6), ('Otaviano Pivetta', 9.3), ('Natasha Slhessarenko', 1.7), ('Rafael Millas', 0.3), ('Sargento Lau', 0.3), ('Nulo/Branco', 3.4), ('NS/Indeciso', 72.4), ('NR', 2.0)) AS x(name, pct)
  UNION ALL
  SELECT q1.id, x.name, x.pct FROM q1, (VALUES ('Wellington Fagundes', 32.0), ('Otaviano Pivetta', 21.0), ('Natasha Slhessarenko', 11.0), ('Sargento Lau', 2.1), ('Rafael Millas', 1.1), ('Maurício Coelho', 0.8), ('Nulo/Branco', 7.5), ('NS/Indeciso', 24.5)) AS x(name, pct)
  UNION ALL
  SELECT q2.id, x.name, x.pct FROM q2, (VALUES ('Wellington Fagundes', 8.1), ('Otaviano Pivetta', 7.5), ('Natasha Slhessarenko', 5.3), ('Rafael Millas', 4.3), ('Sargento Lau', 3.6), ('Maurício Coelho', 3.0), ('Nenhum', 22.9), ('NS', 39.9), ('NR', 5.4)) AS x(name, pct)
  UNION ALL
  SELECT q3.id, x.name, x.pct FROM q3, (VALUES ('Wellington Fagundes', 40.8), ('Natasha Slhessarenko', 15.2), ('Nulo/Branco', 10.5), ('NS/Indeciso', 32.5), ('NR', 1.0)) AS x(name, pct)
  UNION ALL
  SELECT q4.id, x.name, x.pct FROM q4, (VALUES ('Wellington Fagundes', 34.8), ('Otaviano Pivetta', 24.0), ('Nulo/Branco', 9.6), ('NS/Indeciso', 30.2), ('NR', 1.4)) AS x(name, pct)
  UNION ALL
  SELECT q5.id, x.name, x.pct FROM q5, (VALUES ('Wellington Fagundes', 43.4), ('Sargento Lau', 5.7), ('Nulo/Branco', 12.8), ('NS/Indeciso', 36.8), ('NR', 1.3)) AS x(name, pct)
  UNION ALL
  SELECT q6.id, x.name, x.pct FROM q6, (VALUES ('Wellington Fagundes', 44.8), ('Rafael Millas', 4.3), ('Nulo/Branco', 12.3), ('NS/Indeciso', 37.3), ('NR', 1.3)) AS x(name, pct)
  UNION ALL
  SELECT q7.id, x.name, x.pct FROM q7, (VALUES ('Wellington Fagundes', 44.3), ('Maurício Coelho', 3.4), ('Nulo/Branco', 13.0), ('NS/Indeciso', 37.0), ('NR', 2.3)) AS x(name, pct)
  UNION ALL
  SELECT q8.id, x.name, x.pct FROM q8, (VALUES ('Mauro Mendes', 9.8), ('Janaina Riva', 4.5), ('José Medeiros', 2.8), ('Carlos Fávaro', 2.2), ('Pedro Taques', 1.7), ('Antonio Galvan', 0.8), ('Coronel Darwin', 0.1), ('Margareth Buzetti', 0.1), ('Nulo/Branco', 3.3), ('NS/Indeciso', 71.1), ('NR', 3.6)) AS x(name, pct)
  UNION ALL
  SELECT q9.id, x.name, x.pct FROM q9, (VALUES ('Mauro Mendes', 20.0), ('Janaina Riva', 18.9), ('José Medeiros', 9.3), ('Carlos Fávaro', 9.1), ('Pedro Taques', 7.3), ('Antonio Galvan', 3.0), ('Professor Nelson Ferreira', 1.2), ('Coronel Darwin', 1.1), ('Margareth Buzetti', 0.9), ('Beny Godoy', 0.4), ('Nulo/Branco', 4.7), ('NS/Indeciso', 22.1), ('NR', 2.0)) AS x(name, pct)
  UNION ALL
  SELECT q10.id, x.name, x.pct FROM q10, (VALUES ('Mauro Mendes', 8.8), ('Pedro Taques', 7.1), ('Janaina Riva', 4.0), ('Carlos Fávaro', 2.8), ('José Medeiros', 2.8), ('Coronel Darwin', 2.4), ('Antonio Galvan', 2.1), ('Beny Godoy', 1.6), ('Professor Nelson Ferreira', 1.4), ('Margareth Buzetti', 1.0), ('Nenhum', 8.9), ('NS', 48.8), ('NR', 8.3)) AS x(name, pct)
)
INSERT INTO public.survey_results (question_id, candidate_name, percentage)
SELECT question_id, name, pct FROM results_data;