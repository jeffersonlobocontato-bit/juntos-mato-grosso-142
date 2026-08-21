// Cruzamentos (tabulações cruzadas) das pesquisas cadastradas —
// dados reais vindos de public.survey_crosstabs via useSurveys().
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend,
} from 'recharts';
import { CANDIDATE_COLORS, type CrossTab, type PollQuestion, type PollWave } from '@/data/pollsData';

const NAO_CANDIDATO = /nulo|branco|ns\/|não sabe|nao sabe|indeciso|^nr$|nenhum/i;

interface Props {
  waves: PollWave[];
  questions: PollQuestion[];
  /** candidato destacado nas tabelas */
  destaque?: string;
}

interface CrossTabEntry {
  key: string;
  waveLabel: string;
  cargo: string;
  scenario: string;
  tab: CrossTab;
}

function heat(value: number | undefined, max: number) {
  if (value == null) return undefined;
  const alpha = max > 0 ? Math.min(0.85, (value / max) * 0.85) : 0;
  return `hsl(var(--primary) / ${alpha.toFixed(2)})`;
}

export default function CruzamentosSegmentos({ waves, questions, destaque }: Props) {
  const entries: CrossTabEntry[] = useMemo(() => {
    const list: CrossTabEntry[] = [];
    questions.forEach(q => {
      const w = waves.find(x => x.id === q.waveId);
      q.crossTabs.forEach(tab => {
        list.push({
          key: `${q.id}-${tab.filterType}`,
          waveLabel: w ? `${w.institute} · ${w.releaseDate}` : '',
          cargo: q.cargo === 'governador' ? 'Governador' : q.cargo === 'senador' ? 'Senador' : 'Presidente',
          scenario: q.scenarioLabel,
          tab,
        });
      });
    });
    return list;
  }, [waves, questions]);

  const [sel, setSel] = useState<string>(entries[0]?.key ?? '');
  const current = entries.find(e => e.key === sel) ?? entries[0];

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum cruzamento (região, sexo, idade, renda…) cadastrado para as pesquisas atuais.
        </CardContent>
      </Card>
    );
  }

  const tab = current.tab;
  const candidatosReais = tab.candidates.filter(c => !NAO_CANDIDATO.test(c));
  const maxValor = Math.max(
    ...tab.rows.flatMap(r => candidatosReais.map(c => r.values[c] ?? 0)),
    0,
  );
  const chartData = tab.rows.map(r => ({
    segmento: r.label,
    ...Object.fromEntries(candidatosReais.map(c => [c, r.values[c] ?? 0])),
  }));
  const topCandidatos = [...candidatosReais]
    .sort(
      (a, b) =>
        tab.rows.reduce((s, r) => s + (r.values[b] ?? 0), 0) -
        tab.rows.reduce((s, r) => s + (r.values[a] ?? 0), 0),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Selecione o cruzamento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {entries.map(e => (
            <Button
              key={e.key}
              size="sm"
              variant={e.key === current.key ? 'default' : 'outline'}
              onClick={() => setSel(e.key)}
              className="text-xs"
            >
              {e.cargo} · {e.tab.filterLabel.split(' (')[0]}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{tab.filterLabel}</CardTitle>
            <Badge variant="secondary">{current.cargo} · {current.scenario}</Badge>
            <Badge variant="outline">{current.waveLabel}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {tab.basis === 'perfil'
              ? 'Leitura: composição do eleitorado de cada candidato (cada linha do candidato soma 100%).'
              : 'Leitura: percentual dentro de cada segmento (cada coluna do segmento soma 100%).'}
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b text-muted-foreground">
                <th className="py-2 pr-3 sticky left-0 bg-background">Segmento</th>
                {tab.candidates.map(c => (
                  <th key={c} className="py-2 px-2 text-right whitespace-nowrap">
                    <span style={{ color: CANDIDATE_COLORS[c] ?? undefined }}>{c}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tab.rows.map(r => (
                <tr key={r.label} className="border-b">
                  <td className="py-2 pr-3 font-medium sticky left-0 bg-background whitespace-nowrap">{r.label}</td>
                  {tab.candidates.map(c => {
                    const v = r.values[c];
                    const realce = destaque && c === destaque;
                    return (
                      <td
                        key={c}
                        className={`py-2 px-2 text-right tabular-nums ${realce ? 'font-bold' : ''}`}
                        style={{
                          background: NAO_CANDIDATO.test(c) ? undefined : heat(v, maxValor),
                        }}
                      >
                        {v != null ? `${v.toFixed(1)}%` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Visualização — principais candidatos</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={Math.max(300, tab.rows.length * 46)}>
            <BarChart data={chartData} margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="segmento" interval={0} angle={-15} textAnchor="end" height={60} fontSize={11} />
              <YAxis tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: any) => `${v}%`} />
              <Legend />
              {topCandidatos.map(c => (
                <Bar key={c} dataKey={c} fill={CANDIDATE_COLORS[c] ?? '#9ca3af'} radius={[3, 3, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
