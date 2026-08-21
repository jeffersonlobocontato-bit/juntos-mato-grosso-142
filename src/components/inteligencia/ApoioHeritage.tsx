import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  APOIO_HERITAGE_FONTE,
  APOIO_PERGUNTA,
  APOIO_TRANSFERENCIA,
  HERITAGE_ACHADO,
  HERITAGE_PERGUNTA,
  HERITAGE_POR_REGIAO,
  HERITAGE_TOTAL,
} from '@/data/apoioHeritageMt';

function Barra({ valor, tone }: { valor: number; tone: 'pos' | 'neu' | 'neg' | 'nsnr' }) {
  const cls =
    tone === 'pos' ? 'bg-primary'
    : tone === 'neg' ? 'bg-destructive'
    : tone === 'neu' ? 'bg-muted-foreground/40'
    : 'bg-muted-foreground/20';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${cls}`} style={{ width: `${Math.min(100, valor)}%` }} />
      </div>
      <span className="w-12 text-right text-xs tabular-nums font-medium">{valor.toFixed(1)}%</span>
    </div>
  );
}

export default function ApoioHeritage() {
  const maxSim = Math.max(...HERITAGE_POR_REGIAO.map(r => r.sim));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Apoio de políticos e transferência de votos</CardTitle>
            <Badge variant="secondary">
              {APOIO_HERITAGE_FONTE.instituto} · {APOIO_HERITAGE_FONTE.divulgacao}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{APOIO_PERGUNTA}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-4 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" />Aumentaria</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />Não altera</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-destructive" />Diminui</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/20" />NS/NR</span>
          </div>

          {APOIO_TRANSFERENCIA.map(l => (
            <div key={l.politico} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{l.politico}</p>
                <span className="text-xs text-muted-foreground shrink-0">
                  saldo {(l.aumentaria - l.diminui) >= 0 ? '+' : ''}{(l.aumentaria - l.diminui).toFixed(1)}pp
                </span>
              </div>
              <Barra valor={l.aumentaria} tone="pos" />
              <Barra valor={l.naoAltera} tone="neu" />
              <Barra valor={l.diminui} tone="neg" />
              <Barra valor={l.nsnr} tone="nsnr" />
            </div>
          ))}

          <p className="text-xs text-muted-foreground">
            Leitura: a maioria dos eleitores declara que apoios políticos não alteram o voto — o
            diferencial está no saldo entre “aumentaria” e “diminui a vontade de votar”.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Operação Heritage — conhecimento do eleitorado</CardTitle>
            <Badge variant="secondary">
              {APOIO_HERITAGE_FONTE.instituto} · {APOIO_HERITAGE_FONTE.divulgacao}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{HERITAGE_PERGUNTA}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground uppercase">Ficou sabendo</p>
              <p className="text-3xl font-bold text-primary">{HERITAGE_TOTAL.sim.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs text-muted-foreground uppercase">Não ficou sabendo</p>
              <p className="text-3xl font-bold">{HERITAGE_TOTAL.nao.toFixed(1)}%</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                  <th className="py-2 pr-3 font-medium">Região</th>
                  <th className="py-2 px-3 font-medium text-right">Sim</th>
                  <th className="py-2 pl-3 font-medium text-right">Não</th>
                </tr>
              </thead>
              <tbody>
                {HERITAGE_POR_REGIAO.map(r => (
                  <tr key={r.regiao} className="border-b last:border-0">
                    <td className="py-2 pr-3">{r.regiao}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      <span
                        className="inline-block rounded px-2 py-0.5 font-medium"
                        style={{ backgroundColor: `hsl(var(--primary) / ${(r.sim / maxSim) * 0.35 + 0.05})` }}
                      >
                        {r.sim.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 pl-3 text-right tabular-nums text-muted-foreground">{r.nao.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2 pr-3">Total</td>
                  <td className="py-2 px-3 text-right tabular-nums">{HERITAGE_TOTAL.sim.toFixed(1)}%</td>
                  <td className="py-2 pl-3 text-right tabular-nums">{HERITAGE_TOTAL.nao.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{HERITAGE_ACHADO}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
