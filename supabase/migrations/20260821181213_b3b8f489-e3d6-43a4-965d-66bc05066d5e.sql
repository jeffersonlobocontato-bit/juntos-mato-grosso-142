-- Cruzamento Wellington access
CREATE TABLE IF NOT EXISTS public.cruzamento_wellington_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cruzamento_wellington_access TO authenticated;
GRANT ALL ON public.cruzamento_wellington_access TO service_role;
ALTER TABLE public.cruzamento_wellington_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_master manages cruzamento_wellington_access" ON public.cruzamento_wellington_access
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "user sees own cruzamento_wellington_access" ON public.cruzamento_wellington_access
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Municipality associations (Mapa Estratégico)
CREATE TABLE IF NOT EXISTS public.municipality_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acronym text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);
CREATE TABLE IF NOT EXISTS public.association_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id uuid NOT NULL REFERENCES public.municipality_associations(id) ON DELETE CASCADE,
  municipality_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.municipality_associations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.association_members TO authenticated;
GRANT ALL ON public.municipality_associations TO service_role;
GRANT ALL ON public.association_members TO service_role;
ALTER TABLE public.municipality_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.association_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read municipality_associations" ON public.municipality_associations
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read association_members" ON public.association_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage municipality_associations" ON public.municipality_associations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage association_members" ON public.association_members
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Base de Pesquisas
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.electoral_surveys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_results TO authenticated;
GRANT ALL ON public.electoral_surveys TO service_role;
GRANT ALL ON public.survey_questions TO service_role;
GRANT ALL ON public.survey_results TO service_role;
ALTER TABLE public.electoral_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read electoral_surveys" ON public.electoral_surveys
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "authenticated read survey_questions" ON public.survey_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read survey_results" ON public.survey_results
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage electoral_surveys" ON public.electoral_surveys FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage survey_questions" ON public.survey_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage survey_results" ON public.survey_results FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- Tracking eleitoral
CREATE TABLE IF NOT EXISTS public.tracking_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  city text,
  state text DEFAULT 'MT',
  territory_scope text NOT NULL DEFAULT 'municipio',
  macroregion_id text,
  microregion text,
  municipality text,
  start_date date NOT NULL,
  end_date date,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','aberta','fechada','em_analise')),
  target_interviews integer NOT NULL DEFAULT 0,
  share_code text UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tracking_round_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.tracking_rounds(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  label text NOT NULL,
  description text,
  question_type text NOT NULL DEFAULT 'text' CHECK (question_type IN ('text','select','multiselect','scale')),
  options jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT true,
  allow_other boolean NOT NULL DEFAULT false,
  conditional_question_key text,
  conditional_value text
);
CREATE TABLE IF NOT EXISTS public.tracking_interviewers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tracking_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.tracking_rounds(id) ON DELETE CASCADE,
  interviewer_id uuid REFERENCES auth.users(id),
  lat double precision,
  lng double precision,
  municipality text,
  microregion text,
  macroregion_id text,
  respondent_age_range text,
  respondent_gender text,
  respondent_education text,
  respondent_income text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tracking_interview_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.tracking_interviews(id) ON DELETE CASCADE,
  question_key text NOT NULL,
  answer_value text NOT NULL,
  candidate_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.tracking_rounds(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tracking_ai_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.tracking_rounds(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  config jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tracking_ai_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.tracking_rounds(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.tracking_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.tracking_rounds(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tracking_rounds','tracking_round_questions','tracking_interviewers',
    'tracking_interviews','tracking_interview_answers','tracking','tracking_ai_config',
    'tracking_ai_knowledge','tracking_ai_messages']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;
CREATE POLICY "authenticated read tracking_rounds" ON public.tracking_rounds
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "admins manage tracking_rounds" ON public.tracking_rounds FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "authenticated read tracking_round_questions" ON public.tracking_round_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage tracking_round_questions" ON public.tracking_round_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "authenticated read tracking_interviewers" ON public.tracking_interviewers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage tracking_interviewers" ON public.tracking_interviewers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "authenticated insert tracking_interviews" ON public.tracking_interviews
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admins read tracking_interviews" ON public.tracking_interviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role) OR interviewer_id = auth.uid());
CREATE POLICY "admins update tracking_interviews" ON public.tracking_interviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins delete tracking_interviews" ON public.tracking_interviews FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "authenticated insert tracking_interview_answers" ON public.tracking_interview_answers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admins read tracking_interview_answers" ON public.tracking_interview_answers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage tracking" ON public.tracking FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage tracking_ai_config" ON public.tracking_ai_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage tracking_ai_knowledge" ON public.tracking_ai_knowledge FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "users manage own tracking_ai_messages" ON public.tracking_ai_messages FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'::app_role));
CREATE POLICY "public read open rounds by share_code" ON public.tracking_rounds
  FOR SELECT TO anon USING (status = 'aberta' AND deleted_at IS NULL);
CREATE POLICY "public read questions of open rounds" ON public.tracking_round_questions
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.tracking_rounds r WHERE r.id = round_id AND r.status = 'aberta')
  );
GRANT SELECT ON public.tracking_rounds TO anon;
GRANT SELECT ON public.tracking_round_questions TO anon;