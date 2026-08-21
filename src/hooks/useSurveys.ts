import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as db } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { PollWave, PollQuestion } from '@/data/pollsData';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DbSurvey {
  id: string;
  institute: string;
  territory: string;
  cargos: string[];
  collection_start: string | null;
  collection_end: string | null;
  release_date: string;
  sample_size: number;
  margin_of_error: number;
  methodology: string | null;
  tse_registration: string | null;
  file_name: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSurveyQuestion {
  id: string;
  survey_id: string;
  cargo: string;
  question_type: string;
  scenario_label: string;
  note: string | null;
  sort_order: number;
  is_multiple_choice: boolean;
  is_main_scenario: boolean;
  created_at: string;
}

export interface DbSurveyResult {
  id: string;
  question_id: string;
  candidate_name: string;
  percentage: number;
  is_excluded: boolean;
  created_at: string;
}

// ─── Converters ───────────────────────────────────────────────────────────────
export function dbSurveyToWave(s: DbSurvey): PollWave {
  return {
    id: s.id,
    institute: s.institute,
    territory: s.territory,
    cargos: s.cargos as any[],
    collectionStart: s.collection_start ?? s.release_date,
    collectionEnd: s.collection_end ?? s.release_date,
    releaseDate: s.release_date,
    sampleSize: s.sample_size,
    marginOfError: Number(s.margin_of_error),
    methodology: s.methodology ?? '',
    tseRegistration: s.tse_registration ?? '',
    fileName: s.file_name ?? undefined,
  };
}

export function dbQuestionToPoll(
  q: DbSurveyQuestion,
  results: DbSurveyResult[],
): PollQuestion {
  return {
    id: q.id,
    waveId: q.survey_id,
    cargo: q.cargo as any,
    questionType: q.question_type as any,
    scenarioLabel: q.scenario_label,
    note: q.note ?? undefined,
    isMultipleChoice: (q as any).is_multiple_choice ?? false,
    isMainScenario: (q as any).is_main_scenario ?? false,
    results: results
      .filter(r => r.question_id === q.id)
      .map(r => ({ candidate: r.candidate_name, percentage: Number(r.percentage) }))
      .sort((a, b) => b.percentage - a.percentage),
    crossTabs: [],
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Fetch all surveys with their questions and results */
export function useSurveys() {
  return useQuery({
    queryKey: ['surveys'],
    queryFn: async () => {
      const [{ data: surveys, error: e1 }, { data: questions, error: e2 }, { data: results, error: e3 }] =
        await Promise.all([
          db.from('electoral_surveys' as any).select('*').is('deleted_at', null).order('release_date', { ascending: false }),
          db.from('survey_questions' as any).select('*').order('sort_order'),
          db.from('survey_results' as any).select('*'),
        ]);

      if (e1 || e2 || e3) {
        // Table may not exist yet — return empty
        return { waves: [] as PollWave[], questions: [] as PollQuestion[] };
      }

      const waves: PollWave[] = ((surveys as unknown as DbSurvey[]) ?? []).map(dbSurveyToWave);
      const dbQuestions = ((questions as unknown as DbSurveyQuestion[]) ?? []);
      const dbResults = ((results as unknown as DbSurveyResult[]) ?? []);

      const pollQuestions: PollQuestion[] = dbQuestions.map(q =>
        dbQuestionToPoll(q, dbResults),
      );

      return { waves, questions: pollQuestions };
    },
    staleTime: 120_000,
  });
}

/** Create a new survey wave + questions + results in one shot */
export function useCreateSurvey() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      wave,
      questions,
    }: {
      wave: PollWave;
      questions: PollQuestion[];
    }) => {
      // 1. Insert survey
      const { data: survey, error: e1 } = await (db as any)
        .from('electoral_surveys')
        .insert({
          institute: wave.institute,
          territory: wave.territory,
          cargos: wave.cargos,
          collection_start: wave.collectionStart || null,
          collection_end: wave.collectionEnd || null,
          release_date: wave.releaseDate,
          sample_size: wave.sampleSize,
          margin_of_error: wave.marginOfError,
          methodology: wave.methodology || null,
          tse_registration: wave.tseRegistration || null,
          file_name: wave.fileName || null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (e1) throw e1;

      const surveyId: string = survey.id;

      // 2. Insert questions
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: dbQ, error: e2 } = await (db as any)
          .from('survey_questions')
          .insert({
            survey_id: surveyId,
            cargo: q.cargo,
            question_type: q.questionType,
            scenario_label: q.scenarioLabel,
            note: q.note ?? null,
            sort_order: i,
            is_multiple_choice: q.isMultipleChoice ?? false,
            is_main_scenario: q.isMainScenario ?? false,
          })
          .select()
          .single();
        if (e2) throw e2;

        // 3. Insert results
        if (q.results.length > 0) {
          const { error: e3 } = await (db as any)
            .from('survey_results')
            .insert(
              q.results.map(r => ({
                question_id: dbQ.id,
                candidate_name: r.candidate,
                percentage: r.percentage,
              })),
            );
          if (e3) throw e3;
        }
      }

      return surveyId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Pesquisa importada e salva no banco!');
    },
    onError: (e: any) => toast.error(`Erro ao salvar pesquisa: ${e.message}`),
  });
}

/** Update an existing survey wave + questions + results */
export function useUpdateSurvey() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      surveyId,
      wave,
      questions,
    }: {
      surveyId: string;
      wave: PollWave;
      questions: PollQuestion[];
    }) => {
      // 1. Update survey metadata
      const { error: e1 } = await (db as any)
        .from('electoral_surveys')
        .update({
          institute: wave.institute,
          territory: wave.territory,
          cargos: wave.cargos,
          collection_start: wave.collectionStart || null,
          collection_end: wave.collectionEnd || null,
          release_date: wave.releaseDate,
          sample_size: wave.sampleSize,
          margin_of_error: wave.marginOfError,
          methodology: wave.methodology || null,
          tse_registration: wave.tseRegistration || null,
          file_name: wave.fileName || null,
        })
        .eq('id', surveyId);
      if (e1) throw e1;

      // 2. Get existing question IDs to delete their results
      const { data: oldQuestions } = await (db as any)
        .from('survey_questions')
        .select('id')
        .eq('survey_id', surveyId);

      if (oldQuestions && oldQuestions.length > 0) {
        const oldQIds = oldQuestions.map((q: any) => q.id);
        await (db as any).from('survey_results').delete().in('question_id', oldQIds);
        await (db as any).from('survey_questions').delete().eq('survey_id', surveyId);
      }

      // 3. Re-insert questions + results
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: dbQ, error: e2 } = await (db as any)
          .from('survey_questions')
          .insert({
            survey_id: surveyId,
            cargo: q.cargo,
            question_type: q.questionType,
            scenario_label: q.scenarioLabel,
            note: q.note ?? null,
            sort_order: i,
            is_multiple_choice: q.isMultipleChoice ?? false,
            is_main_scenario: q.isMainScenario ?? false,
          })
          .select()
          .single();
        if (e2) throw e2;

        if (q.results.length > 0) {
          const { error: e3 } = await (db as any)
            .from('survey_results')
            .insert(
              q.results.map(r => ({
                question_id: dbQ.id,
                candidate_name: r.candidate,
                percentage: r.percentage,
              })),
            );
          if (e3) throw e3;
        }
      }

      return surveyId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Pesquisa atualizada com sucesso!');
    },
    onError: (e: any) => toast.error(`Erro ao atualizar pesquisa: ${e.message}`),
  });
}

/** Soft-delete a survey (cascades to questions/results) */
export function useDeleteSurvey() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (db as any)
        .from('electoral_surveys')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys'] });
      toast.success('Pesquisa removida.');
    },
    onError: (e: any) => toast.error(`Erro ao remover: ${e.message}`),
  });
}
