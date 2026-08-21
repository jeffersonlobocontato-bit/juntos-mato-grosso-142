// Tracking Eleitoral — pesquisa de campo própria (rodadas de entrevistas
// presenciais). Portado (versão essencial) da plataforma Politiza IA
// (politiza.ia.br).
//
// Não portados nesta versão: sub-abas de Mapa, Gráficos avançados e Análise
// de IA do Tracking (TrackingMap/TrackingCharts/TrackingAI do Politiza) e o
// cadastro dedicado de entrevistadores (TrackingInterviewers) — a estrutura
// de banco para todos eles já existe (ver migration tracking.sql), mas as
// telas ainda não foram construídas. O essencial — criar rodadas, montar o
// questionário, compartilhar o link de coleta e ver contagem de entrevistas
// — está funcional.
import { useState } from 'react';
import { useTrackingRounds, type TrackingRoundQuestion } from '@/hooks/useTrackingRounds';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import {
  Plus, Copy, MapPin, Users, ClipboardCheck, Calendar, Target,
  Trash2, ChevronDown, ChevronUp, Pencil,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  aberta: { label: 'Ativa', color: 'bg-green-500/20 text-green-700 border-green-500/30' },
  fechada: { label: 'Encerrada', color: 'bg-red-500/20 text-red-700 border-red-500/30' },
  em_analise: { label: 'Em Análise', color: 'bg-amber-500/20 text-amber-700 border-amber-500/30' },
};

const QUESTION_TYPES = [
  { value: 'select', label: 'Múltipla Escolha (uma resposta)' },
  { value: 'multiselect', label: 'Múltipla Resposta' },
  { value: 'scale', label: 'Escala (0 a 10)' },
  { value: 'boolean', label: 'Sim / Não' },
  { value: 'text', label: 'Texto Livre' },
];

interface NewQuestion {
  question_key: string;
  label: string;
  description: string;
  question_type: string;
  options: string[];
  is_required: boolean;
  allow_other: boolean;
  conditional_question_key: string;
  conditional_value: string;
}

const emptyQuestion = (): NewQuestion => ({
  question_key: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  label: '', description: '', question_type: 'select', options: [],
  is_required: true, allow_other: false, conditional_question_key: '', conditional_value: '',
});

export default function TrackingDashboard() {
  const { rounds, isLoading, interviewCounts, createRound, updateRound, updateRoundStatus } = useTrackingRounds();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [targetInterviews, setTargetInterviews] = useState('100');
  const [questions, setQuestions] = useState<NewQuestion[]>([]);
  const [newOptionText, setNewOptionText] = useState<Record<number, string>>({});
  const [expandedQ, setExpandedQ] = useState<number | null>(null);

  const totalInterviews = Object.values(interviewCounts).reduce((a: number, b) => a + (b as number), 0);
  const uniqueCities = new Set(rounds.map(r => r.city).filter(Boolean)).size;
  const activeRounds = rounds.filter(r => r.status === 'aberta').length;

  const resetForm = () => {
    setTitle(''); setDescription(''); setCity('');
    setStartDate(''); setEndDate(''); setStartTime(''); setEndTime('');
    setTargetInterviews('100'); setQuestions([]); setNewOptionText({});
    setExpandedQ(null); setEditingRoundId(null);
  };

  const loadRoundForEdit = async (round: any) => {
    setEditingRoundId(round.id);
    setTitle(round.title || '');
    setDescription(round.description || '');
    setCity(round.city || '');
    setStartDate(round.start_date || '');
    setEndDate(round.end_date || '');
    setStartTime(round.start_time?.slice(0, 5) || '');
    setEndTime(round.end_time?.slice(0, 5) || '');
    setTargetInterviews(String(round.target_interviews || 100));

    const { data } = await (supabase as any)
      .from('tracking_round_questions').select('*').eq('round_id', round.id).order('sort_order');
    const loadedQs: NewQuestion[] = (data || []).map((q: any) => ({
      question_key: q.question_key, label: q.label || '', description: q.description || '',
      question_type: q.question_type || 'select', options: Array.isArray(q.options) ? q.options : [],
      is_required: q.is_required ?? true, allow_other: q.allow_other ?? false,
      conditional_question_key: q.conditional_question_key || '', conditional_value: q.conditional_value || '',
    }));
    setQuestions(loadedQs);
    setNewOptionText({});
    setExpandedQ(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !startDate) {
      toast({ title: 'Preencha o nome e data de início', variant: 'destructive' });
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      city: city.trim() || undefined,
      state: 'MT',
      start_date: startDate,
      end_date: endDate || undefined,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      target_interviews: parseInt(targetInterviews) || 100,
      questions: questions.map(q => ({
        question_key: q.question_key, label: q.label, description: q.description || null,
        question_type: q.question_type, options: q.options.length > 0 ? q.options : null,
        sort_order: 0, is_required: q.is_required, allow_other: q.allow_other,
        conditional_question_key: q.conditional_question_key || null,
        conditional_value: q.conditional_value || null,
      })),
    };

    if (editingRoundId) {
      await updateRound.mutateAsync({ id: editingRoundId, ...payload });
    } else {
      await createRound.mutateAsync(payload);
    }
    resetForm();
    setDialogOpen(false);
  };

  const addQuestion = () => { setQuestions(prev => [...prev, emptyQuestion()]); setExpandedQ(questions.length); };
  const removeQuestion = (idx: number) => { setQuestions(prev => prev.filter((_, i) => i !== idx)); setExpandedQ(null); };
  const updateQuestion = (idx: number, field: keyof NewQuestion, value: any) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  const addOption = (idx: number) => {
    const text = (newOptionText[idx] || '').trim();
    if (!text) return;
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, options: [...q.options, text] } : q));
    setNewOptionText(prev => ({ ...prev, [idx]: '' }));
  };
  const removeOption = (qIdx: number, oIdx: number) =>
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q));
  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions(prev => { const next = [...prev]; [next[idx], next[target]] = [next[target], next[idx]]; return next; });
    setExpandedQ(target);
  };
  const copyLink = (round: any) => {
    const url = `${window.location.origin}/tracking/coleta/${round.share_code}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado!', description: url });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground">Tracking Eleitoral</h1>
          <p className="text-sm text-muted-foreground">Pesquisa de campo própria — Mato Grosso 2026</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={resetForm}><Plus className="w-4 h-4" /> Nova Rodada</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingRoundId ? 'Editar Rodada' : 'Nova Rodada de Tracking'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs">Título *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Rodada Cuiabá — Semana 1" />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Cidade/Região</Label><Input value={city} onChange={e => setCity(e.target.value)} /></div>
                <div><Label className="text-xs">Meta de entrevistas</Label><Input type="number" value={targetInterviews} onChange={e => setTargetInterviews(e.target.value)} /></div>
                <div><Label className="text-xs">Data início *</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                <div><Label className="text-xs">Data fim</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                <div><Label className="text-xs">Horário início</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
                <div><Label className="text-xs">Horário fim</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Perguntas do questionário</span>
                  <Button type="button" variant="outline" size="sm" onClick={addQuestion}><Plus className="w-3.5 h-3.5 mr-1" /> Pergunta</Button>
                </div>
                {questions.map((q, idx) => (
                  <div key={q.question_key} className="rounded-lg border border-border p-3 mb-2">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setExpandedQ(expandedQ === idx ? null : idx)} className="flex-1 flex items-center gap-2 text-left">
                        {expandedQ === idx ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span className="text-xs font-medium">{q.label || `Pergunta ${idx + 1}`}</span>
                      </button>
                      <button type="button" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0} className="text-muted-foreground disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1} className="text-muted-foreground disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => removeQuestion(idx)} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    {expandedQ === idx && (
                      <div className="mt-3 space-y-2">
                        <Input className="text-xs h-8" value={q.label} onChange={e => updateQuestion(idx, 'label', e.target.value)} placeholder="Texto da pergunta" />
                        <Select value={q.question_type} onValueChange={v => updateQuestion(idx, 'question_type', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                        {(q.question_type === 'select' || q.question_type === 'multiselect') && (
                          <div className="space-y-1">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-1.5 text-xs">
                                <span className="flex-1 px-2 py-1 rounded bg-muted">{opt}</span>
                                <button type="button" onClick={() => removeOption(idx, oIdx)} className="text-destructive"><Trash2 className="w-3 h-3" /></button>
                              </div>
                            ))}
                            <div className="flex gap-1.5">
                              <Input className="h-7 text-xs" value={newOptionText[idx] || ''} onChange={e => setNewOptionText(prev => ({ ...prev, [idx]: e.target.value }))} placeholder="Nova opção" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(idx); } }} />
                              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => addOption(idx)}>Adicionar</Button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 pt-1">
                          <label className="flex items-center gap-1.5 text-xs"><Switch checked={q.is_required} onCheckedChange={v => updateQuestion(idx, 'is_required', v)} />Obrigatória</label>
                          {q.question_type === 'select' && (
                            <label className="flex items-center gap-1.5 text-xs"><Switch checked={q.allow_other} onCheckedChange={v => updateQuestion(idx, 'allow_other', v)} />Permitir "outro"</label>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createRound.isPending || updateRound.isPending}>
                {editingRoundId ? 'Salvar alterações' : 'Criar rodada'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Rodadas ativas</p><p className="text-2xl font-bold">{activeRounds}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total de entrevistas</p><p className="text-2xl font-bold">{totalInterviews}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Cidades cobertas</p><p className="text-2xl font-bold">{uniqueCities}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total de rodadas</p><p className="text-2xl font-bold">{rounds.length}</p></CardContent></Card>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando rodadas…</p>
      ) : rounds.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma rodada de tracking cadastrada ainda.</p>
        </CardContent></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rounds.map(round => {
            const status = STATUS_MAP[round.status] ?? STATUS_MAP.rascunho;
            const count = interviewCounts[round.id] || 0;
            const pct = round.target_interviews > 0 ? Math.min(100, Math.round((count / round.target_interviews) * 100)) : 0;
            return (
              <Card key={round.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{round.title}</CardTitle>
                    <Badge className={status.color} variant="outline">{status.label}</Badge>
                  </div>
                  {round.city && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{round.city}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{round.start_date}</span>
                    <span className="flex items-center gap-1"><Target className="w-3 h-3" />{count}/{round.target_interviews}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={round.status} onValueChange={v => updateRoundStatus.mutate({ id: round.id, status: v })}>
                      <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => loadRoundForEdit(round)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyLink(round)}><Copy className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
