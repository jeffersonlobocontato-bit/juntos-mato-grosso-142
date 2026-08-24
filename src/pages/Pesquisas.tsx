// Base de Pesquisas — pesquisas eleitorais quantitativas de Mato Grosso.
// Portado (versão simplificada) da plataforma Politiza IA (politiza.ia.br).
//
// Diferenças em relação ao módulo original do Politiza:
// - Sem parsing automático de PDF via IA (edge function parse-survey-pdf não
//   foi portada) — a importação de uma pesquisa é feita preenchendo o
//   formulário manualmente.
// - Sem o recurso de "candidato mestre" (cruzamento com uma tabela de
//   candidatos cadastrados) — a Juntos Mato Grosso 142 é uma plataforma de um
//   único candidato, então essa camada de correspondência não é necessária.
import { useState, useMemo } from 'react';
import { BarChart2, Upload, Plus, Trash2, Loader2, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CandidateBarChart } from '@/components/polls/CandidateBarChart';
import { PollWave, PollQuestion, Cargo } from '@/data/pollsData';
import { useSurveys, useCreateSurvey, useDeleteSurvey } from '@/hooks/useSurveys';
import { toast } from 'sonner';

// ─── Import form ─────────────────────────────────────────────
interface CandidateEntry { name: string; pct: string }
interface ScenarioEntry { label: string; candidates: CandidateEntry[] }
interface ImportForm {
  institute: string;
  territory: string;
  cargos: Cargo[];
  collectionStart: string;
  collectionEnd: string;
  releaseDate: string;
  sampleSize: string;
  marginOfError: string;
  methodology: string;
  tseRegistration: string;
  govScenarios: ScenarioEntry[];
  senScenarios: ScenarioEntry[];
  measuredMunicipios: string[];
}

const emptyScenario = (label = 'Cenário 1'): ScenarioEntry => ({
  label,
  candidates: [{ name: '', pct: '' }],
});

const emptyForm = (): ImportForm => ({
  institute: '',
  territory: 'Estado de Mato Grosso',
  cargos: ['governador'],
  collectionStart: '',
  collectionEnd: '',
  releaseDate: '',
  sampleSize: '',
  marginOfError: '',
  methodology: '',
  tseRegistration: '',
  govScenarios: [emptyScenario()],
  senScenarios: [],
});

function scenariosToQuestions(
  waveId: string,
  cargo: Cargo,
  scenarios: ScenarioEntry[],
): PollQuestion[] {
  return scenarios
    .filter(s => s.candidates.some(c => c.name.trim() && c.pct.trim()))
    .map((s, i) => ({
      id: `${waveId}-${cargo}-${i}`,
      waveId,
      cargo,
      questionType: 'estimulada',
      scenarioLabel: s.label || `Cenário ${i + 1}`,
      isMainScenario: i === 0,
      results: s.candidates
        .filter(c => c.name.trim() && c.pct.trim())
        .map(c => ({ candidate: c.name.trim(), percentage: Number(c.pct) || 0 })),
      crossTabs: [],
    }));
}

// ─── Wave card ───────────────────────────────────────────────
function WaveCard({ wave, questions, onSelect, onDelete }: {
  wave: PollWave; questions: PollQuestion[]; onSelect: () => void; onDelete: () => void;
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-4 flex flex-col gap-3 relative shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={onSelect}>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
        title="Remover pesquisa"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div className="pr-6">
        <div className="text-xs font-bold text-primary">{wave.institute}</div>
        <div className="text-sm font-semibold text-foreground mt-0.5">{wave.territory}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center border-t border-border pt-3">
        <div>
          <div className="text-[10px] text-muted-foreground">Amostra</div>
          <div className="text-sm font-bold text-foreground">{wave.sampleSize.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Margem</div>
          <div className="text-sm font-bold text-foreground">±{wave.marginOfError}pp</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground">Divulgação</div>
          <div className="text-sm font-bold text-foreground">{wave.releaseDate}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 border-t border-border pt-2">
        {wave.cargos.map(c => (
          <Badge key={c} variant="outline" className="text-[10px] capitalize">{c}</Badge>
        ))}
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary ml-auto">
          {questions.length} pergunta{questions.length === 1 ? '' : 's'}
        </span>
      </div>
      {wave.tseRegistration && (
        <div className="text-[10px] text-muted-foreground border-t border-border pt-2">TSE: {wave.tseRegistration}</div>
      )}
    </div>
  );
}

// ─── Import dialog ───────────────────────────────────────────
function ImportDialog({ open, onClose, onSave, saving }: {
  open: boolean; onClose: () => void; onSave: (wave: PollWave, questions: PollQuestion[]) => void; saving: boolean;
}) {
  const [form, setForm] = useState<ImportForm>(emptyForm());
  const update = (partial: Partial<ImportForm>) => setForm(f => ({ ...f, ...partial }));

  const updateScenario = (cargo: 'gov' | 'sen', idx: number, partial: Partial<ScenarioEntry>) => {
    const key = cargo === 'gov' ? 'govScenarios' : 'senScenarios';
    update({ [key]: form[key].map((s, i) => i === idx ? { ...s, ...partial } : s) } as any);
  };

  const updateCandidate = (cargo: 'gov' | 'sen', sIdx: number, cIdx: number, partial: Partial<CandidateEntry>) => {
    const key = cargo === 'gov' ? 'govScenarios' : 'senScenarios';
    update({
      [key]: form[key].map((s, i) => i === sIdx
        ? { ...s, candidates: s.candidates.map((c, j) => j === cIdx ? { ...c, ...partial } : c) }
        : s)
    } as any);
  };

  const addCandidate = (cargo: 'gov' | 'sen', sIdx: number) => {
    const key = cargo === 'gov' ? 'govScenarios' : 'senScenarios';
    update({ [key]: form[key].map((s, i) => i === sIdx ? { ...s, candidates: [...s.candidates, { name: '', pct: '' }] } : s) } as any);
  };

  const addScenario = (cargo: 'gov' | 'sen') => {
    const key = cargo === 'gov' ? 'govScenarios' : 'senScenarios';
    update({ [key]: [...form[key], emptyScenario(`Cenário ${form[key].length + 1}`)] } as any);
  };

  const handleSave = () => {
    if (!form.institute.trim() || !form.releaseDate || !form.sampleSize) {
      toast.error('Preencha instituto, data de divulgação e tamanho da amostra.');
      return;
    }
    const waveId = crypto.randomUUID();
    const wave: PollWave = {
      id: waveId,
      institute: form.institute.trim(),
      territory: form.territory.trim(),
      cargos: form.cargos,
      collectionStart: form.collectionStart,
      collectionEnd: form.collectionEnd,
      releaseDate: form.releaseDate,
      sampleSize: Number(form.sampleSize) || 0,
      marginOfError: Number(form.marginOfError) || 0,
      methodology: form.methodology,
      tseRegistration: form.tseRegistration,
    };
    const questions = [
      ...scenariosToQuestions(waveId, 'governador', form.govScenarios),
      ...scenariosToQuestions(waveId, 'senador', form.senScenarios),
    ];
    if (questions.length === 0) {
      toast.error('Adicione ao menos um cenário com candidato e percentual.');
      return;
    }
    onSave(wave, questions);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Upload className="w-4 h-4" /> Importar pesquisa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Instituto *</Label>
              <Input value={form.institute} onChange={e => update({ institute: e.target.value })} placeholder="Ex: PercentBrasil" />
            </div>
            <div>
              <Label className="text-xs">Abrangência</Label>
              <Input value={form.territory} onChange={e => update({ territory: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Coleta — início</Label>
              <Input type="date" value={form.collectionStart} onChange={e => update({ collectionStart: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Coleta — fim</Label>
              <Input type="date" value={form.collectionEnd} onChange={e => update({ collectionEnd: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Divulgação/Registro *</Label>
              <Input type="date" value={form.releaseDate} onChange={e => update({ releaseDate: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Registro TSE</Label>
              <Input value={form.tseRegistration} onChange={e => update({ tseRegistration: e.target.value })} placeholder="Ex: MT-03154/2026" />
            </div>
            <div>
              <Label className="text-xs">Amostra *</Label>
              <Input type="number" value={form.sampleSize} onChange={e => update({ sampleSize: e.target.value })} placeholder="1200" />
            </div>
            <div>
              <Label className="text-xs">Margem de erro (pp)</Label>
              <Input type="number" step="0.01" value={form.marginOfError} onChange={e => update({ marginOfError: e.target.value })} placeholder="2.83" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Metodologia</Label>
            <Textarea value={form.methodology} onChange={e => update({ methodology: e.target.value })} rows={2} />
          </div>

          {(['gov', 'sen'] as const).map(cargo => {
            const scenarios = cargo === 'gov' ? form.govScenarios : form.senScenarios;
            const label = cargo === 'gov' ? 'Governador' : 'Senador';
            return (
              <div key={cargo} className="border-t border-border pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{label}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => addScenario(cargo)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Cenário
                  </Button>
                </div>
                {scenarios.map((s, sIdx) => (
                  <div key={sIdx} className="rounded-lg border border-border p-3 mb-2 space-y-2">
                    <Input
                      className="text-xs h-8"
                      value={s.label}
                      onChange={e => updateScenario(cargo, sIdx, { label: e.target.value })}
                      placeholder="Rótulo do cenário (ex: Estimulada, 2º Turno)"
                    />
                    {s.candidates.map((c, cIdx) => (
                      <div key={cIdx} className="flex gap-2">
                        <Input
                          className="text-xs h-8"
                          value={c.name}
                          onChange={e => updateCandidate(cargo, sIdx, cIdx, { name: e.target.value })}
                          placeholder="Nome do candidato"
                        />
                        <Input
                          className="text-xs h-8 w-24"
                          type="number"
                          step="0.1"
                          value={c.pct}
                          onChange={e => updateCandidate(cargo, sIdx, cIdx, { pct: e.target.value })}
                          placeholder="%"
                        />
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={() => addCandidate(cargo, sIdx)}>
                      <Plus className="w-3 h-3 mr-1" /> Candidato/opção
                    </Button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Salvar pesquisa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Wave detail ─────────────────────────────────────────────
function WaveDetail({ wave, questions }: { wave: PollWave; questions: PollQuestion[] }) {
  const byCargo = useMemo(() => {
    const m: Record<string, PollQuestion[]> = {};
    questions.forEach(q => { (m[q.cargo] ??= []).push(q); });
    return m;
  }, [questions]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-4 bg-card">
        <div className="text-lg font-bold text-foreground">{wave.institute} — {wave.territory}</div>
        <div className="text-xs text-muted-foreground mt-1">{wave.methodology}</div>
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
          <span>Amostra: <b className="text-foreground">{wave.sampleSize.toLocaleString()}</b></span>
          <span>Margem: <b className="text-foreground">±{wave.marginOfError}pp</b></span>
          <span>Divulgação: <b className="text-foreground">{wave.releaseDate}</b></span>
          {wave.tseRegistration && <span>TSE: <b className="text-foreground">{wave.tseRegistration}</b></span>}
        </div>
      </div>

      {Object.entries(byCargo).map(([cargo, qs]) => (
        <div key={cargo}>
          <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">{cargo}</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {qs.map(q => (
              <div key={q.id} className="rounded-xl border border-border p-4 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">{q.scenarioLabel}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{q.questionType}</Badge>
                </div>
                <CandidateBarChart results={q.results} height={Math.max(180, q.results.length * 34)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────
export default function Pesquisas() {
  const { data, isLoading } = useSurveys();
  const createMut = useCreateSurvey();
  const deleteMut = useDeleteSurvey();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWaveId, setSelectedWaveId] = useState<string | null>(null);

  const waves = data?.waves ?? [];
  const questions = data?.questions ?? [];
  const selectedWave = waves.find(w => w.id === selectedWaveId);
  const selectedQuestions = questions.filter(q => q.waveId === selectedWaveId);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-primary" /> Base de Pesquisas
          </h1>
          <p className="text-sm text-muted-foreground">Pesquisas eleitorais quantitativas de Mato Grosso</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-2" /> Importar pesquisa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando pesquisas…
        </div>
      ) : waves.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhuma pesquisa cadastrada ainda.</p>
          <p className="text-xs mt-1">Clique em "Importar pesquisa" para adicionar a primeira.</p>
        </div>
      ) : selectedWave ? (
        <div>
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => setSelectedWaveId(null)}>
            ← Voltar para a lista
          </Button>
          <WaveDetail wave={selectedWave} questions={selectedQuestions} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {waves.map(wave => (
            <WaveCard
              key={wave.id}
              wave={wave}
              questions={questions.filter(q => q.waveId === wave.id)}
              onSelect={() => setSelectedWaveId(wave.id)}
              onDelete={() => {
                if (confirm(`Remover a pesquisa de ${wave.institute}?`)) deleteMut.mutate(wave.id);
              }}
            />
          ))}
        </div>
      )}

      <ImportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        saving={createMut.isPending}
        onSave={(wave, qs) => {
          createMut.mutate({ wave, questions: qs }, {
            onSuccess: () => setDialogOpen(false),
          });
        }}
      />
    </div>
  );
}
