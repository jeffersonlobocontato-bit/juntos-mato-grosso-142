// Cruzamento "Prioridade de Campo": locais de votação onde o histórico
// 2018x2022 mais oscilou E não há registro de tracking de campo no
// município — interseção de dois fatos reais, não é predição.
import { useMemo, useState } from 'react';
import { AlertTriangle, MapPinOff, MapPin, Loader2, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useCandidatosSecoesComuns, usePrioridadeCampo } from '@/hooks/usePrioridadeCampo';

const CD_CARGO_GOVERNADOR = 3;
const AMOSTRA_MINIMA = 100; // total de votos no local — abaixo disso, leitura é indicativa, não conclusiva

export default function PrioridadeCampo() {
  const { data: candidatos, isLoading: loadingCand } = useCandidatosSecoesComuns(CD_CARGO_GOVERNADOR);
  const [candidato, setCandidato] = useState<string>('');
  const [soSemCobertura, setSoSemCobertura] = useState(true);

  const candidatoAtivo = candidato || candidatos?.[0] || '';
  const { data: locais, isLoading: loadingLocais } = usePrioridadeCampo(CD_CARGO_GOVERNADOR, candidatoAtivo || null);

  const ranking = useMemo(() => {
    return (locais ?? [])
      .filter(l => !soSemCobertura || !l.temCoberturaCampo)
      .slice()
      .sort((a, b) => Math.abs(b.diffPp) - Math.abs(a.diffPp));
  }, [locais, soSemCobertura]);

  const resumo = useMemo(() => {
    const total = locais?.length ?? 0;
    const semCobertura = (locais ?? []).filter(l => !l.temCoberturaCampo).length;
    return { total, semCobertura, pctSemCobertura: total ? (semCobertura / total) * 100 : 0 };
  }, [locais]);

  const carregando = loadingCand || loadingLocais;

  if (!loadingCand && (candidatos ?? []).length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum candidato a Governador tem dado de seção eleitoral nos dois anos (2018 e 2022) ainda —
          importe os dois períodos em Histórico Eleitoral para habilitar este cruzamento.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Prioridade de Campo — histórico × cobertura
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Cruza a oscilação de voto por local (2018 → 2022, mesmo candidato, mesmo endereço) com a presença
            de entrevistas de tracking no município. Aponta onde há mais mudança histórica e menos dado de
            campo recente — não é previsão de resultado, é onde vale mandar gente pra confirmar o que os
            números sugerem.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px]">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
              Candidato (concorreu em 2018 e 2022)
            </label>
            <select
              className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground"
              value={candidatoAtivo}
              onChange={e => setCandidato(e.target.value)}
            >
              {(candidatos ?? []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer select-none pb-1.5">
            <Checkbox checked={soSemCobertura} onCheckedChange={v => setSoSemCobertura(!!v)} />
            Mostrar só locais sem cobertura de campo
          </label>
        </CardContent>
      </Card>

      {carregando ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Calculando...
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Locais no cruzamento</p>
                <p className="text-xl font-bold text-foreground">{resumo.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sem cobertura de campo</p>
                <p className="text-xl font-bold text-foreground">{resumo.semCobertura}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">% sem cobertura</p>
                <p className="text-xl font-bold text-foreground">{resumo.pctSemCobertura.toFixed(0)}%</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ranking por oscilação (2018 → 2022)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhum local no recorte atual.</p>
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b border-border">
                      <th className="py-1.5 pr-3 font-medium">Município</th>
                      <th className="py-1.5 pr-3 font-medium">Local de votação</th>
                      <th className="py-1.5 pr-3 font-medium text-right">2018</th>
                      <th className="py-1.5 pr-3 font-medium text-right">2022</th>
                      <th className="py-1.5 pr-3 font-medium text-right">Oscilação</th>
                      <th className="py-1.5 pr-3 font-medium text-center">Cobertura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.slice(0, 100).map((l, i) => {
                      const amostraFragil = l.total2022 < AMOSTRA_MINIMA || l.total2018 < AMOSTRA_MINIMA;
                      return (
                        <tr key={`${l.nmMunicipio}-${l.dsEndereco}-${i}`} className="border-b border-border/50 last:border-0">
                          <td className="py-1.5 pr-3 text-foreground whitespace-nowrap">{l.nmMunicipio}</td>
                          <td className="py-1.5 pr-3 text-foreground">
                            <div className="flex items-center gap-1">
                              <span className="truncate max-w-[280px]">{l.nmLocalVotacao ?? l.dsEndereco}</span>
                              {amostraFragil && (
                                <span title={`Amostra pequena: ${l.total2018} votos em 2018, ${l.total2022} em 2022 — leitura indicativa, não conclusiva`}>
                                  <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{l.pct2018.toFixed(1)}%</td>
                          <td className="py-1.5 pr-3 text-right tabular-nums text-foreground">{l.pct2022.toFixed(1)}%</td>
                          <td className={`py-1.5 pr-3 text-right tabular-nums font-medium ${l.diffPp >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {l.diffPp >= 0 ? '+' : ''}{l.diffPp.toFixed(1)} p.p.
                          </td>
                          <td className="py-1.5 pr-3 text-center">
                            {l.temCoberturaCampo ? (
                              <Badge variant="secondary" className="gap-1"><MapPin className="w-3 h-3" /> tem</Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-amber-600 border-amber-500/50"><MapPinOff className="w-3 h-3" /> não tem</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {ranking.length > 100 && (
                <p className="text-[10px] text-muted-foreground italic mt-2">
                  Mostrando os 100 locais com maior oscilação de {ranking.length} no recorte.
                </p>
              )}
              <p className="text-[10px] text-muted-foreground italic mt-3 leading-snug">
                "Cobertura" verifica se o município do local já teve pelo menos uma entrevista de tracking
                registrada (qualquer rodada) — não é por local exato. ⚠ marca locais com menos de {AMOSTRA_MINIMA} votos
                em algum dos dois anos, onde a oscilação em pontos percentuais é mais sensível a ruído.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
