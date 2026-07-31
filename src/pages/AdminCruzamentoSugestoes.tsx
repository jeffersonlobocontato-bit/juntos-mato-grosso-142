import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RefreshCw, Network, MapPin, Layers, Building2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const NAVY = '#1F3864';
const RED = '#C00000';
const GOLD = '#B4872E';
const PALETTE = [NAVY, RED, GOLD, '#2E5FA3', '#7A1F1F', '#0E6B4F'];

const db = supabase as any;

const rpc = async <T,>(fn: string, args?: Record<string, unknown>): Promise<T[]> => {
  const { data, error } = await db.rpc(fn, args ?? {});
  if (error) throw error;
  return (data ?? []) as T[];
};

const heatColor = (ratio: number) => {
  if (ratio <= 0) return 'transparent';
  const from = [31, 56, 100];
  const to = [192, 0, 0];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * ratio));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${0.15 + ratio * 0.75})`;
};

export default function AdminCruzamentoSugestoes() {
  const { user, isLoading: authLoading, isAdmin, roles } = useAuth();
  const [lastEvent, setLastEvent] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [regiaoAberta, setRegiaoAberta] = useState<string | null>(null);
  const [temaAberto, setTemaAberto] = useState<string | null>(null);

  const authorized = !!user && (isAdmin || roles.includes('lider_tematico' as any));

  const resumo = useQuery({
    queryKey: ['pc-resumo'],
    queryFn: () => rpc<any>('painel_cruzamento_resumo'),
    enabled: authorized,
  });
  const porRegiao = useQuery({
    queryKey: ['pc-regiao'],
    queryFn: () => rpc<any>('painel_cruzamento_por_regiao'),
    enabled: authorized,
  });
  const porEixo = useQuery({
    queryKey: ['pc-eixo'],
    queryFn: () => rpc<any>('painel_cruzamento_por_eixo'),
    enabled: authorized,
  });
  const regiaoEixo = useQuery({
    queryKey: ['pc-regiao-eixo'],
    queryFn: () => rpc<any>('painel_cruzamento_regiao_eixo'),
    enabled: authorized,
  });
  const ranking = useQuery({
    queryKey: ['pc-ranking'],
    queryFn: () => rpc<any>('painel_cruzamento_ranking_cidades'),
    enabled: authorized,
  });
  const semantico = useQuery({
    queryKey: ['pc-semantico'],
    queryFn: () => rpc<any>('painel_cruzamento_semantico_regiao'),
    enabled: authorized,
  });
  const reclass = useQuery({
    queryKey: ['pc-reclass'],
    queryFn: () => rpc<any>('painel_cruzamento_reclassificacao'),
    enabled: authorized,
  });
  const cidadeEixo = useQuery({
    queryKey: ['pc-cidade-eixo'],
    queryFn: () => rpc<any>('painel_cruzamento_cidade_eixo', { p_limit: 20 }),
    enabled: authorized,
  });
  const nuvem = useQuery({
    queryKey: ['pc-nuvem'],
    queryFn: () => rpc<any>('painel_cruzamento_nuvem_palavras', { p_limit: 80 }),
    enabled: authorized,
    refetchInterval: 60_000,
  });
  const taxCobertura = useQuery({
    queryKey: ['pc-tax-cobertura'],
    queryFn: () => rpc<any>('painel_taxonomia_cobertura'),
    enabled: authorized,
  });
  const taxResumo = useQuery({
    queryKey: ['pc-tax-resumo'],
    queryFn: () => rpc<any>('painel_taxonomia_resumo'),
    enabled: authorized,
  });
  const [reclassificando, setReclassificando] = useState(false);

  const reclassificar = async () => {
    setReclassificando(true);
    try {
      await db.rpc('reclassificar_sugestoes_taxonomia', { p_somente_pendentes: true, p_limite: 5000 });
      await Promise.all([taxCobertura.refetch(), taxResumo.refetch()]);
    } finally {
      setReclassificando(false);
    }
  };

  const refetchAll = () => {
    [resumo, porRegiao, porEixo, regiaoEixo, ranking, semantico, reclass, cidadeEixo, nuvem, taxCobertura, taxResumo].forEach(q => q.refetch());
    setLastEvent(new Date());
  };

  // Realtime (com debounce de 3s para evitar rajadas)
  useEffect(() => {
    if (!authorized) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { refetchAll(); timer = null; }, 3000);
    };
    const channel = supabase
      .channel('painel-cruzamento')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sugestoes_populares' }, schedule)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sugestao_classificacao_semantica' }, schedule)
      .subscribe();
    return () => { if (timer) clearTimeout(timer); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  useEffect(() => {
    const t = setInterval(() => setSecondsAgo(Math.round((Date.now() - lastEvent.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [lastEvent]);

  const totals = resumo.data?.[0];
  const eixoData = (porEixo.data ?? []).map((d: any) => ({ name: d.eixo, value: Number(d.total) }));
  const regiaoData = (porRegiao.data ?? []).map((d: any) => ({ name: d.mesorregiao, total: Number(d.total) }));
  const totalGeral = eixoData.reduce((s, d) => s + d.value, 0) || 1;

  const top3PorRegiao = useMemo(() => {
    const map: Record<string, { eixo: string; total: number }[]> = {};
    (regiaoEixo.data ?? []).forEach((r: any) => {
      (map[r.mesorregiao] ||= []).push({ eixo: r.eixo, total: Number(r.total) });
    });
    Object.values(map).forEach(list => list.sort((a, b) => b.total - a.total));
    return map;
  }, [regiaoEixo.data]);

  const subeixosDaRegiaoTema = useMemo(() => {
    if (!regiaoAberta || !temaAberto) return [];
    return (semantico.data ?? [])
      .filter((s: any) => s.mesorregiao === regiaoAberta && s.eixo_detectado === temaAberto)
      .map((s: any) => ({ nome: s.subeixo_detectado || 'Geral', total: Number(s.total) }))
      .sort((a, b) => b.total - a.total);
  }, [semantico.data, regiaoAberta, temaAberto]);

  const cidadesDaRegiao = useMemo(() => {
    if (!regiaoAberta) return [];
    return (ranking.data ?? [])
      .filter((c: any) => c.mesorregiao === regiaoAberta)
      .slice(0, 10)
      .map((c: any) => ({ nome: c.municipio, total: Number(c.total) }));
  }, [ranking.data, regiaoAberta]);

  const heat = useMemo(() => {
    const cities: string[] = [];
    const eixos: string[] = [];
    const cell: Record<string, number> = {};
    (cidadeEixo.data ?? []).forEach((r: any) => {
      if (!cities.includes(r.municipio)) cities.push(r.municipio);
      if (!eixos.includes(r.eixo)) eixos.push(r.eixo);
      cell[`${r.municipio}||${r.eixo}`] = Number(r.total);
    });
    const cityTotals: Record<string, number> = {};
    cities.forEach(c => { cityTotals[c] = eixos.reduce((s, e) => s + (cell[`${c}||${e}`] || 0), 0); });
    cities.sort((a, b) => cityTotals[b] - cityTotals[a]);
    const max = Math.max(1, ...Object.values(cell));
    return { cities, eixos, cell, max, cityTotals };
  }, [cidadeEixo.data]);

  const rec = reclass.data?.[0];
  const cob = taxCobertura.data?.[0];
  const topTemas = useMemo(() => {
    const map: Record<string, { eixo: string; total: number }> = {};
    (taxResumo.data ?? []).forEach((r: any) => {
      if (!r.tema) return;
      const cur = map[r.tema];
      const total = Number(r.total);
      if (!cur || total > cur.total) map[r.tema] = { eixo: r.eixo, total };
    });
    return Object.entries(map)
      .map(([tema, v]) => ({ tema, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
  }, [taxResumo.data]);
  const nuvemMax = Math.max(1, ...(nuvem.data ?? []).map((w: any) => Number(w.freq)));

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin text-4xl">⏳</div></div>;
  }
  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="p-8"><p className="text-muted-foreground">Acesso não autorizado</p></Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
            </Link>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5" style={{ color: NAVY }} />
              <span className="font-display font-bold">Painel de Cruzamento — Sugestões Populares</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-2 border-[#00A85A]/40 text-[#00A85A]">
              <span className="w-2 h-2 rounded-full bg-[#00A85A] animate-pulse" />
              ao vivo — atualizado há {secondsAgo}s
            </Badge>
            <Button variant="outline" size="sm" onClick={refetchAll}>
              <RefreshCw className="w-4 h-4 mr-2" />Atualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Sugestões', value: totals?.total_sugestoes, icon: Layers },
            { label: 'Municípios do PR', value: totals?.total_municipios, icon: Building2 },
            { label: 'Mesorregiões', value: totals?.total_regioes, icon: MapPin },
            { label: 'Eixos', value: totals?.total_eixos, icon: Network },
          ].map(item => (
            <Card key={item.label} className="border-l-4" style={{ borderLeftColor: RED }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                  <item.icon className="w-4 h-4" />{item.label}
                </div>
                <p className="text-3xl font-bold mt-1" style={{ color: NAVY }}>
                  {Number(item.value ?? 0).toLocaleString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Segmented distribution bar */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição por eixo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex w-full h-4 rounded-full overflow-hidden">
              {eixoData.map((e, i) => (
                <div key={e.name} style={{ width: `${(e.value / totalGeral) * 100}%`, background: PALETTE[i % PALETTE.length] }} title={`${e.name}: ${e.value}`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {eixoData.map((e, i) => (
                <span key={e.name} className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                  {e.name} · {((e.value / totalGeral) * 100).toFixed(1)}%
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 1ª dobra */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Sugestões por mesorregião</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regiaoData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={130} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="total" fill={NAVY} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Sugestões por eixo (tag do cidadão)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={eixoData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                    {eixoData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Ranking de cidades</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-72 overflow-auto">
              {(ranking.data ?? []).slice(0, 25).map((c: any, i: number) => {
                const max = Number(ranking.data?.[0]?.total ?? 1);
                return (
                  <div key={c.municipio} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{i + 1}. {c.municipio}</span>
                      <span className="font-semibold">{c.total}</span>
                    </div>
                    <div className="h-2 rounded bg-muted overflow-hidden">
                      <div className="h-full" style={{ width: `${(Number(c.total) / max) * 100}%`, background: GOLD }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Top 3 temas por região */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Top 3 temas por região</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {Object.entries(top3PorRegiao).map(([regiao, temas]) => {
              const aberta = regiaoAberta === regiao;
              const destaque = (semantico.data ?? [])
                .filter((s: any) => s.mesorregiao === regiao)
                .sort((a: any, b: any) => Number(b.total) - Number(a.total))[0];
              return (
                <div
                  key={regiao}
                  className="rounded-lg border bg-card p-4 cursor-pointer transition-shadow hover:shadow-md border-l-4"
                  style={{ borderLeftColor: aberta ? RED : NAVY }}
                  onClick={() => { setRegiaoAberta(aberta ? null : regiao); setTemaAberto(null); }}
                >
                  <p className="font-semibold text-sm" style={{ color: NAVY }}>{regiao}</p>
                  {destaque && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Subtema mais citado: <span className="font-semibold" style={{ color: GOLD }}>{destaque.subeixo_detectado || destaque.eixo_detectado}</span> ({destaque.total})
                    </p>
                  )}
                  <ul className="mt-3 space-y-1">
                    {(aberta ? temas : temas.slice(0, 3)).map(t => (
                      <li key={t.eixo}>
                        <button
                          className="w-full text-left text-xs flex justify-between hover:underline"
                          onClick={(e) => { e.stopPropagation(); setRegiaoAberta(regiao); setTemaAberto(temaAberto === t.eixo ? null : t.eixo); }}
                        >
                          <span>{t.eixo}</span><span className="font-semibold">{t.total}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {aberta && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Cidades que mais contribuíram</p>
                      {cidadesDaRegiao.map(c => (
                        <div key={c.nome} className="flex justify-between text-xs"><span>{c.nome}</span><span>{c.total}</span></div>
                      ))}
                      {temaAberto && (
                        <>
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-2">Subtemas — {temaAberto}</p>
                          {subeixosDaRegiaoTema.length === 0 && <p className="text-xs text-muted-foreground">Sem subtemas detectados.</p>}
                          {subeixosDaRegiaoTema.map(s => (
                            <div key={s.nome} className="flex justify-between text-xs"><span>{s.nome}</span><span>{s.total}</span></div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Reclassificação semântica */}
        <Card className="border-l-4" style={{ borderLeftColor: RED }}>
          <CardHeader className="pb-2"><CardTitle className="text-base">Reclassificação semântica do "Geral"</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Sugestões "Geral"', value: rec?.geral_total },
              { label: 'Com tema detectado', value: rec?.geral_com_tema },
              { label: 'Sem tema detectado', value: rec?.geral_sem_tema },
              { label: 'Cruzando 2+ temas', value: rec?.multi_tema },
            ].map(m => (
              <div key={m.label}>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold" style={{ color: NAVY }}>{Number(m.value ?? 0).toLocaleString('pt-BR')}</p>
                {rec?.geral_total > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {((Number(m.value ?? 0) / Number(rec.geral_total)) * 100).toFixed(1)}% do "Geral"
                  </p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Heatmap cidade x eixo */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Mapa de calor — 20 cidades com mais sugestões × eixo</CardTitle></CardHeader>
          <CardContent className="overflow-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-2 sticky left-0 bg-card">Cidade</th>
                  {heat.eixos.map(e => <th key={e} className="p-2 text-center font-medium max-w-[120px]">{e}</th>)}
                  <th className="p-2 text-center">Total</th>
                </tr>
              </thead>
              <tbody>
                {heat.cities.map(c => (
                  <tr key={c}>
                    <td className="p-2 sticky left-0 bg-card font-medium">{c}</td>
                    {heat.eixos.map(e => {
                      const v = heat.cell[`${c}||${e}`] || 0;
                      return (
                        <td key={e} className="p-2 text-center" style={{ background: heatColor(v / heat.max), color: v / heat.max > 0.55 ? '#fff' : undefined }}>
                          {v || '—'}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-semibold">{heat.cityTotals[c]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Nuvem de termos (eixos, temas e subtemas) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nuvem de temas mencionados (eixos, temas e subtemas)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: NAVY }} />Eixo</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: RED }} />Tema</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: GOLD }} />Subtema</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 items-baseline">
              {(nuvem.data ?? []).map((w: any) => {
                const r = Number(w.freq) / nuvemMax;
                const color = w.nivel === 'eixo' ? NAVY : w.nivel === 'tema' ? RED : GOLD;
                return (
                  <span
                    key={`${w.nivel}-${w.palavra}`}
                    className="leading-tight whitespace-nowrap"
                    style={{ fontSize: `${0.8 + r * 1.5}rem`, color, fontWeight: r > 0.4 ? 700 : 600 }}
                    title={`${w.nivel} · ${w.freq} menções`}
                  >
                    {w.palavra}
                  </span>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Painel analítico agregado — não exibe nome ou WhatsApp dos cidadãos. A classificação semântica é derivada automaticamente e pode ser recalculada a qualquer momento.
        </p>
        {Number(totals?.total_nao_identificados ?? 0) > 0 && (
          <p className="text-xs text-muted-foreground">
            {Number(totals?.total_nao_identificados).toLocaleString('pt-BR')} registro(s) com cidade fora do Paraná ou não identificada não entram na contagem de municípios.
          </p>
        )}
      </main>
    </div>
  );
}
