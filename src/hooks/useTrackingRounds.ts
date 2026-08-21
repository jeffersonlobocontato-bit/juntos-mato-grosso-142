// Portado da plataforma Politiza IA (politiza.ia.br). Adaptado: removida a
// dependência do CandidateContext (multi-candidato) — a Juntos Mato Grosso
// 142 é uma plataforma de candidato único, então as rodadas de tracking não
// são filtradas por candidate_id.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface TrackingRound {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  state: string | null;
  territory_scope: string;
  macroregion_id: string | null;
  microregion: string | null;
  municipality: string | null;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'rascunho' | 'aberta' | 'fechada' | 'em_analise';
  target_interviews: number;
  share_code: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackingRoundQuestion {
  id: string;
  round_id: string;
  question_key: string;
  label: string;
  description: string | null;
  question_type: string;
  options: any;
  sort_order: number;
  is_required: boolean;
  allow_other: boolean;
  conditional_question_key: string | null;
  conditional_value: string | null;
}

function generateShareCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function useTrackingRounds() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const roundsQuery = useQuery({
    queryKey: ['tracking-rounds'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tracking_rounds')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TrackingRound[];
    },
  });

  const interviewCountsQuery = useQuery({
    queryKey: ['tracking-interview-counts', roundsQuery.data?.length ?? 0],
    queryFn: async () => {
      const roundIds = roundsQuery.data?.map(r => r.id) || [];
      if (!roundIds.length) return {};
      const { data, error } = await (supabase as any)
        .from('tracking_interviews')
        .select('round_id')
        .in('round_id', roundIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((d: any) => {
        counts[d.round_id] = (counts[d.round_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!roundsQuery.data?.length,
  });

  const createRound = useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      city?: string;
      state?: string;
      start_date: string;
      end_date?: string;
      start_time?: string;
      end_time?: string;
      status?: string;
      target_interviews: number;
      territory_scope?: string;
      macroregion_id?: string;
      microregion?: string;
      municipality?: string;
      questions: Omit<TrackingRoundQuestion, 'id' | 'round_id'>[];
    }) => {
      const { questions, ...roundData } = input;
      const share_code = generateShareCode();

      const { data: round, error } = await (supabase as any)
        .from('tracking_rounds')
        .insert({
          ...roundData,
          created_by: user?.id,
          share_code,
          status: roundData.status || 'rascunho',
        })
        .select()
        .single();
      if (error) throw error;

      if (questions.length > 0) {
        const qRows = questions.map((q, i) => ({
          round_id: round.id,
          question_key: q.question_key,
          label: q.label,
          description: q.description || null,
          question_type: q.question_type,
          options: q.options,
          sort_order: i,
          is_required: q.is_required,
          allow_other: q.allow_other ?? false,
          conditional_question_key: q.conditional_question_key || null,
          conditional_value: q.conditional_value || null,
        }));
        const { error: qErr } = await (supabase as any)
          .from('tracking_round_questions')
          .insert(qRows);
        if (qErr) throw qErr;
      }

      return round;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-rounds'] });
      toast({ title: 'Rodada criada com sucesso!' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao criar rodada', description: e.message, variant: 'destructive' });
    },
  });

  const updateRoundStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('tracking_rounds')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-rounds'] });
      toast({ title: 'Status atualizado!' });
    },
  });

  const updateRound = useMutation({
    mutationFn: async (input: {
      id: string;
      title: string;
      description?: string;
      city?: string;
      state?: string;
      start_date: string;
      end_date?: string;
      start_time?: string;
      end_time?: string;
      target_interviews: number;
      questions: Omit<TrackingRoundQuestion, 'id' | 'round_id'>[];
    }) => {
      const { id, questions, ...roundData } = input;

      const { error } = await (supabase as any)
        .from('tracking_rounds')
        .update(roundData)
        .eq('id', id);
      if (error) throw error;

      await (supabase as any)
        .from('tracking_round_questions')
        .delete()
        .eq('round_id', id);

      if (questions.length > 0) {
        const qRows = questions.map((q, i) => ({
          round_id: id,
          question_key: q.question_key,
          label: q.label,
          description: q.description || null,
          question_type: q.question_type,
          options: q.options,
          sort_order: i,
          is_required: q.is_required,
          allow_other: q.allow_other ?? false,
          conditional_question_key: q.conditional_question_key || null,
          conditional_value: q.conditional_value || null,
        }));
        const { error: qErr } = await (supabase as any)
          .from('tracking_round_questions')
          .insert(qRows);
        if (qErr) throw qErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tracking-rounds'] });
      qc.invalidateQueries({ queryKey: ['tracking-questions'] });
      toast({ title: 'Rodada atualizada com sucesso!' });
    },
    onError: (e: any) => {
      toast({ title: 'Erro ao atualizar rodada', description: e.message, variant: 'destructive' });
    },
  });

  return {
    rounds: roundsQuery.data || [],
    isLoading: roundsQuery.isLoading,
    interviewCounts: interviewCountsQuery.data || {},
    createRound,
    updateRound,
    updateRoundStatus,
  };
}

export function useTrackingQuestions(roundId: string | null) {
  return useQuery({
    queryKey: ['tracking-questions', roundId],
    queryFn: async () => {
      if (!roundId) return [];
      const { data, error } = await (supabase as any)
        .from('tracking_round_questions')
        .select('*')
        .eq('round_id', roundId)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as TrackingRoundQuestion[];
    },
    enabled: !!roundId,
  });
}
