-- Módulo "Base de Pesquisas" — pesquisas eleitorais quantitativas.
-- Portado da plataforma Politiza IA (politiza.ia.br).

CREATE TABLE IF NOT EXISTS public.electoral_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute text NOT NULL,
  territory text NOT NULL,
  cargos text[] NOT NULL DEFAULT '{}',
  collection_start date,
  collection_end date,
  release_date date NOT NULL,
  sample_size integer NOT NULL,
  margin_of_error numeric(4,2) NOT NULL,
  methodology text,
  tse_registration text,
  file_name text,
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES public.electoral_surveys(id) ON DELETE CASCADE,
  cargo text NOT NULL,
  question_type text NOT NULL,
  scenario_label text NOT NULL,
  note text,
  sort_order integer NOT NULL DEFAULT 0,
  is_multiple_choice boolean NOT NULL DEFAULT false,
  is_main_scenario boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.survey_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  candidate_name text NOT NULL,
  percentage numeric(5,2) NOT NULL,
  is_excluded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.electoral_surveys TO authenticated;
GRANT SELECT ON public.survey_questions TO authenticated;
GRANT SELECT ON public.survey_results TO authenticated;
GRANT ALL ON public.electoral_surveys TO service_role;
GRANT ALL ON public.survey_questions TO service_role;
GRANT ALL ON public.survey_results TO service_role;

ALTER TABLE public.electoral_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read electoral_surveys"
  ON public.electoral_surveys FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "authenticated read survey_questions"
  ON public.survey_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read survey_results"
  ON public.survey_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins manage electoral_surveys"
  ON public.electoral_surveys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage survey_questions"
  ON public.survey_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage survey_results"
  ON public.survey_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));
