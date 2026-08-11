import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Sparkles, Users, MapPin, Layers, TrendingUp, ChevronDown, RefreshCw, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ParanaMap from '@/components/admin/ParanaMap';
import MarketingIAChat from '@/components/admin/MarketingIAChat';
import { PERSONAS, CASES, ARGUMENTOS_POR_EIXO } from '@/components/admin/mkt/mktContent';
import { contarPalavras, dorDominante } from '@/components/admin/mkt/textAnalysis';
import { gerarNarrativaRegiao } from '@/components/admin/mkt/regiaoNarrativa';

const db = supabase as any;
const rpc = async <T,>(fn: string, args?: Record<string, unknown>): Promise<T[]> => {
  const { data, error } = await db.rpc(fn, args ?? {});
  if (error) throw error;
  return (data ?? []) as T[];
};

const EIXOS_ORDEM = [
  'Geral',
  'Desenvolvimento Social',
  'Desenvolvimento das Cidades e Infraestrutura',
  'Desenvolvimento Econômico Sustentável',
  'Segurança, Justiça, Combate à Corrupção',
  'Gestão Pública Eficiente',
];

interface SugestaoLista {
  id: string;
  nome: string;
  municipio: string;
  mesorregiao: string;
  eixo: string;
  descricao: string;
  genero: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

function ExpandHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-foreground/80">
      <ChevronDown className="h-4 w-4 text-accent shrink-0" />
      <span>{children}</span>
    </div>
  );
}

interface SugestaoListaUnused {
  id: string;
  nome: string;
  municipio: string;
  mesorregiao: string;
  eixo: string;
  descricao: string;
  genero: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export default function AdminModuloMkt() {
  const { user, isLoading: authLoading, isAdmin, roles } = useAuth();
  const authorized = !!user && (isAdmin || roles.includes('lider_tematico' as any) || roles.includes('marketing' as any) || roles.includes('admin_master' as any));

  const [eixoAberto, setEixoAberto] = useState<string | null>(null);
  const [regiaoAberta, setRegiaoAberta] = useState<string | null>(null);
  const [fEixo, setFEixo] = useState('all');
  const [fRegiao, setFRegiao] = useState('all');
  const [fMunicipio, setFMunicipio] = useState('all');
  const [fGenero, setFGenero] = useState('all');
  const [busca, setBusca] = useState('');
  const [sugestaoAberta, setSugestaoAberta] = useState<string | null>(null);

  const resumo = useQuery({ queryKey: ['mkt-resumo'], queryFn: () => rpc<any>('painel_cruzamento_resumo'), enabled: authorized });
  const porRegiao = useQuery({ queryKey: ['mkt-regiao'], queryFn: () => rpc<any>('painel_cruzamento_por_regiao'), enabled: authorized });
  const porEixo = useQuery({ queryKey: ['mkt-eixo'], queryFn: () => rpc<any>('painel_cruzamento_por_eixo'), enabled: authorized });
  const regiaoEixo = useQuery({ queryKey: ['mkt-regiao-eixo'], queryFn: () => rpc<any>('painel_cruzamento_regiao_eixo'), enabled: authorized });
  const generoRegiao = useQuery({ queryKey: ['mkt-genero-regiao'], queryFn: () => rpc<any>('painel_genero_por_regiao'), enabled: authorized });
  const lista = useQuery({
    queryKey: ['mkt-lista'],
    queryFn: () => rpc<SugestaoLista>('painel_cruzamento_lista_sugestoes', { p_limit: 3000, p_offset: 0 }),
    enabled: authorized,
  });
  const narrativas = useQuery({
    queryKey: ['mkt-narrativas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('painel_narrativas' as any).select('regiao, campo, texto');
      if (error) throw error;
      const map: Record<string, { nota?: string; foco?: string }> = {};
      (data || []).forEach((n: any) => {
        map[n.regiao] ||= {};
        map[n.regiao][n.campo as 'nota' | 'foco'] = n.texto;
      });
      return map;
    },
    enabled: authorized,
  });

  const totals = resumo.data?.[0];
  const totalGeral = (porEixo.data ?? []).reduce((s: number, e: any) => s + Number(e.total), 0) || 1;

  // ---- Gênero geral (a partir da lista individual, já sem PII) ----
  const generoGeral = useMemo(() => {
    const rows = lista.data ?? [];
    const masc = rows.filter(r => r.genero === 'masculino').length;
    const fem = rows.filter(r => r.genero === 'feminino').length;
    const total = masc + fem || 1;
    return { masc, fem, femPct: Math.round((fem / total) * 100), mascPct: Math.round((masc / total) * 100) };
  }, [lista.data]);

  // ---- Gênero x eixo (excluindo Geral) ----
  const generoPorEixo = useMemo(() => {
    const rows = (lista.data ?? []).filter(r => r.eixo !== 'Geral' && r.eixo !== 'Não classificado');
    const porGenero = { masculino: rows.filter(r => r.genero === 'masculino'), feminino: rows.filter(r => r.genero === 'feminino') };
    const eixos = Array.from(new Set(rows.map(r => r.eixo)));
    return eixos.map(eixo => {
      const mTotal = porGenero.masculino.length || 1;
      const fTotal = porGenero.feminino.length || 1;
      const mPct = Math.round((porGenero.masculino.filter(r => r.eixo === eixo).length / mTotal) * 100);
      const fPct = Math.round((porGenero.feminino.filter(r => r.eixo === eixo).length / fTotal) * 100);
      return { eixo, mPct, fPct };
    }).sort((a, b) => b.fPct - a.fPct);
  }, [lista.data]);

  // ---- Nuvem de palavras por eixo (client-side, a partir do texto real) ----
  const nuvemPorEixo = useMemo(() => {
    const map: Record<string, Array<{ palavra: string; freq: number }>> = {};
    for (const eixo of EIXOS_ORDEM) {
      const textos = (lista.data ?? []).filter(r => r.eixo === eixo).map(r => r.descricao);
      map[eixo] = contarPalavras(textos, 26);
    }
    return map;
  }, [lista.data]);

  // ---- Regiões: dados combinados (contagem + tema dominante + gênero + narrativa + dor) ----
  const regioesCombinadas = useMemo(() => {
    const regioes = (porRegiao.data ?? []).map((r: any) => r.mesorregiao as string);
    const totalEstado = (porRegiao.data ?? []).reduce((s: number, r: any) => s + Number(r.total), 0);
    return regioes.map(regiao => {
      const total = Number((porRegiao.data ?? []).find((r: any) => r.mesorregiao === regiao)?.total ?? 0);
      const temas = (regiaoEixo.data ?? [])
        .filter((r: any) => r.mesorregiao === regiao && r.eixo !== 'Geral' && r.eixo !== 'Não classificado')
        .sort((a: any, b: any) => Number(b.total) - Number(a.total));
      const temaDominante = temas[0];
      const gen = (generoRegiao.data ?? []).find((r: any) => r.mesorregiao === regiao);
      const genTotal = (Number(gen?.masculino) || 0) + (Number(gen?.feminino) || 0) || 1;
      const femPct = Math.round(((Number(gen?.feminino) || 0) / genTotal) * 100);
      const textosRegiao = (lista.data ?? []).filter(r => r.mesorregiao === regiao).map(r => r.descricao);
      const dor = dorDominante(textosRegiao);
      const narrativa = narrativas.data?.[regiao];
      const gerada = gerarNarrativaRegiao({
        regiao, total, totalEstado,
        temas: temas.map((t: any) => ({ eixo: t.eixo, total: Number(t.total) })),
        femPct, mascPct: 100 - femPct, dor, textos: textosRegiao,
      });
      return {
        regiao, total,
        temaDominante: temaDominante?.eixo ?? '—',
        temaDominantePct: temaDominante ? Math.round((Number(temaDominante.total) / total) * 100) : 0,
        femPct, mascPct: 100 - femPct,
        dor,
        nota: narrativa?.nota ?? gerada.nota,
        foco: narrativa?.foco ?? gerada.foco,
        curada: !!narrativa?.nota,
      };
    }).sort((a, b) => b.total - a.total);
  }, [porRegiao.data, regiaoEixo.data, generoRegiao.data, lista.data, narrativas.data]);

  const carregando =
    resumo.isFetching || porRegiao.isFetching || porEixo.isFetching ||
    regiaoEixo.isFetching || generoRegiao.isFetching || lista.isFetching || narrativas.isFetching;

  // ---- Mapa: filtros, lista filtrada e marcadores agregados por cidade ----
  const municipiosDisponiveis = useMemo(
    () => Array.from(new Set((lista.data ?? []).map(r => r.municipio))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [lista.data],
  );
  const regioesDisponiveis = useMemo(
    () => Array.from(new Set((lista.data ?? []).map(r => r.mesorregiao))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [lista.data],
  );
  const eixosDisponiveis = useMemo(
    () => Array.from(new Set((lista.data ?? []).map(r => r.eixo))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [lista.data],
  );

  const listaFiltrada = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (lista.data ?? []).filter(r =>
      (fEixo === 'all' || r.eixo === fEixo) &&
      (fRegiao === 'all' || r.mesorregiao === fRegiao) &&
      (fMunicipio === 'all' || r.municipio === fMunicipio) &&
      (fGenero === 'all' || r.genero === fGenero) &&
      (!q || r.descricao.toLowerCase().includes(q) || r.nome.toLowerCase().includes(q) || r.municipio.toLowerCase().includes(q))
    );
  }, [lista.data, fEixo, fRegiao, fMunicipio, fGenero, busca]);

  const marcadores = useMemo(() => {
    const porCidade = new Map<string, { lat: number; lng: number; total: number; eixo: string; mesorregiao: string }>();
    for (const r of listaFiltrada) {
      if (r.latitude == null || r.longitude == null) continue;
      const atual = porCidade.get(r.municipio);
      if (atual) atual.total += 1;
      else porCidade.set(r.municipio, { lat: Number(r.latitude), lng: Number(r.longitude), total: 1, eixo: r.eixo, mesorregiao: r.mesorregiao });
    }
    return Array.from(porCidade.entries()).map(([municipio, v]) => ({
      id: municipio,
      latitude: v.lat,
      longitude: v.lng,
      title: municipio,
      description: `${v.total} sugestão(ões) · ${v.mesorregiao}`,
      eixo: v.eixo,
      municipio,
      count: v.total,
    }));
  }, [listaFiltrada]);

  const atualizarTudo = () => {
    [resumo, porRegiao, porEixo, regiaoEixo, generoRegiao, lista, narrativas].forEach(q => q.refetch());
  };

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
    <div className="min-h-screen bg-background">
      {/* Hero — mesmo padrão visual da LP principal */}
      <div className="relative bg-gradient-primary overflow-hidden">
        <div className="container mx-auto px-4 py-10 md:py-14 relative z-10">
          <div className="flex items-center justify-between gap-3 mb-6">
            <Link to="/admin" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground text-sm">
              <ArrowLeft className="w-4 h-4" />Voltar ao painel
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={atualizarTudo}
              disabled={carregando}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 mb-5">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground">Exclusivo equipe de marketing</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-black text-primary-foreground mb-3 leading-tight">
            Módulo MKT — Expectativa dos paranaenses
          </h1>
          <p className="text-primary-foreground/85 text-base md:text-lg max-w-2xl mb-6">
            Microanálise e insights a partir das sugestões populares — ao vivo, direto da base de participação da campanha.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            {[
              { label: 'Sugestões', value: totals?.total_sugestoes, icon: Layers },
              { label: 'Municípios', value: totals?.total_municipios, icon: MapPin },
              { label: 'Regiões', value: totals?.total_regioes, icon: TrendingUp },
              { label: 'Feminino', value: generoGeral.femPct, suffix: '%', icon: Users },
            ].map(item => (
              <div key={item.label} className="rounded-xl bg-primary-foreground/10 backdrop-blur-md border border-primary-foreground/20 p-3">
                <div className="flex items-center gap-1.5 text-primary-foreground/70 text-[11px] uppercase tracking-wide">
                  <item.icon className="w-3.5 h-3.5" />{item.label}
                </div>
                <p className="font-display text-2xl font-bold text-primary-foreground mt-0.5">
                  {Number(item.value ?? 0).toLocaleString('pt-BR')}{item.suffix || ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <Tabs defaultValue="geral" className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="temas">Temas</TabsTrigger>
            <TabsTrigger value="genero">Gênero</TabsTrigger>
            <TabsTrigger value="regioes">Regiões</TabsTrigger>
            <TabsTrigger value="mapa">Mapa</TabsTrigger>
            <TabsTrigger value="estrategia">Estratégia</TabsTrigger>
          </TabsList>

          {/* ================= VISÃO GERAL ================= */}
          <TabsContent value="geral" className="space-y-6">
            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <h2 className="font-display text-lg font-bold text-primary mb-1">Ranking de temas</h2>
                <p className="text-sm text-muted-foreground mb-5">Participação de cada eixo no total de sugestões do estado.</p>
                <div className="space-y-3">
                  {(porEixo.data ?? []).map((e: any) => {
                    const pct = (Number(e.total) / totalGeral) * 100;
                    return (
                      <div key={e.eixo}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{e.eixo}</span>
                          <span className="text-muted-foreground">{Number(e.total).toLocaleString('pt-BR')} · {pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft bg-muted/40 border-none">
              <CardContent className="pt-6 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Nota:</span> o eixo "Geral" liderando não é fraqueza de dado — é sinal de que boa parte do eleitor chega com uma expectativa ampla, não pré-filtrada por categoria de governo. Esse público responde melhor a conteúdo que narra resultado concreto na vida da pessoa.
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= TEMAS ================= */}
          <TabsContent value="temas" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clique num eixo para ver a nuvem de palavras (calculada ao vivo, a partir do texto real das sugestões) e os argumentos de campanha associados.
            </p>
            {EIXOS_ORDEM.map(eixo => {
              const aberto = eixoAberto === eixo;
              const nuvem = nuvemPorEixo[eixo] || [];
              const maxFreq = nuvem[0]?.freq || 1;
              const total = (lista.data ?? []).filter(r => r.eixo === eixo).length;
              return (
                <Card key={eixo} className="shadow-soft overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
                    onClick={() => setEixoAberto(aberto ? null : eixo)}
                  >
                    <span className="font-display font-bold text-primary">{eixo}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{total.toLocaleString('pt-BR')} sugestões</Badge>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${aberto ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {aberto && (
                    <CardContent className="pt-0 pb-5 space-y-4 border-t border-border">
                      <div className="flex flex-wrap gap-x-3 gap-y-2 items-baseline pt-4">
                        {nuvem.length === 0 && <p className="text-sm text-muted-foreground italic">Sem dados suficientes ainda.</p>}
                        {nuvem.map(w => (
                          <span
                            key={w.palavra}
                            className="font-display font-bold text-primary leading-tight"
                            style={{ fontSize: `${12 + (w.freq / maxFreq) * 20}px` }}
                            title={`${w.freq} menções`}
                          >
                            {w.palavra}
                          </span>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Argumentos de campanha</p>
                        <ul className="space-y-1.5">
                          {(ARGUMENTOS_POR_EIXO[eixo] || []).map((a, i) => (
                            <li key={i} className="flex gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </TabsContent>

          {/* ================= GÊNERO ================= */}
          <TabsContent value="genero" className="space-y-4">
            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <h2 className="font-display text-lg font-bold text-primary mb-4">Distribuição geral</h2>
                <div className="flex h-8 rounded-full overflow-hidden">
                  <div className="bg-secondary flex items-center pl-3 text-secondary-foreground text-xs font-bold" style={{ width: `${generoGeral.femPct}%` }}>
                    {generoGeral.femPct}% feminino
                  </div>
                  <div className="bg-primary flex items-center justify-end pr-3 text-primary-foreground text-xs font-bold" style={{ width: `${generoGeral.mascPct}%` }}>
                    {generoGeral.mascPct}% masculino
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <h2 className="font-display text-lg font-bold text-primary mb-1">O que conecta com quem</h2>
                <p className="text-sm text-muted-foreground mb-5">Distribuição por eixo (excluindo Geral) — dos temas que cada gênero escreveu, quanto foi pra cada eixo.</p>
                <div className="space-y-4">
                  {generoPorEixo.map(g => (
                    <div key={g.eixo}>
                      <p className="text-sm font-medium mb-1.5">{g.eixo}</p>
                      <div className="flex h-6 rounded overflow-hidden">
                        <div className="bg-secondary flex items-center pl-2 text-secondary-foreground text-[11px] font-bold" style={{ width: `${g.fPct}%` }}>{g.fPct}%</div>
                        <div className="bg-primary flex items-center justify-end pr-2 text-primary-foreground text-[11px] font-bold" style={{ width: `${g.mPct}%` }}>{g.mPct}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= REGIÕES ================= */}
          <TabsContent value="regioes" className="space-y-4">
            <p className="text-sm text-muted-foreground">Ordenado por volume. Clique numa região para o perfil completo.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regioesCombinadas.map(r => {
                const aberta = regiaoAberta === r.regiao;
                return (
                  <Card
                    key={r.regiao}
                    className={`shadow-soft cursor-pointer transition-shadow hover:shadow-medium border-l-4 ${aberta ? 'border-l-accent' : 'border-l-primary'}`}
                    onClick={() => setRegiaoAberta(aberta ? null : r.regiao)}
                  >
                    <CardContent className="pt-5">
                      <div className="flex justify-between items-start">
                        <h3 className="font-display font-bold text-primary">{r.regiao}</h3>
                        <span className="font-display text-xl font-black text-primary">{r.total.toLocaleString('pt-BR')}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {r.femPct}% feminino / {r.mascPct}% masculino
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[11px]">{r.temaDominante} · {r.temaDominantePct}%</Badge>
                        {r.dor && <Badge variant="outline" className="text-[11px]">Dor: {r.dor.categoria} ({r.dor.pct}%)</Badge>}
                      </div>
                      {aberta && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Leitura regional</p>
                            <p className="text-sm mt-0.5">{r.nota}</p>
                          </div>
                          {r.foco && (
                            <div>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">Foco de mídia</p>
                              <p className="text-sm mt-0.5">{r.foco}</p>
                            </div>
                          )}
                          {!r.curada && (
                            <p className="text-[11px] text-muted-foreground italic">
                              Narrativa gerada ao vivo a partir dos dados da região.
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* ================= ESTRATÉGIA ================= */}
          {/* ================= MAPA ================= */}
          <TabsContent value="mapa" className="space-y-4">
            <Card className="shadow-soft">
              <CardContent className="pt-6 space-y-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-primary mb-1">Mapa da escuta</h2>
                  <p className="text-sm text-muted-foreground">
                    Cada ponto é um município — o tamanho reflete o volume de sugestões filtradas. Clique num ponto para focar a cidade na lista.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <Select value={fEixo} onValueChange={setFEixo}>
                    <SelectTrigger><SelectValue placeholder="Eixo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os eixos</SelectItem>
                      {eixosDisponiveis.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={fRegiao} onValueChange={setFRegiao}>
                    <SelectTrigger><SelectValue placeholder="Região" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as regiões</SelectItem>
                      {regioesDisponiveis.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={fMunicipio} onValueChange={setFMunicipio}>
                    <SelectTrigger><SelectValue placeholder="Cidade" /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">Todas as cidades</SelectItem>
                      {municipiosDisponiveis.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={fGenero} onValueChange={setFGenero}>
                    <SelectTrigger><SelectValue placeholder="Gênero" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os gêneros</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative col-span-2 md:col-span-1">
                    <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input className="pl-8" placeholder="Buscar no texto" value={busca} onChange={e => setBusca(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                  <Badge variant="outline">{listaFiltrada.length.toLocaleString('pt-BR')} sugestões</Badge>
                  <Badge variant="outline">{marcadores.length.toLocaleString('pt-BR')} cidades no mapa</Badge>
                  {(fEixo !== 'all' || fRegiao !== 'all' || fMunicipio !== 'all' || fGenero !== 'all' || busca) && (
                    <Button variant="ghost" size="sm" onClick={() => { setFEixo('all'); setFRegiao('all'); setFMunicipio('all'); setFGenero('all'); setBusca(''); }}>
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <ParanaMap
              markers={marcadores}
              title="Geolocalização das sugestões populares"
              onMarkerClick={(id) => setFMunicipio(id)}
            />

            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <h3 className="font-display font-bold text-primary mb-3">Sugestões</h3>
                {listaFiltrada.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Nenhuma sugestão para os filtros selecionados.</p>
                )}
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                  {listaFiltrada.slice(0, 300).map(s => {
                    const aberta = sugestaoAberta === s.id;
                    return (
                      <div key={s.id} className="rounded-lg border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSugestaoAberta(aberta ? null : s.id)}
                          className="w-full text-left p-3 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{s.nome}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{s.municipio} · {s.mesorregiao}
                            </p>
                            {!aberta && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.descricao}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-[10px] max-w-[160px] truncate">{s.eixo}</Badge>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${aberta ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                        {aberta && (
                          <div className="px-3 pb-3 pt-0 border-t border-border space-y-2">
                            <p className="text-sm whitespace-pre-wrap pt-3">{s.descricao}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(s.created_at).toLocaleString('pt-BR')} · {s.genero}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {listaFiltrada.length > 300 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Mostrando as 300 mais recentes de {listaFiltrada.length.toLocaleString('pt-BR')} — refine os filtros para ver o restante.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================= ESTRATÉGIA ================= */}
          <TabsContent value="estrategia" className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-bold text-primary mb-1">Personas</h2>
              <p className="text-sm text-muted-foreground mb-4">Campo emocional e racional de ativação, insights do dado e ganchos de roteiro.</p>
              <div className="space-y-4">
                {PERSONAS.map(p => (
                  <Card key={p.nome} className="shadow-soft border-t-4 border-t-accent">
                    <CardContent className="pt-5 space-y-4">
                      <div>
                        <h3 className="font-display font-bold text-lg text-primary">{p.nome}</h3>
                        <p className="text-xs font-medium text-secondary mb-2">Força em: {p.regioes}</p>
                        <p className="text-sm text-muted-foreground border-b border-border pb-3">{p.desc}</p>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide font-bold text-primary mb-1">Campo emocional</p>
                          <p className="text-sm">{p.emocional}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide font-bold text-secondary mb-1">Campo racional</p>
                          <p className="text-sm">{p.racional}</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-[11px] uppercase tracking-wide font-bold text-primary mb-2">Insights do dado</p>
                        <ul className="space-y-1.5">
                          {p.insights.map((x, i) => (
                            <li key={i} className="flex gap-2 text-sm"><span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />{x}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide font-bold text-accent-foreground mb-2">Ganchos de roteiro</p>
                        <ol className="space-y-1.5 list-decimal list-inside">
                          {p.ganchos.map((x, i) => <li key={i} className="text-sm">{x}</li>)}
                        </ol>
                      </div>
                      <div className="text-xs text-muted-foreground border border-dashed border-border rounded-lg p-2.5">
                        <span className="font-medium text-foreground">Cuidados:</span> {p.cuidados}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-primary mb-1">Cases de sucesso</h2>
              <p className="text-sm text-muted-foreground mb-4">Dor → estratégia → resultado → lição aplicada ao Paraná.</p>
              <div className="space-y-4">
                {CASES.map((c, i) => (
                  <Card key={i} className="shadow-soft border-l-4 border-l-secondary">
                    <CardContent className="pt-5 space-y-3">
                      <Badge variant="outline" className="text-[11px]">{c.eixo}</Badge>
                      <h3 className="font-display font-bold text-primary">{c.titulo}</h3>
                      <p className="text-xs text-muted-foreground font-medium">{c.local}</p>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div><p className="text-[10px] uppercase tracking-wide font-bold text-foreground mb-1">A dor</p><p className="text-sm">{c.dor}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wide font-bold text-secondary mb-1">A estratégia</p><p className="text-sm">{c.estrategia}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wide font-bold text-primary mb-1">O resultado</p><p className="text-sm">{c.resultado}</p></div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5 text-sm">
                        <span className="font-medium text-foreground">Lição para o Paraná:</span> {c.licao}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-bold text-primary mb-1">Agente de marketing</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Pergunte diretamente — o agente só enxerga sugestões populares e sempre traz a nota técnica de neuromarketing usada em cada peça.
              </p>
              <MarketingIAChat
                authorized={authorized}
                regioesDisponiveis={(porRegiao.data ?? []).map((r: any) => r.mesorregiao)}
                municipiosDisponiveis={Array.from(new Set((lista.data ?? []).map(r => r.municipio))).sort()}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
