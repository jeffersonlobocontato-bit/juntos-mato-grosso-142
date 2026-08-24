import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, TrendingDown, TrendingUp, Sparkles, Info, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PollWave, PollQuestion, Cargo } from '@/data/pollsData';
import { CandidateBarChart } from '@/components/polls/CandidateBarChart';
import { toast } from 'sonner';

interface AnaliseCidadesAferidasProps {
  waves: PollWave[];
  questions: PollQuestion[];
}

interface CidadeAnalise {
  nome: string;
  historico: {
    total: number;
    candidatos: { nome: string; votos: number; pct: number }[];
    top: { nome: string; votos: number; pct: number };
  };
  pesquisa_pct: number | null;
  gap: number | null;
  gap_label: string;
}

const CARGO_TO_CD: Record<Cargo, number> = {
  governador: 3,
  senador: 5,
  presidente: 1,
};

const normalizeCidade = (nome: string) =>
  nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .toUpperCase()
    .trim();

function findMainQuestion(questions: PollQuestion[], waveId: string, cargo: Cargo) {
  const qs = questions.filter(q => q.waveId === waveId && q.cargo === cargo);
  return qs.find(q => q.isMainScenario) ?? qs[0] ?? null;
}

function getSurveyCityPercentages(question: PollQuestion, candidate: string): Record<string, number> {
  const crosstab = question.crossTabs.find(ct => ct.filterType === 'municipio');
  if (!crosstab) return {};
  const result: Record<string, number> = {};
  crosstab.rows.forEach(row => {
    const val = row.values[candidate];
    if (val != null) result[row.label] = Number(val);
  });
  return result;
}

export function AnaliseCidadesAferidas({ waves, questions }: AnaliseCidadesAferidasProps) {
  const [selectedWaveId, setSelectedWaveId] = useState<string>(() => waves[0]?.id ?? '');
  const [selectedCargo, setSelectedCargo] = useState<Cargo>('governador');
  const [selectedCandidate, setSelectedCandidate] = useState<string>('');
  const [cidades, setCidades] = useState<CidadeAnalise[]>([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [gerandoInsights, setGerandoInsights] = useState(false);
  const [mostrarApenasComDados, setMostrarApenasComDados] = useState(false);

  const selectedWave = useMemo(() => waves.find(w => w.id === selectedWaveId), [waves, selectedWaveId]);
  const selectedQuestion = useMemo(
    () => (selectedWave ? findMainQuestion(questions, selectedWave.id, selectedCargo) : null),
    [selectedWave, questions, selectedCargo],
  );

  const candidates = useMemo(() => {
    if (!selectedQuestion) return [];
    const neutro = /nulo|branco|ns\/|não sabe|nao sabe|indeciso|^nr$|nenhum/i;
    return selectedQuestion.results.filter(r => !neutro.test(r.candidate)).map(r => r.candidate);
  }, [selectedQuestion]);

  useEffect(() => {
    if (candidates.length > 0 && !selectedCandidate) {
      setSelectedCandidate(candidates[0]);
    } else if (candidates.length > 0 && !candidates.includes(selectedCandidate)) {
      setSelectedCandidate(candidates[0]);
    }
  }, [candidates, selectedCandidate]);

  useEffect(() => {
    async function fetchAnalise() {
      if (!selectedWave || !selectedWave.measuredMunicipios || selectedWave.measuredMunicipios.length === 0 || !selectedQuestion || !selectedCandidate) {
        setCidades([]);
        return;
      }

      setLoading(true);
      try {
        const normalized = [...new Set(selectedWave.measuredMunicipios.map(normalizeCidade))];
        const cdCargo = CARGO_TO_CD[selectedCargo];

        const { data: rows, error } = await supabase
          .from('resultados_eleicoes_historicos')
          .select('nm_municipio_normalizado, nm_candidato, qt_votos')
          .eq('ano_eleicao', 2022)
          .eq('num_turno', 1)
          .eq('cd_cargo', cdCargo)
          .in('nm_municipio_normalizado', normalized);

        if (error) throw error;

        const citySurvey = getSurveyCityPercentages(selectedQuestion, selectedCandidate);
        const overallSurvey = selectedQuestion.results.find(r => r.candidate === selectedCandidate)?.percentage ?? null;

        const byCity: Record<string, { nome: string; total: number; candidatos: { nome: string; votos: number; pct: number }[] }> = {};

        (rows ?? []).forEach((r: any) => {
          const nome = String(r.nm_municipio_normalizado);
          if (!byCity[nome]) byCity[nome] = { nome, total: 0, candidatos: [] };
          byCity[nome].total += Number(r.qt_votos) || 0;
          byCity[nome].candidatos.push({ nome: r.nm_candidato, votos: Number(r.qt_votos) || 0, pct: 0 });
        });

        const analise: CidadeAnalise[] = Object.values(byCity).map(city => {
          city.candidatos.forEach(c => {
            c.pct = city.total > 0 ? +(c.votos / city.total * 100).toFixed(2) : 0;
          });
          city.candidatos.sort((a, b) => b.votos - a.votos);
          const top = city.candidatos[0];

          // Try to find original name of the city from measured list
          const originalName =
            selectedWave.measuredMunicipios!.find(m => normalizeCidade(m) === city.nome) ?? city.nome;

          const pesquisa_pct = citySurvey[originalName] ?? citySurvey[city.nome] ?? overallSurvey;
          const gap = pesquisa_pct != null ? +(pesquisa_pct - top.pct).toFixed(2) : null;

          return {
            nome: originalName,
            historico: { total: city.total, candidatos: city.candidatos, top },
            pesquisa_pct,
            gap,
            gap_label: gap == null ? 'sem dado' : gap >= 0 ? 'potencial' : 'fraqueza',
          };
        });

        analise.sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity));
        setCidades(analise);
      } catch (e: any) {
        console.error(e);
        toast.error('Erro ao carregar histórico eleitoral');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalise();
  }, [selectedWave, selectedQuestion, selectedCandidate, selectedCargo]);

  const cidadesExibidas = useMemo(
    () => (mostrarApenasComDados ? cidades.filter(c => c.pesquisa_pct != null) : cidades),
    [cidades, mostrarApenasComDados],
  );

  const fraquezas = useMemo(() => cidades.filter(c => c.gap != null && c.gap < 0).sort((a, b) => a.gap! - b.gap!), [cidades]);
  const potencialidades = useMemo(() => cidades.filter(c => c.gap != null && c.gap >= 0).sort((a, b) => b.gap! - a.gap!), [cidades]);

  async function gerarInsights() {
    if (cidades.length === 0) return;
    setGerandoInsights(true);
    setInsights(null);
    try {
      const resposta = await supabase.functions.invoke('inteligencia-cidades', {
        body: {
          survey: selectedWave,
          cargo: selectedCargo,
          candidate: selectedCandidate,
          cidades: cidades,
        },
      });

      if (resposta.error) throw resposta.error;
      setInsights(resposta.data?.text ?? resposta.data ?? null);
    } catch (e: any) {
      console.error(e);
      // Fallback local se a função não existir
      const top3 = potencialidades.slice(0, 3).map(c => c.nome).join(', ') || '—';
      const baixas3 = fraquezas.slice(0, 3).map(c => c.nome).join(', ') || '—';
      const maiorVolume = [...cidades].sort((a, b) => b.historico.total - a.historico.total).slice(0, 3).map(c => `${c.nome} (${c.historico.total.toLocaleString()} votos)`).join(', ');
      setInsights(
        `**Fraquezas prioritárias:** ${baixas3}.\n\n` +
        `**Potencialidades / bons cenários:** ${top3}.\n\n` +
        `**Maiores colégios eleitorais históricos:** ${maiorVolume}.\n\n` +
        `Recomendação: priorizar ações de campo nas cidades onde o candidato está abaixo do padrão histórico de votação da base, enquanto consolida presença nas cidades de maior volume eleitoral.`
      );
    } finally {
      setGerandoInsights(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Análise por cidades aferidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <LabelInline>Pesquisa</LabelInline>
              <Select value={selectedWaveId} onValueChange={setSelectedWaveId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pesquisa" />
                </SelectTrigger>
                <SelectContent>
                  {waves.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.institute} · {w.releaseDate}
                      {w.measuredMunicipios && w.measuredMunicipios.length > 0 ? ` (${w.measuredMunicipios.length} cidades)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <LabelInline>Cargo</LabelInline>
              <Select value={selectedCargo} onValueChange={(v) => setSelectedCargo(v as Cargo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="governador">Governador</SelectItem>
                  <SelectItem value="senador">Senador</SelectItem>
                  <SelectItem value="presidente">Presidente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <LabelInline>Candidato para análise</LabelInline>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedWave?.measuredMunicipios?.length && (
            <Alert variant="default">
              <Info className="w-4 h-4" />
              <AlertTitle>Pesquisa sem cidades cadastradas</AlertTitle>
              <AlertDescription>
                Cadastre os municípios aferidos em <b>Base de Pesquisas</b> para habilitar a análise histórica por cidade.
              </AlertDescription>
            </Alert>
          )}

          {selectedWave && selectedWave.measuredMunicipios && selectedWave.measuredMunicipios.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedWave.measuredMunicipios.length} cidades selecionadas:</span>
              {selectedWave.measuredMunicipios.slice(0, 8).map(c => (
                <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>
              ))}
              {selectedWave.measuredMunicipios.length > 8 && (
                <Badge variant="outline" className="text-[10px]">+{selectedWave.measuredMunicipios.length - 8}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {cidades.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Potencialidades ({potencialidades.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {potencialidades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma cidade com saldo positivo contra o histórico.</p>
              ) : (
                <ul className="space-y-2">
                  {potencialidades.slice(0, 5).map(c => (
                    <li key={c.nome} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0">
                      <span>{c.nome}</span>
                      <span className="font-semibold text-emerald-600">+{c.gap} p.p.</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Fraquezas / gaps ({fraquezas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fraquezas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma cidade com saldo negativo contra o histórico.</p>
              ) : (
                <ul className="space-y-2">
                  {fraquezas.slice(0, 5).map(c => (
                    <li key={c.nome} className="flex justify-between items-center text-sm border-b border-border/50 pb-2 last:border-0">
                      <span>{c.nome}</span>
                      <span className="font-semibold text-red-600">{c.gap} p.p.</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {cidades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Detalhamento por município</span>
              <label className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                <Checkbox checked={mostrarApenasComDados} onCheckedChange={v => setMostrarApenasComDados(v === true)} />
                Apenas cidades com dado de pesquisa
              </label>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b text-muted-foreground">
                  <th className="py-2 pr-3">Município</th>
                  <th className="py-2 pr-3 text-right">Histórico total</th>
                  <th className="py-2 pr-3">Top histórico</th>
                  <th className="py-2 pr-3 text-right">% histórica</th>
                  <th className="py-2 pr-3 text-right">% pesquisa</th>
                  <th className="py-2 text-right">Gap</th>
                </tr>
              </thead>
              <tbody>
                {cidadesExibidas.map(c => (
                  <tr key={c.nome} className="border-b">
                    <td className="py-2 pr-3 font-medium">{c.nome}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{c.historico.total.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-xs">{c.historico.top.nome}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{c.historico.top.pct}%</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{c.pesquisa_pct != null ? `${c.pesquisa_pct}%` : '—'}</td>
                    <td className="py-2 text-right">
                      {c.gap != null ? (
                        <Badge className={c.gap >= 0 ? 'bg-emerald-600' : 'bg-red-500'}>{c.gap >= 0 ? '+' : ''}{c.gap} p.p.</Badge>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cidadesExibidas.some(c => c.pesquisa_pct == null) && (
              <p className="text-xs text-muted-foreground mt-3">
                * Cidades sem percentual de pesquisa usam o percentual geral do candidato como referência. Para análise granular, cadastre cruzamentos por município.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {cidades.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Interpretação estratégica
            </CardTitle>
            <Button size="sm" onClick={gerarInsights} disabled={gerandoInsights} className="gap-2">
              {gerandoInsights ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4" />}
              Gerar insights
            </Button>
          </CardHeader>
          <CardContent>
            {!insights && !gerandoInsights && (
              <p className="text-sm text-muted-foreground">Clique em "Gerar insights" para receber uma análise de gaps e oportunidades.</p>
            )}
            {gerandoInsights && <p className="text-sm text-muted-foreground">Analisando cenário…</p>}
            {insights && (
              <div className="prose prose-sm max-w-none text-sm whitespace-pre-line">
                {insights}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground flex items-center gap-2"><span className="animate-spin">⏳</span> Carregando histórico…</p>
      )}
    </div>
  );
}

function LabelInline({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-semibold text-muted-foreground mb-1.5">{children}</div>;
}
