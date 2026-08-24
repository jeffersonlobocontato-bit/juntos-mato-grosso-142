import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import {
  useCandidatosHistoricos,
  useRegioesHistoricas,
} from '@/hooks/useHistoricoEleitoral';
import { useSurveys } from '@/hooks/useSurveys';
import { REGIAO_PESQUISA_TO_MESO } from '@/lib/regioesPesquisaMT';
import InsightsComunicacao from '@/components/inteligencia/InsightsComunicacao';

const COR_HISTORICO = '#1d4ed8';
const COR_PESQUISA = '#dc2626';

const IGNORAR = new Set(['NULO', 'BRANCO', 'Nulo', 'Branco', '#NULO#', 'VOTO NULO', 'VOTO BRANCO']);

// Divergência (em pontos percentuais) acima da qual sinalizamos a região como
// "fora do padrão histórico" — merece checar tracking de campo por lá.
const LIMIAR_ALERTA_PP = 15;

interface Props {
  ano: number;
  turno: number;
  cargo: number;
  cargoLabel: string;
}

export function ComparativoPesquisa({ ano, turno, cargo, cargoLabel }: Props) {
  const { data: pesquisas, isLoading: loadingPesquisas } = useSurveys();
  const { data: candidatosRaw, isLoading: loadingCand } = useCandidatosHistoricos(ano, turno, cargo);

  const candidatos = useMemo(
    () => (candidatosRaw ?? []).filter(c => !IGNORAR.has(c.nome.toUpperCase())),
    [candidatosRaw],
  );

  // Perguntas de pesquisa que têm cruzamento por região
  const perguntasRegionais = useMemo(() => {
    return (pesquisas?.questions ?? [])
      .map(q => {
        const ct = q.crossTabs?.find(c => c.filterType === 'regiao');
        if (!ct) return null;
        return { id: q.id, label: `${q.cargo} · ${q.scenarioLabel}`, candidatos: ct.candidates, crossTab: ct };
      })
      .filter(Boolean) as { id: string; label: string; candidatos: string[]; crossTab: any }[];
  }, [pesquisas]);

  const [perguntaId, setPerguntaId] = useState<string>('');
  const [candidatoPesquisa, setCandidatoPesquisa] = useState<string>('');
  const [candidatoHistorico, setCandidatoHistorico] = useState<string>('TODOS');

  useEffect(() => {
    if (!perguntaId && perguntasRegionais.length > 0) {
      setPerguntaId(perguntasRegionais[0].id);
      setCandidatoPesquisa(perguntasRegionais[0].candidatos[0] ?? '');
    }
  }, [perguntasRegionais, perguntaId]);

  useEffect(() => {
    setCandidatoHistorico('TODOS');
  }, [ano, turno, cargo]);

  const perguntaSelecionada = perguntasRegionais.find(p => p.id === perguntaId);

  const { data: regioesHistoricas, isLoading: loadingRegioes } = useRegioesHistoricas(
    ano, turno, cargo, candidatoHistorico,
  );

  const porMeso = useMemo(() => {
    const map = new Map<string, number>();
    (regioesHistoricas ?? []).forEach(r => map.set(r.regiao, r.pct));
    return map;
  }, [regioesHistoricas]);

  const linhas = useMemo(() => {
    if (!perguntaSelecionada || !candidatoPesquisa) return [];
    return perguntaSelecionada.crossTab.rows
      .map((row: any) => {
        const pesquisaPct = row.values?.[candidatoPesquisa];
        if (typeof pesquisaPct !== 'number') return null;
        const mesos = REGIAO_PESQUISA_TO_MESO[row.label] ?? [];
        const historicoPcts = mesos.map(m => porMeso.get(m)).filter((v): v is number => v != null);
        if (historicoPcts.length === 0) return null;
        const historicoPct = historicoPcts.reduce((s, v) => s + v, 0) / historicoPcts.length;
        const diff = pesquisaPct - historicoPct;
        return { regiao: row.label, pesquisaPct, historicoPct, diff };
      })
      .filter((r): r is { regiao: string; pesquisaPct: number; historicoPct: number; diff: number } => r !== null)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [perguntaSelecionada, candidatoPesquisa, porMeso]);

  const carregando = loadingPesquisas || loadingCand || loadingRegioes;

  const chartData = linhas
    .slice()
    .sort((a, b) => a.regiao.localeCompare(b.regiao))
    .map(l => ({
      regiao: l.regiao,
      [`Histórico ${ano}`]: Number(l.historicoPct.toFixed(2)),
      'Pesquisa 2026': Number(l.pesquisaPct.toFixed(2)),
    }));

  const contextoInsights = useMemo(() => {
    if (!perguntaSelecionada || linhas.length === 0) return null;
    return {
      modulo: 'Histórico Eleitoral × Pesquisa 2026 — comparativo regional',
      recorte_historico: { ano, turno, cargo: cargoLabel, candidato: candidatoHistorico },
      cenario_pesquisa: { label: perguntaSelecionada.label, candidato: candidatoPesquisa },
      limiar_alerta_pp: LIMIAR_ALERTA_PP,
      comparativo_por_regiao: linhas.map(l => ({
        regiao: l.regiao,
        historico_pct: Number(l.historicoPct.toFixed(2)),
        pesquisa_pct: Number(l.pesquisaPct.toFixed(2)),
        diferenca_pp: Number(l.diff.toFixed(2)),
        acima_do_limiar: Math.abs(l.diff) >= LIMIAR_ALERTA_PP,
      })),
    };
  }, [perguntaSelecionada, candidatoPesquisa, candidatoHistorico, ano, turno, cargoLabel, linhas]);

  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="w-3.5 h-3.5 text-primary" />
        <p className="text-xs font-semibold text-foreground">
          Histórico ({ano} · {cargoLabel}) × pesquisa 2026, por região
        </p>
      </div>

      {perguntasRegionais.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma pesquisa cadastrada tem cruzamento por região ainda.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="min-w-[240px]">
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cenário da pesquisa</label>
              <select
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground"
                value={perguntaId}
                onChange={e => {
                  const p = perguntasRegionais.find(x => x.id === e.target.value);
                  setPerguntaId(e.target.value);
                  setCandidatoPesquisa(p?.candidatos[0] ?? '');
                }}
              >
                {perguntasRegionais.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="min-w-[200px]">
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Candidato (pesquisa)</label>
              <select
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground"
                value={candidatoPesquisa}
                onChange={e => setCandidatoPesquisa(e.target.value)}
              >
                {(perguntaSelecionada?.candidatos ?? []).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="min-w-[220px]">
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Comparar com (histórico)</label>
              <select
                className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground"
                value={candidatoHistorico}
                onChange={e => setCandidatoHistorico(e.target.value)}
              >
                <option value="TODOS">Todos os candidatos (comparecimento)</option>
                {candidatos.map(c => (
                  <option key={c.nome} value={c.nome}>{c.nome} ({c.partido})</option>
                ))}
              </select>
            </div>
          </div>

          {carregando ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Calculando comparativo...
            </div>
          ) : linhas.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Sem dados suficientes para cruzar esse recorte.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-1.5 pr-3 font-medium">Região (pesquisa)</th>
                    <th className="py-1.5 pr-3 font-medium text-right">Histórico {ano}</th>
                    <th className="py-1.5 pr-3 font-medium text-right">Pesquisa 2026</th>
                    <th className="py-1.5 pr-3 font-medium text-right">Diferença</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(l => {
                    const alerta = Math.abs(l.diff) >= LIMIAR_ALERTA_PP;
                    return (
                      <tr key={l.regiao} className="border-b border-border/50 last:border-0">
                        <td className="py-1.5 pr-3 text-foreground">{l.regiao}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-foreground">{l.historicoPct.toFixed(2)}%</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-foreground">{l.pesquisaPct.toFixed(2)}%</td>
                        <td className={`py-1.5 pr-3 text-right tabular-nums font-medium flex items-center justify-end gap-1 ${
                          alerta ? 'text-amber-500' : l.diff >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {alerta && <AlertTriangle className="w-3 h-3" />}
                          {l.diff >= 0 ? '+' : ''}{l.diff.toFixed(2)} p.p.
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-muted-foreground italic mt-2 leading-snug">
                Histórico agregado por mesorregião IBGE a partir dos votos reais de {ano}; pesquisa usa o recorte
                regional próprio do instituto (aproximação — várias regiões da pesquisa podem cair na mesma
                mesorregião). Diferenças ≥ {LIMIAR_ALERTA_PP} p.p. (destacadas) indicam ruptura de padrão em
                relação ao histórico — priorize tracking de campo nessas regiões antes de tirar conclusão.
              </p>

              {/* Gráfico — mesmos dados da tabela, em barras agrupadas por região */}
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 40)}>
                  <BarChart data={chartData} margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="regiao" interval={0} angle={-15} textAnchor="end" height={60} fontSize={11} />
                    <YAxis tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: any) => `${v}%`} />
                    <Legend />
                    <Bar dataKey={`Histórico ${ano}`} fill={COR_HISTORICO} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Pesquisa 2026" fill={COR_PESQUISA} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Achados e insights gerados por IA sobre este comparativo */}
          {contextoInsights && (
            <div className="pt-2">
              <InsightsComunicacao context={contextoInsights} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
