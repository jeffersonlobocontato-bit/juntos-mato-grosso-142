// Inteligência de Campanha — Wellington Fagundes, Governo de Mato Grosso 2026.
// Portado (versão simplificada) da plataforma Politiza IA (politiza.ia.br).
//
// Diferença central em relação ao original: o painel do Politiza tinha
// abas inteiras (Ameaças, Oportunidades, Raio-X de rivais, Ações, Planos de
// 90 dias) construídas sobre pesquisa qualitativa REAL do Paraná e achados
// de vulnerabilidade específicos do Sergio Moro — não reaproveitável para
// Wellington/MT sem fabricar inteligência eleitoral inexistente. Essas abas
// não foram portadas. O que resta aqui é 100% orientado a dado real: tudo
// vem das pesquisas cadastradas em Base de Pesquisas (useSurveys()).
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, GitCompare, Sparkles, Megaphone, Upload, BarChart2, Map,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { CandidateBarChart } from '@/components/polls/CandidateBarChart';
import AnaliseIAChat from '@/components/inteligencia/AnaliseIAChat';
import InsightsComunicacao from '@/components/inteligencia/InsightsComunicacao';
import CruzamentosSegmentos from '@/components/inteligencia/CruzamentosSegmentos';
import { useSurveys } from '@/hooks/useSurveys';
import { CANDIDATE_COLORS } from '@/data/pollsData';


interface PesquisaRow {
  inst: string; data: string; cand: string; pct: number; n: number; margem: number;
  cargo: string; cenario: string;
}

// ============================================================
// CRUZAMENTO DE PESQUISAS (genérico — funciona com qualquer conjunto real)
// ============================================================
function CruzamentoPesquisas({ pesquisas }: { pesquisas: PesquisaRow[] }) {
  const institutos = useMemo(() => [...new Set(pesquisas.map(p => p.inst))], [pesquisas]);
  const candidatos = useMemo(() => [...new Set(pesquisas.map(p => p.cand))], [pesquisas]);
  const [selInst, setSelInst] = useState<string[]>(institutos);
  const [selCand, setSelCand] = useState<string[]>(candidatos);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);

  const selInstSorted = useMemo(() => {
    return [...selInst]
      .map(inst => ({ inst, data: pesquisas.find(p => p.inst === inst)?.data ?? '' }))
      .sort((a, b) => a.data.localeCompare(b.data))
      .map(({ inst }) => inst);
  }, [selInst, pesquisas]);

  const matriz = useMemo(() => {
    return selCand.map(cand => {
      const linha: any = { cand };
      const valores: number[] = [];
      selInstSorted.forEach(inst => {
        const r = pesquisas.find(p => p.cand === cand && p.inst === inst);
        linha[inst] = r ? r.pct : null;
        if (r) valores.push(r.pct);
      });
      if (valores.length >= 2) {
        linha._min = Math.min(...valores);
        linha._max = Math.max(...valores);
        linha._delta = +(linha._max - linha._min).toFixed(1);
        linha._media = +(valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1);
      }
      return linha;
    });
  }, [selCand, selInstSorted, pesquisas]);

  const linhaData = useMemo(() => {
    const ordenadas = [...selInst]
      .map(inst => ({ inst, data: pesquisas.find(p => p.inst === inst)?.data ?? '' }))
      .sort((a, b) => a.data.localeCompare(b.data));
    return ordenadas.map(({ inst, data }) => {
      const ponto: any = { inst, data: data.slice(5) };
      selCand.forEach(cand => {
        const r = pesquisas.find(p => p.cand === cand && p.inst === inst);
        ponto[cand] = r ? r.pct : null;
      });
      return ponto;
    });
  }, [selCand, selInst, pesquisas]);

  if (pesquisas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma pesquisa cadastrada ainda. Importe pesquisas em{' '}
          <Link to="/admin/base-pesquisas" className="underline text-primary">Base de Pesquisas</Link>.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader><CardTitle className="text-base">Selecione institutos e candidatos para cruzar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Institutos</div>
            <div className="flex flex-wrap gap-3">
              {institutos.map(i => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selInst.includes(i)} onCheckedChange={() => toggle(selInst, i, setSelInst)} />
                  {i}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Candidatos</div>
            <div className="flex flex-wrap gap-3">
              {candidatos.map(c => (
                <label key={c} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={selCand.includes(c)} onCheckedChange={() => toggle(selCand, c, setSelCand)} />
                  <span style={{ color: CANDIDATE_COLORS[c] ?? undefined }}>{c}</span>
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Comparativo lado a lado</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-muted-foreground">
                <th className="py-2 pr-3">Candidato</th>
                {selInstSorted.map(i => <th key={i} className="py-2 pr-3 text-right">{i}</th>)}
                <th className="py-2 pr-3 text-right">Média</th>
                <th className="py-2 text-right">Δ (máx-mín)</th>
              </tr>
            </thead>
            <tbody>
              {matriz.filter(r => selInstSorted.some(inst => r[inst] != null)).map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 pr-3 font-medium" style={{ color: CANDIDATE_COLORS[r.cand] ?? undefined }}>{r.cand}</td>
                  {selInstSorted.map(inst => (
                    <td key={inst} className="py-2 pr-3 text-right tabular-nums">{r[inst] != null ? `${r[inst]}%` : '—'}</td>
                  ))}
                  <td className="py-2 pr-3 text-right font-semibold">{r._media != null ? `${r._media}%` : '—'}</td>
                  <td className="py-2 text-right">
                    {r._delta != null ? (
                      <Badge className={r._delta >= 5 ? 'bg-red-500' : r._delta >= 2.5 ? 'bg-amber-500' : 'bg-emerald-600'}>{r._delta} p.p.</Badge>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground mt-3">Δ alto = maior dispersão entre institutos (possível efeito metodológico).</p>
        </CardContent>
      </Card>

      {selInstSorted.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Evolução por instituto (ordem cronológica)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={linhaData} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="inst" />
                <YAxis tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: any) => v != null ? `${v}%` : '—'} />
                <Legend />
                {selCand.map(c => (
                  <Line key={c} type="monotone" dataKey={c} stroke={CANDIDATE_COLORS[c] ?? '#9ca3af'} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ============================================================
// PÁGINA
// ============================================================
export default function Inteligencia() {
  const { data: surveysData } = useSurveys();
  const waves = surveysData?.waves ?? [];
  const questions = surveysData?.questions ?? [];

  // Converte as pesquisas cadastradas (cargo governador, cenário principal de cada instituto) para o formato do painel.
  const pesquisas: PesquisaRow[] = useMemo(() => {
    const rows: PesquisaRow[] = [];
    waves.forEach(w => {
      const govQs = questions.filter(q => q.waveId === w.id && q.cargo === 'governador');
      const main = govQs.find(q => q.isMainScenario) ?? govQs[0];
      if (!main) return;
      main.results.forEach(r => {
        rows.push({
          inst: w.institute, data: w.releaseDate, cand: r.candidate, pct: r.percentage,
          n: w.sampleSize, margem: Number(w.marginOfError), cargo: 'Governador', cenario: 'C1',
        });
      });
    });
    return rows;
  }, [waves, questions]);

  const latestWave = useMemo(() => [...waves].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate))[0], [waves]);
  const latestMainQuestion = useMemo(() => {
    if (!latestWave) return null;
    const govQs = questions.filter(q => q.waveId === latestWave.id && q.cargo === 'governador');
    return govQs.find(q => q.isMainScenario) ?? govQs[0] ?? null;
  }, [latestWave, questions]);

  const rejectionQuestion = useMemo(() => {
    if (!latestWave) return null;
    return questions.find(q => q.waveId === latestWave.id && q.cargo === 'governador' && q.questionType === 'rejeicao') ?? null;
  }, [latestWave, questions]);

  // Líder e vantagem — detectados genericamente (maior percentual entre candidatos reais, não "não sabe"/nulo).
  const NAO_CANDIDATO = /nulo|branco|ns\/|não sabe|nao sabe|indeciso|^nr$|nenhum/i;
  const ranking = useMemo(() => {
    if (!latestMainQuestion) return [];
    return [...latestMainQuestion.results]
      .filter(r => !NAO_CANDIDATO.test(r.candidate))
      .sort((a, b) => b.percentage - a.percentage);
  }, [latestMainQuestion]);
  const lider = ranking[0];
  const segundo = ranking[1];
  const vantagem = lider && segundo ? +(lider.percentage - segundo.percentage).toFixed(1) : null;

  const contextoParaIA = useMemo(() => ({
    waves: waves.map(w => ({
      instituto: w.institute, territorio: w.territory, divulgacao: w.releaseDate,
      amostra: w.sampleSize, margem: w.marginOfError, tse: w.tseRegistration,
    })),
    perguntas: questions.map(q => ({
      instituto: waves.find(w => w.id === q.waveId)?.institute,
      cargo: q.cargo, tipo: q.questionType, cenario: q.scenarioLabel,
      resultados: q.results,
      cruzamentos: q.crossTabs.map(ct => ({
        recorte: ct.filterLabel,
        leitura: ct.basis === 'perfil'
          ? 'composição do eleitorado de cada candidato'
          : 'percentual dentro de cada segmento',
        linhas: ct.rows,
      })),
    })),
  }), [waves, questions]);

  // Recorte regional do líder no cenário principal mais recente
  const regiaoLider = useMemo(() => {
    if (!latestMainQuestion || !lider) return null;
    const ct = latestMainQuestion.crossTabs.find(
      c => c.filterType === 'regiao' && c.basis !== 'perfil',
    );
    if (!ct) return null;
    return {
      candidato: lider.candidate,
      linhas: ct.rows.map(r => ({ regiao: r.label, pct: r.values[lider.candidate] ?? 0 })),
    };
  }, [latestMainQuestion, lider]);



  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inteligência de Campanha</h1>
          <p className="text-sm text-muted-foreground">Análise estratégica · Wellington Fagundes · Governo de Mato Grosso 2026</p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link to="/admin/base-pesquisas"><Upload className="w-4 h-4" /> Base de Pesquisas</Link>
        </Button>
      </div>

      {waves.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma pesquisa cadastrada ainda.</p>
            <p className="text-xs mt-1">
              Cadastre pesquisas em{' '}
              <Link to="/admin/base-pesquisas" className="underline text-primary">Base de Pesquisas</Link>{' '}
              para o painel ganhar vida.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="painel" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto">
            <TabsTrigger value="painel" className="gap-2"><LayoutDashboard className="w-4 h-4" />Painel Geral</TabsTrigger>
            <TabsTrigger value="segmentos" className="gap-2"><Map className="w-4 h-4" />Regiões e Perfis</TabsTrigger>
            <TabsTrigger value="cruzamento" className="gap-2"><GitCompare className="w-4 h-4" />Cruzamento</TabsTrigger>
            <TabsTrigger value="insights" className="gap-2"><Megaphone className="w-4 h-4" />Insights</TabsTrigger>
            <TabsTrigger value="ia" className="gap-2"><Sparkles className="w-4 h-4" />Análise IA</TabsTrigger>
          </TabsList>


          <TabsContent value="painel" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Líder (cenário principal)</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" style={{ color: lider ? CANDIDATE_COLORS[lider.candidate] : undefined }}>
                    {lider ? `${lider.candidate} — ${lider.percentage}%` : '—'}
                  </p>
                  {vantagem !== null && <p className="text-xs text-muted-foreground mt-1">Vantagem de {vantagem}pp sobre {segundo?.candidate}</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Pesquisa mais recente</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{latestWave?.institute ?? '—'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{latestWave?.releaseDate} · amostra {latestWave?.sampleSize.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground uppercase">Rejeição do líder</CardTitle></CardHeader>
                <CardContent>
                  {rejectionQuestion && lider ? (
                    <>
                      <p className="text-2xl font-bold">
                        {rejectionQuestion.results.find(r => r.candidate === lider.candidate)?.percentage ?? '—'}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Menor rejeição = maior teto de crescimento</p>
                    </>
                  ) : <p className="text-sm text-muted-foreground">Sem pergunta de rejeição cadastrada</p>}
                </CardContent>
              </Card>
            </div>

            {latestMainQuestion && (
              <Card>
                <CardHeader><CardTitle className="text-base">{latestWave?.institute} — {latestMainQuestion.scenarioLabel}</CardTitle></CardHeader>
                <CardContent>
                  <CandidateBarChart results={latestMainQuestion.results} height={Math.max(200, latestMainQuestion.results.length * 34)} />
                </CardContent>
              </Card>
            )}

            {regiaoLider && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Desempenho por região — {regiaoLider.candidato}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {regiaoLider.linhas.map(l => (
                      <div key={l.regiao} className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">{l.regiao}</p>
                        <p className="text-xl font-bold">{l.pct.toFixed(1)}%</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    % de intenção de voto dentro de cada uma das 7 regiões de Mato Grosso (IMEA).
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="segmentos" className="mt-6">
            <CruzamentosSegmentos waves={waves} questions={questions} destaque={lider?.candidate} />
          </TabsContent>

          <TabsContent value="cruzamento" className="space-y-6 mt-6">
            <CruzamentoPesquisas pesquisas={pesquisas} />
          </TabsContent>



          <TabsContent value="insights" className="mt-6">
            <InsightsComunicacao context={contextoParaIA} />
          </TabsContent>

          <TabsContent value="ia" className="mt-6">
            <AnaliseIAChat context={contextoParaIA} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
