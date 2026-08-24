import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import {
  History, Loader2, TrendingUp, TrendingDown, Users, Search, ChevronDown, ChevronUp,
  Layers, Plus, X,
} from 'lucide-react';
import {
  useCandidatosHistoricos,
  useMunicipiosHistoricos,
  useCombinacoesDisponiveis,
  useMunicipiosMT,
  useLocaisVotacao,
  type MunicipioBase,
} from '@/hooks/useHistoricoEleitoral';
import { useSurveys } from '@/hooks/useSurveys';
import { REGIAO_PESQUISA_TO_MESO } from '@/lib/regioesPesquisaMT';
import { ComparativoPesquisa } from '@/components/historico/ComparativoPesquisa';

// ── constantes ────────────────────────────────────────────────────────────────
const IGNORAR = new Set(['NULO', 'BRANCO', 'Nulo', 'Branco', '#NULO#', 'VOTO NULO', 'VOTO BRANCO']);
const CARGOS_COM_BUSCA = new Set([6, 7]); // Deputado Federal / Estadual

// Centro geográfico de Mato Grosso (IBGE)
const MT_CENTER: [number, number] = [-12.68, -56.09];
const MT_ZOOM = 6;

const ANOS_PADRAO = [2018, 2022];
const CARGOS_PADRAO = [
  { cd: 1, label: 'Presidente' },
  { cd: 3, label: 'Governador' },
  { cd: 5, label: 'Senador' },
  { cd: 6, label: 'Deputado Federal' },
  { cd: 7, label: 'Deputado Estadual' },
];

// Cores das camadas cruzadas (a 1ª é sempre a camada base)
const CORES_CAMADAS = ['#1d4ed8', '#dc2626', '#059669', '#d97706', '#7c3aed'];

// ── GeoJSON de MT (IBGE) ──────────────────────────────────────────────────────
function useMtGeoJson() {
  return useQuery({
    queryKey: ['ibge-malha-mt-municipios'],
    queryFn: async () => {
      const r = await fetch(
        'https://servicodados.ibge.gov.br/api/v3/malhas/estados/51?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio',
      );
      return r.json();
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

// ── utilitários visuais ───────────────────────────────────────────────────────
function colorForPct(pct: number | null): string {
  if (pct === null || isNaN(pct)) return 'hsl(220 12% 88%)';
  const stops: [number, string][] = [
    [1,   '#f5f8fc'],
    [5,   '#e0eaf7'],
    [10,  '#cfe0f5'],
    [20,  '#9dc2ec'],
    [30,  '#6aa3e0'],
    [40,  '#3f7fcd'],
    [50,  '#245da8'],
    [101, '#123a70'],
  ];
  for (const [limit, color] of stops) if (pct < limit) return color;
  return '#123a70';
}

// raio proporcional ao % (mín 5 px, máx 24 px)
function radiusForPct(pct: number): number {
  return Math.max(5, Math.min(24, 5 + (pct / 50) * 19));
}

const LEGEND = [
  { label: '0 – 1%',   color: '#f5f8fc' },
  { label: '1 – 5%',   color: '#e0eaf7' },
  { label: '5 – 10%',  color: '#cfe0f5' },
  { label: '10 – 20%', color: '#9dc2ec' },
  { label: '20 – 30%', color: '#6aa3e0' },
  { label: '30 – 40%', color: '#3f7fcd' },
  { label: '40 – 50%', color: '#245da8' },
  { label: '50%+',     color: '#123a70' },
];

const fmt = (n: number) => n.toLocaleString('pt-BR');

// ── tipos de camada ───────────────────────────────────────────────────────────
interface CamadaEleicaoCfg {
  id: string;
  tipo: 'eleicao';
  ano: number;
  turno: number;
  cargo: number;
  candidato: string;
}
interface CamadaPesquisaCfg {
  id: string;
  tipo: 'pesquisa';
  questionId: string;
  candidato: string;
}
type CamadaCfg = CamadaEleicaoCfg | CamadaPesquisaCfg;

interface PontoCamada {
  key: string;
  nome: string;
  pct: number;
  votos?: number;
  lat: number;
  lng: number;
}

// ── reposiciona o mapa ao mudar o recorte ─────────────────────────────────────
function MapReset({ trigger }: { trigger: string }) {
  const map = useMap();
  const prev = useRef('');
  useEffect(() => {
    if (trigger !== prev.current) {
      map.setView(MT_CENTER, MT_ZOOM);
      prev.current = trigger;
    }
  }, [trigger, map]);
  return null;
}

// ── camada renderizada no mapa ────────────────────────────────────────────────
function CamadaMarkers({
  pontos, cor, rotulo, opacidade,
}: { pontos: PontoCamada[]; cor: string; rotulo: string; opacidade: number }) {
  return (
    <>
      {pontos.map(p => (
        <CircleMarker
          key={`${rotulo}-${p.key}`}
          center={[p.lat, p.lng]}
          radius={radiusForPct(p.pct)}
          pathOptions={{
            fillColor: cor,
            fillOpacity: opacidade,
            color: cor,
            weight: 1.5,
            opacity: 0.9,
          }}
        >
          <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
            <div style={{ fontSize: 11, lineHeight: 1.4 }}>
              <strong>{p.nome}</strong><br />
              <span style={{ color: cor, fontWeight: 600 }}>{rotulo}</span><br />
              {p.votos != null ? `${fmt(p.votos)} votos — ` : ''}{p.pct.toFixed(2)}%
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

/** Camada de eleição: busca os votos por município no banco. */
function CamadaEleicao({
  cfg, cor, rotulo, opacidade,
}: { cfg: CamadaEleicaoCfg; cor: string; rotulo: string; opacidade: number }) {
  const { data } = useMunicipiosHistoricos(cfg.ano, cfg.turno, cfg.cargo, cfg.candidato);
  const pontos = useMemo<PontoCamada[]>(
    () => (data ?? [])
      .filter(m => m.lat != null && m.lng != null)
      .map(m => ({ key: m.codigoIbge, nome: m.nome, pct: m.pct, votos: m.votos, lat: m.lat!, lng: m.lng! })),
    [data],
  );
  return <CamadaMarkers pontos={pontos} cor={cor} rotulo={rotulo} opacidade={opacidade} />;
}

/** Percentuais por município derivados do cruzamento regional de uma pesquisa. */
function pontosDePesquisa(
  porRegiaoPesquisa: Record<string, number>,
  municipios: MunicipioBase[],
): PontoCamada[] {
  // média das regiões de pesquisa que caem em cada mesorregião IBGE
  const acc = new Map<string, { soma: number; n: number }>();
  Object.entries(porRegiaoPesquisa).forEach(([regiao, pct]) => {
    (REGIAO_PESQUISA_TO_MESO[regiao] ?? []).forEach(meso => {
      const cur = acc.get(meso) ?? { soma: 0, n: 0 };
      acc.set(meso, { soma: cur.soma + pct, n: cur.n + 1 });
    });
  });
  const porMeso = new Map<string, number>();
  acc.forEach((v, k) => porMeso.set(k, v.soma / v.n));

  return municipios
    .filter(m => m.lat != null && m.lng != null && m.regiao && porMeso.has(m.regiao))
    .map(m => ({
      key: m.codigoIbge,
      nome: m.nome,
      pct: porMeso.get(m.regiao!)!,
      lat: m.lat!,
      lng: m.lng!,
    }));
}

// ── componente principal ──────────────────────────────────────────────────────
export default function HistoricoEleitoral() {
  const { data: combos } = useCombinacoesDisponiveis();
  const [ano, setAno]           = useState(2022);
  const [turno, setTurno]       = useState(1);
  const [cargo, setCargo]       = useState(3);
  const [candidato, setCandidato] = useState<string>('TODOS');
  const [busca, setBusca]       = useState('');
  const [ordenacao, setOrdenacao] = useState<'pct' | 'votos'>('pct');
  const [buscaCidade, setBuscaCidade] = useState('');
  const [expandirCidades, setExpandirCidades] = useState(false);
  const [mostrarPins, setMostrarPins] = useState(true);
  const [mostrarChoropleth, setMostrarChoropleth] = useState(true);
  const [mostrarNomes, setMostrarNomes] = useState(false);
  const [mostrarLocais, setMostrarLocais] = useState(false);
  const [camadas, setCamadas] = useState<CamadaCfg[]>([]);
  const [painelCamadas, setPainelCamadas] = useState(false);
  const [painelComparativo, setPainelComparativo] = useState(false);

  const { data: candidatosRaw, isLoading: loadingCand } = useCandidatosHistoricos(ano, turno, cargo);
  const { data: geo } = useMtGeoJson();
  const { data: municipiosBase } = useMunicipiosMT();
  const { data: pesquisas } = useSurveys();

  // ── combos dinâmicos ────────────────────────────────────────────────────────
  const anos = useMemo(() => {
    const lista = Array.from(new Set((combos ?? []).map(c => c.ano))).sort();
    return lista.length ? lista : ANOS_PADRAO;
  }, [combos]);

  const cargos = useMemo(() => {
    const map = new Map<number, string>();
    (combos ?? []).filter(c => c.ano === ano).forEach(c => map.set(c.cargo, c.label));
    const lista = Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([cd, label]) => ({ cd, label }));
    return lista.length ? lista : CARGOS_PADRAO;
  }, [combos, ano]);

  const turnos = useMemo(() => {
    const lista = Array.from(
      new Set((combos ?? []).filter(c => c.ano === ano && c.cargo === cargo).map(c => c.turno)),
    ).sort();
    return lista.length ? lista : [1];
  }, [combos, ano, cargo]);

  useEffect(() => { if (turnos.length && !turnos.includes(turno)) setTurno(turnos[0]); }, [turnos, turno]);
  useEffect(() => { if (anos.length && !anos.includes(ano)) setAno(anos[anos.length - 1]); }, [anos, ano]);
  useEffect(() => { if (cargos.length && !cargos.some(c => c.cd === cargo)) setCargo(cargos[0].cd); }, [cargos, cargo]);

  // ── candidatos filtrados ────────────────────────────────────────────────────
  const candidatos = useMemo(
    () => (candidatosRaw ?? []).filter(c => !IGNORAR.has(c.nome.toUpperCase())),
    [candidatosRaw],
  );
  const mostrarBusca = CARGOS_COM_BUSCA.has(cargo);
  const candidatosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? candidatos.filter(c => c.nome.toLowerCase().includes(q) || c.partido.toLowerCase().includes(q)) : candidatos;
  }, [candidatos, busca]);

  const selecionado       = candidato || 'TODOS';
  const todosSelecionado  = selecionado === 'TODOS';
  const infoSelecionado   = candidatos.find(c => c.nome === selecionado);

  const { data: municipios, isLoading: loadingMun } = useMunicipiosHistoricos(ano, turno, cargo, selecionado);

  // Camada por local de votação (disponível apenas nos recortes com dados por seção)
  const { data: locais, isLoading: loadingLocais } = useLocaisVotacao(
    ano, turno, cargo, selecionado, mostrarLocais,
  );
  const maxVotosLocal = useMemo(
    () => (locais ?? []).reduce((m, l) => Math.max(m, l.votos), 0),
    [locais],
  );

  // ── mapas auxiliares ────────────────────────────────────────────────────────
  const porMunicipio = useMemo(() => {
    const map = new Map<string, { votos: number; pct: number; nome: string }>();
    (municipios ?? []).forEach(m => map.set(m.codigoIbge, { votos: m.votos, pct: m.pct, nome: m.nome }));
    return map;
  }, [municipios]);

  const pontosBase = useMemo<PontoCamada[]>(
    () => (municipios ?? [])
      .filter(m => m.lat != null && m.lng != null)
      .map(m => ({ key: m.codigoIbge, nome: m.nome, pct: m.pct, votos: m.votos, lat: m.lat!, lng: m.lng! })),
    [municipios],
  );

  const ranking = useMemo(
    () => [...(municipios ?? [])].sort((a, b) => ordenacao === 'votos' ? b.votos - a.votos : b.pct - a.pct),
    [municipios, ordenacao],
  );
  const rankingFiltrado = useMemo(() => {
    const q = buscaCidade.trim().toLowerCase();
    return q ? ranking.filter(m => m.nome.toLowerCase().includes(q)) : ranking;
  }, [ranking, buscaCidade]);

  const totalVotos  = todosSelecionado ? candidatos.reduce((s, c) => s + c.votos, 0) : (infoSelecionado?.votos ?? 0);
  const pctEstadual = todosSelecionado ? 100 : (infoSelecionado?.pct ?? 0);

  const trocarRecorte = (fn: () => void) => { fn(); setCandidato('TODOS'); setBusca(''); };

  const recorteKey = `${ano}-${turno}-${cargo}`;
  const cruzando = camadas.length > 0;

  // ── perguntas de pesquisa com cruzamento regional ───────────────────────────
  const perguntasRegionais = useMemo(() => {
    return (pesquisas?.questions ?? [])
      .map(q => {
        const ct = q.crossTabs?.find(c => c.filterType === 'regiao');
        if (!ct) return null;
        return { id: q.id, label: `${q.cargo} · ${q.scenarioLabel}`, candidatos: ct.candidates, crossTab: ct };
      })
      .filter(Boolean) as { id: string; label: string; candidatos: string[]; crossTab: any }[];
  }, [pesquisas]);

  const rotuloCamada = (c: CamadaCfg): string => {
    if (c.tipo === 'eleicao') {
      const cargoLabel = (cargos.find(x => x.cd === c.cargo)?.label)
        ?? CARGOS_PADRAO.find(x => x.cd === c.cargo)?.label ?? `Cargo ${c.cargo}`;
      return `${c.ano} · ${cargoLabel} · ${c.turno}º T · ${c.candidato === 'TODOS' ? 'Todos' : c.candidato}`;
    }
    const p = perguntasRegionais.find(x => x.id === c.questionId);
    return `Pesquisa · ${p?.label ?? '—'} · ${c.candidato}`;
  };

  const rotuloBase = `${ano} · ${cargos.find(c => c.cd === cargo)?.label ?? cargo} · ${turno}º T · ${todosSelecionado ? 'Todos' : selecionado}`;

  const addCamadaEleicao = () => {
    setCamadas(cs => cs.length >= 4 ? cs : [...cs, {
      id: crypto.randomUUID(), tipo: 'eleicao',
      ano: anos[0] ?? 2018, turno: 1, cargo, candidato: 'TODOS',
    }]);
    setPainelCamadas(true);
  };
  const addCamadaPesquisa = () => {
    const p = perguntasRegionais[0];
    if (!p) return;
    setCamadas(cs => cs.length >= 4 ? cs : [...cs, {
      id: crypto.randomUUID(), tipo: 'pesquisa', questionId: p.id, candidato: p.candidatos[0],
    }]);
    setPainelCamadas(true);
  };
  const updateCamada = (id: string, patch: Record<string, unknown>) =>
    setCamadas(cs => cs.map(c => c.id === id ? { ...c, ...patch } as CamadaCfg : c));
  const removeCamada = (id: string) => setCamadas(cs => cs.filter(c => c.id !== id));

  // pontos das camadas de pesquisa (calculados no cliente)
  const pontosPesquisaPorCamada = useMemo(() => {
    const out = new Map<string, PontoCamada[]>();
    camadas.forEach(c => {
      if (c.tipo !== 'pesquisa' || !municipiosBase) return;
      const p = perguntasRegionais.find(x => x.id === c.questionId);
      if (!p) return;
      const porRegiao: Record<string, number> = {};
      p.crossTab.rows.forEach((r: any) => {
        const v = r.values?.[c.candidato];
        if (typeof v === 'number') porRegiao[r.label] = v;
      });
      out.set(c.id, pontosDePesquisa(porRegiao, municipiosBase));
    });
    return out;
  }, [camadas, perguntasRegionais, municipiosBase]);

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Cabeçalho */}
      <header className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Histórico Eleitoral</h1>
          <p className="text-xs text-muted-foreground">
            Presidente, Governador, Senador e Deputados em Mato Grosso — resultados oficiais do TSE por município
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end bg-card border border-border rounded-xl p-3">
        {/* Ano */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ano</label>
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={ano}
            onChange={e => trocarRecorte(() => setAno(Number(e.target.value)))}
          >
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Cargo */}
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cargo</label>
          <select
            className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={cargo}
            onChange={e => trocarRecorte(() => setCargo(Number(e.target.value)))}
          >
            {cargos.map(c => <option key={c.cd} value={c.cd}>{c.label}</option>)}
          </select>
        </div>

        {/* Turno */}
        {turnos.length > 1 && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Turno</label>
            <select
              className="bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
              value={turno}
              onChange={e => trocarRecorte(() => setTurno(Number(e.target.value)))}
            >
              {turnos.map(t => <option key={t} value={t}>{t}º turno</option>)}
            </select>
          </div>
        )}

        {/* Busca de candidato (só dep.) */}
        {mostrarBusca && (
          <div className="min-w-[200px]">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Buscar candidato</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground"
                placeholder="Sobrenome ou partido"
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Select de candidato */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Candidato {candidatos.length > 0 && <span className="normal-case">({candidatos.length} neste recorte)</span>}
          </label>
          <select
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
            value={selecionado}
            onChange={e => setCandidato(e.target.value)}
          >
            <option value="TODOS">Todos os candidatos</option>
            {candidatosFiltrados.map(c => (
              <option key={c.nome} value={c.nome}>
                {c.nome} ({c.partido}) — {c.pct.toFixed(2)}% · {fmt(c.votos)} votos
              </option>
            ))}
          </select>
        </div>

        {/* Toggles de camadas */}
        <div className="flex gap-3 items-center">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={mostrarChoropleth} onChange={e => setMostrarChoropleth(e.target.checked)} className="rounded" />
            Mapa de calor
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={mostrarPins} onChange={e => setMostrarPins(e.target.checked)} className="rounded" />
            Pins por município
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={mostrarNomes} onChange={e => setMostrarNomes(e.target.checked)} className="rounded" />
            Nomes das cidades
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={mostrarLocais} onChange={e => setMostrarLocais(e.target.checked)} className="rounded" />
            Locais de votação
            {mostrarLocais && loadingLocais && <Loader2 className="w-3 h-3 animate-spin" />}
            {mostrarLocais && !loadingLocais && (
              <span className="text-[10px] text-muted-foreground">({(locais ?? []).length})</span>
            )}
          </label>
          <button
            onClick={() => setPainelCamadas(v => !v)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            Cruzar eleições {cruzando && <span className="text-primary font-semibold">({camadas.length})</span>}
          </button>
          <button
            onClick={() => setPainelComparativo(v => !v)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Comparar com pesquisa 2026
          </button>
        </div>
      </div>

      {/* Painel de camadas cruzadas */}
      {painelCamadas && (
        <div className="bg-card border border-border rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Camadas cruzadas
            </p>
            <div className="flex gap-2">
              <button
                onClick={addCamadaEleicao}
                disabled={camadas.length >= 4}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted disabled:opacity-40 text-foreground"
              >
                <Plus className="w-3 h-3" /> Eleição
              </button>
              <button
                onClick={addCamadaPesquisa}
                disabled={camadas.length >= 4 || perguntasRegionais.length === 0}
                className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted disabled:opacity-40 text-foreground"
              >
                <Plus className="w-3 h-3" /> Pesquisa
              </button>
            </div>
          </div>

          {/* camada base */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CORES_CAMADAS[0], opacity: 0.7 }} />
            <span className="text-foreground font-medium">Camada base:</span>
            <span className="text-muted-foreground">{rotuloBase}</span>
          </div>

          {camadas.map((c, idx) => {
            const cor = CORES_CAMADAS[(idx + 1) % CORES_CAMADAS.length];
            return (
              <div key={c.id} className="flex flex-wrap items-end gap-2 border-t border-border pt-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0 mb-2" style={{ background: cor, opacity: 0.7 }} />
                {c.tipo === 'eleicao' ? (
                  <>
                    <CamadaSelects
                      cfg={c}
                      combos={combos ?? []}
                      onChange={patch => updateCamada(c.id, patch)}
                    />
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Pesquisa</label>
                      <select
                        className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground max-w-[320px]"
                        value={c.questionId}
                        onChange={e => {
                          const p = perguntasRegionais.find(x => x.id === e.target.value);
                          updateCamada(c.id, { questionId: e.target.value, candidato: p?.candidatos[0] ?? '' });
                        }}
                      >
                        {perguntasRegionais.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Candidato</label>
                      <select
                        className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
                        value={c.candidato}
                        onChange={e => updateCamada(c.id, { candidato: e.target.value })}
                      >
                        {(perguntasRegionais.find(x => x.id === c.questionId)?.candidatos ?? []).map(n => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
                <button
                  onClick={() => removeCamada(c.id)}
                  className="mb-1 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"
                  aria-label="Remover camada"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {camadas.some(c => c.tipo === 'pesquisa') && (
            <p className="text-[10px] text-muted-foreground italic leading-snug">
              Pesquisas têm recorte regional — o percentual da região é aplicado a todos os municípios da
              mesorregião correspondente (aproximação para leitura comparativa).
            </p>
          )}
        </div>
      )}

      {loadingCand ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando resultados...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Coluna do mapa */}
          <div className="lg:col-span-2 space-y-3">
            {/* KPIs */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Votos no estado</p>
                <p className="text-lg font-bold text-foreground">{fmt(totalVotos)}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">% estadual</p>
                <p className="text-lg font-bold text-foreground">{pctEstadual.toFixed(2)}%</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Municípios</p>
                <p className="text-lg font-bold text-foreground">{porMunicipio.size}</p>
              </div>
            </div>

            {/* Mapa */}
            <div className="relative h-[540px] rounded-xl overflow-hidden border border-border">
              {loadingMun && (
                <div className="absolute inset-0 z-[500] bg-background/60 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Calculando mapa...
                </div>
              )}

              <MapContainer
                center={MT_CENTER}
                zoom={MT_ZOOM}
                style={{ height: '100%', width: '100%' }}
              >
                <MapReset trigger={recorteKey} />

                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com">CARTO</a>'
                  opacity={0.4}
                />

                {/* Contornos azuis dos municípios (+ preenchimento quando o mapa de calor está ligado) */}
                {geo && (
                  <GeoJSON
                    key={`geo-${recorteKey}-${selecionado}-${porMunicipio.size}-${mostrarChoropleth}-${cruzando}`}
                    data={geo}
                    style={(f: any) => {
                      const info = porMunicipio.get(String(f?.properties?.codarea ?? ''));
                      const pintar = mostrarChoropleth && !cruzando;
                      return {
                        fillColor:   colorForPct(info ? info.pct : null),
                        fillOpacity: pintar ? 0.7 : (mostrarChoropleth ? 0.25 : 0),
                        color:       '#1d4ed8',
                        weight:      0.9,
                        opacity:     0.85,
                      };
                    }}
                    onEachFeature={(feature: any, layer: any) => {
                      const code = String(feature?.properties?.codarea ?? '');
                      const info = porMunicipio.get(code);
                      layer.bindTooltip(
                        `<div style="font-size:11px;line-height:1.4">
                          <strong>${info?.nome ?? code}</strong><br/>
                          ${info
                            ? `${fmt(info.votos)} votos — ${info.pct.toFixed(2)}%`
                            : 'Sem dados'}
                        </div>`,
                        { sticky: true },
                      );
                    }}
                  />
                )}

                {/* Nomes das cidades */}
                {mostrarNomes && (municipiosBase ?? [])
                  .filter(m => m.lat != null && m.lng != null)
                  .map(m => (
                    <CircleMarker
                      key={`label-${m.codigoIbge}`}
                      center={[m.lat!, m.lng!]}
                      radius={0.1}
                      pathOptions={{ opacity: 0, fillOpacity: 0, interactive: false }}
                    >
                      <Tooltip permanent direction="center" className="hist-city-label" opacity={1}>
                        {m.nome}
                      </Tooltip>
                    </CircleMarker>
                  ))}

                {/* Camada base */}
                {mostrarPins && (
                  <CamadaMarkers
                    pontos={pontosBase}
                    cor={CORES_CAMADAS[0]}
                    rotulo={rotuloBase}
                    opacidade={cruzando ? 0.4 : 0.75}
                  />
                )}

                {/* Locais de votação (dados por seção) */}
                {mostrarLocais && (locais ?? []).map(l => {
                  const r = maxVotosLocal > 0 ? 3 + Math.sqrt(l.votos / maxVotosLocal) * 11 : 4;
                  return (
                    <CircleMarker
                      key={`local-${l.key}`}
                      center={[l.lat, l.lng]}
                      radius={r}
                      pathOptions={{ color: '#b91c1c', weight: 1, fillColor: '#ef4444', fillOpacity: 0.5 }}
                    >
                      <Tooltip sticky>
                        <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                          <strong>{l.nome}</strong><br />
                          {l.municipio}{l.endereco ? ` — ${l.endereco}` : ''}<br />
                          {fmt(l.votos)} votos ({l.pct.toFixed(1)}% do local)<br />
                          Total no local: {fmt(l.totalLocal)}
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}


                {/* Camadas cruzadas */}
                {camadas.map((c, idx) => {
                  const cor = CORES_CAMADAS[(idx + 1) % CORES_CAMADAS.length];
                  if (c.tipo === 'eleicao') {
                    return (
                      <CamadaEleicao
                        key={c.id}
                        cfg={c}
                        cor={cor}
                        rotulo={rotuloCamada(c)}
                        opacidade={0.4}
                      />
                    );
                  }
                  return (
                    <CamadaMarkers
                      key={c.id}
                      pontos={pontosPesquisaPorCamada.get(c.id) ?? []}
                      cor={cor}
                      rotulo={rotuloCamada(c)}
                      opacidade={0.4}
                    />
                  );
                })}
              </MapContainer>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-3 bg-card border border-border rounded-xl p-3">
              {cruzando ? (
                <>
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground">
                    <span className="w-3 h-3 rounded-full" style={{ background: CORES_CAMADAS[0], opacity: 0.6 }} />
                    {rotuloBase}
                  </div>
                  {camadas.map((c, idx) => (
                    <div key={c.id} className="flex items-center gap-1.5 text-[11px] text-foreground">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: CORES_CAMADAS[(idx + 1) % CORES_CAMADAS.length], opacity: 0.6 }}
                      />
                      {rotuloCamada(c)}
                    </div>
                  ))}
                  <span className="text-[11px] text-muted-foreground italic ml-2">
                    • Círculos translúcidos e proporcionais ao % — sobreposição mostra o cruzamento
                  </span>
                </>
              ) : (
                <>
                  {LEGEND.map(l => (
                    <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="w-3 h-3 rounded-full border border-border" style={{ background: l.color }} />
                      {l.label}
                    </div>
                  ))}
                  {mostrarPins && (
                    <span className="text-[11px] text-muted-foreground ml-2 italic">
                      • Tamanho do pin proporcional ao %
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Coluna lateral */}
          <div className="space-y-4">
            {/* Ranking estadual */}
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Ranking estadual
              </p>
              <div className="space-y-1 max-h-64 overflow-auto pr-1">
                {candidatosFiltrados.slice(0, 200).map((c, i) => (
                  <button
                    key={c.nome}
                    onClick={() => setCandidato(c.nome)}
                    className={`w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-[12px] transition-colors ${
                      c.nome === selecionado
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className="truncate">{i + 1}. {c.nome} <span className="text-muted-foreground">({c.partido})</span></span>
                    <span className="flex-shrink-0 tabular-nums">{c.pct.toFixed(2)}% · {fmt(c.votos)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Top municípios */}
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Votos por município
                </p>
                <select
                  className="bg-background border border-border rounded-md px-2 py-1 text-[11px] text-foreground"
                  value={ordenacao}
                  onChange={e => setOrdenacao(e.target.value as 'pct' | 'votos')}
                >
                  <option value="pct">Ordenar por %</option>
                  <option value="votos">Ordenar por votos</option>
                </select>
              </div>

              {expandirCidades && (
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full bg-background border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-foreground"
                    placeholder="Buscar município"
                    value={buscaCidade}
                    onChange={e => setBuscaCidade(e.target.value)}
                  />
                </div>
              )}

              <div className={`space-y-1 ${expandirCidades ? 'max-h-[420px] overflow-auto pr-1' : ''}`}>
                {(expandirCidades ? rankingFiltrado : ranking.slice(0, 10)).map((m, i) => (
                  <div key={m.codigoIbge} className="flex items-center justify-between text-[12px] gap-2">
                    <span className="truncate text-foreground">
                      <span className="text-muted-foreground">{i + 1}.</span> {m.nome}
                    </span>
                    <span className="text-muted-foreground flex-shrink-0 tabular-nums">
                      {m.pct.toFixed(2)}% · {fmt(m.votos)}
                    </span>
                  </div>
                ))}
                {expandirCidades && rankingFiltrado.length === 0 && (
                  <p className="text-[11px] text-muted-foreground py-2">Nenhum município encontrado.</p>
                )}
              </div>

              <button
                onClick={() => setExpandirCidades(v => !v)}
                className="mt-2 w-full flex items-center justify-center gap-1 text-[11px] text-primary hover:underline"
              >
                {expandirCidades
                  ? <><span>Recolher lista</span> <ChevronUp className="w-3.5 h-3.5" /></>
                  : <><span>Ver todas as {ranking.length} cidades</span> <ChevronDown className="w-3.5 h-3.5" /></>
                }
              </button>
            </div>

            {/* Piores municípios */}
            <div className="bg-card border border-border rounded-xl p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" /> Piores municípios
              </p>
              <div className="space-y-1">
                {ranking.slice(-10).reverse().map(m => (
                  <div key={m.codigoIbge} className="flex items-center justify-between text-[12px]">
                    <span className="truncate text-foreground">{m.nome}</span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {m.pct.toFixed(2)}% · {fmt(m.votos)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Painel: histórico x pesquisa atual por região — gráficos + insights, abaixo do mapa */}
      {painelComparativo && (
        <ComparativoPesquisa
          ano={ano}
          turno={turno}
          cargo={cargo}
          cargoLabel={cargos.find(c => c.cd === cargo)?.label ?? String(cargo)}
        />
      )}
    </div>
  );
}

// ── selects de uma camada de eleição ──────────────────────────────────────────
function CamadaSelects({
  cfg, combos, onChange,
}: {
  cfg: CamadaEleicaoCfg;
  combos: { ano: number; turno: number; cargo: number; label: string }[];
  onChange: (patch: Partial<CamadaEleicaoCfg>) => void;
}) {
  const anos = useMemo(() => {
    const l = Array.from(new Set(combos.map(c => c.ano))).sort();
    return l.length ? l : ANOS_PADRAO;
  }, [combos]);

  const cargos = useMemo(() => {
    const map = new Map<number, string>();
    combos.filter(c => c.ano === cfg.ano).forEach(c => map.set(c.cargo, c.label));
    const l = Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([cd, label]) => ({ cd, label }));
    return l.length ? l : CARGOS_PADRAO;
  }, [combos, cfg.ano]);

  const turnos = useMemo(() => {
    const l = Array.from(new Set(combos.filter(c => c.ano === cfg.ano && c.cargo === cfg.cargo).map(c => c.turno))).sort();
    return l.length ? l : [1];
  }, [combos, cfg.ano, cfg.cargo]);

  useEffect(() => {
    if (!turnos.includes(cfg.turno)) onChange({ turno: turnos[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnos.join(','), cfg.turno]);

  const { data: cands } = useCandidatosHistoricos(cfg.ano, cfg.turno, cfg.cargo);
  const lista = (cands ?? []).filter(c => !IGNORAR.has(c.nome.toUpperCase()));

  return (
    <>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ano</label>
        <select
          className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
          value={cfg.ano}
          onChange={e => onChange({ ano: Number(e.target.value), candidato: 'TODOS' })}
        >
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Cargo</label>
        <select
          className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
          value={cfg.cargo}
          onChange={e => onChange({ cargo: Number(e.target.value), candidato: 'TODOS' })}
        >
          {cargos.map(c => <option key={c.cd} value={c.cd}>{c.label}</option>)}
        </select>
      </div>
      {turnos.length > 1 && (
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Turno</label>
          <select
            className="bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
            value={cfg.turno}
            onChange={e => onChange({ turno: Number(e.target.value), candidato: 'TODOS' })}
          >
            {turnos.map(t => <option key={t} value={t}>{t}º turno</option>)}
          </select>
        </div>
      )}
      <div className="min-w-[220px]">
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Candidato</label>
        <select
          className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs text-foreground"
          value={cfg.candidato}
          onChange={e => onChange({ candidato: e.target.value })}
        >
          <option value="TODOS">Todos os candidatos</option>
          {lista.map(c => (
            <option key={c.nome} value={c.nome}>
              {c.nome} ({c.partido}) — {c.pct.toFixed(2)}%
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
