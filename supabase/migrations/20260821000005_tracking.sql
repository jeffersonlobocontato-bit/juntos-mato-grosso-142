-- Módulo "Tracking" — coleta de campo (rodadas de entrevistas presenciais,
-- entrevistadores, respostas). Portado da plataforma Politiza IA (politiza.ia.br).
-- Adaptado: removido candidate_id (o Politiza suporta múltiplos candidatos por
-- conta, a Juntos Mato Grosso 142 é uma plataforma de candidato único).

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

-- Tabela genérica "tracking" (usada para eventos/metadados avulsos do módulo)
CREATE TABLE IF NOT EXISTS public.tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid REFERENCES public.tracking_rounds(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Configuração e conhecimento do agente de IA do módulo (opcional, para uso futuro)
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

-- ─── Grants + RLS ──────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tracking_rounds','tracking_round_questions','tracking_interviewers',
    'tracking_interviews','tracking_interview_answers','tracking','tracking_ai_config',
    'tracking_ai_knowledge','tracking_ai_messages']
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- tracking_rounds: leitura para autenticados (equipe de campo precisa ver rodadas ativas),
-- escrita restrita a admin/admin_master
CREATE POLICY "authenticated read tracking_rounds" ON public.tracking_rounds
  FOR SELECT TO authenticated USING (deleted_at IS NULL);
CREATE POLICY "admins manage tracking_rounds" ON public.tracking_rounds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated read tracking_round_questions" ON public.tracking_round_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage tracking_round_questions" ON public.tracking_round_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated read tracking_interviewers" ON public.tracking_interviewers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage tracking_interviewers" ON public.tracking_interviewers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));

-- tracking_interviews / tracking_interview_answers: qualquer usuário autenticado pode
-- inserir (entrevistador em campo), leitura/gestão para admins
CREATE POLICY "authenticated insert tracking_interviews" ON public.tracking_interviews
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admins read tracking_interviews" ON public.tracking_interviews
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin') OR interviewer_id = auth.uid());
CREATE POLICY "admins manage tracking_interviews" ON public.tracking_interviews
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete tracking_interviews" ON public.tracking_interviews
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "authenticated insert tracking_interview_answers" ON public.tracking_interview_answers
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admins read tracking_interview_answers" ON public.tracking_interview_answers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage tracking" ON public.tracking
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage tracking_ai_config" ON public.tracking_ai_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage tracking_ai_knowledge" ON public.tracking_ai_knowledge
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_master') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users manage own tracking_ai_messages" ON public.tracking_ai_messages
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_master'));

-- Acesso público (anon) de LEITURA a rodadas abertas via share_code — necessário
-- para o formulário de campo funcionar sem exigir login de cada entrevistador.
CREATE POLICY "public read open rounds by share_code" ON public.tracking_rounds
  FOR SELECT TO anon USING (status = 'aberta' AND deleted_at IS NULL);
CREATE POLICY "public read questions of open rounds" ON public.tracking_round_questions
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM public.tracking_rounds r WHERE r.id = round_id AND r.status = 'aberta')
  );
GRANT SELECT ON public.tracking_rounds TO anon;
GRANT SELECT ON public.tracking_round_questions TO anon;
