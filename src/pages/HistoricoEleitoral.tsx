import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import 'leaflet/dist/leaflet.css';
import {
  History, Loader2, TrendingUp, TrendingDown, Users, Search, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  useCandidatosHistoricos,
  useMunicipiosHistoricos,
  useCombinacoesDisponiveis,
} from '@/hooks/useHistoricoEleitoral';

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

// raio do pin proporcional ao % (mín 6 px, máx 22 px)
function radiusForPct(pct: number): number {
  return Math.max(6, Math.min(22, 6 + (pct / 50) * 16));
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

// ── componente que reposiciona o mapa ao mudar os dados ───────────────────────
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

  const { data: candidatosRaw, isLoading: loadingCand } = useCandidatosHistoricos(ano, turno, cargo);
  const { data: geo } = useMtGeoJson();

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

  // ── mapas auxiliares ────────────────────────────────────────────────────────
  const porMunicipio = useMemo(() => {
    const map = new Map<string, { votos: number; pct: number; nome: string }>();
    (municipios ?? []).forEach(m => map.set(m.codigoIbge, { votos: m.votos, pct: m.pct, nome: m.nome }));
    return map;
  }, [municipios]);

  // municípios com coordenadas válidas para pins
  const municipiosComCoords = useMemo(
    () => (municipios ?? []).filter(m => m.lat != null && m.lng != null),
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

  // chave que identifica o recorte atual — usada para resetar o mapa
  const recorteKey = `${ano}-${turno}-${cargo}`;

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
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={mostrarChoropleth} onChange={e => setMostrarChoropleth(e.target.checked)} className="rounded" />
            Mapa de calor
          </label>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={mostrarPins} onChange={e => setMostrarPins(e.target.checked)} className="rounded" />
            Pins por município
          </label>
        </div>
      </div>

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
                {/* Reseta o viewport sempre que muda o recorte (ano/cargo/turno) */}
                <MapReset trigger={recorteKey} />

                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://carto.com">CARTO</a>'
                  opacity={0.4}
                />

                {/* Choropleth — polígonos dos municípios coloridos por % */}
                {mostrarChoropleth && geo && (
                  <GeoJSON
                    key={`geo-${recorteKey}-${selecionado}-${porMunicipio.size}`}
                    data={geo}
                    style={(f: any) => {
                      const info = porMunicipio.get(String(f?.properties?.codarea ?? ''));
                      return {
                        fillColor:   colorForPct(info ? info.pct : null),
                        fillOpacity: 0.75,
                        color:       '#ffffff',
                        weight:      0.5,
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

                {/* Pins — CircleMarker nos centróides dos municípios */}
                {mostrarPins && municipiosComCoords.map(m => (
                  <CircleMarker
                    key={`pin-${m.codigoIbge}`}
                    center={[m.lat!, m.lng!]}
                    radius={radiosSelecionado(m.pct, selecionado)}
                    pathOptions={{
                      fillColor:   colorForPct(m.pct),
                      fillOpacity: 0.92,
                      color:       '#ffffff',
                      weight:      1.5,
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -4]} opacity={0.95}>
                      <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                        <strong>{m.nome}</strong><br />
                        {fmt(m.votos)} votos — {m.pct.toFixed(2)}%
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-3 bg-card border border-border rounded-xl p-3">
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
    </div>
  );
}

// raio do pin: maior quando candidato específico selecionado, menor no modo "todos"
function radiosSelecionado(pct: number, sel: string): number {
  return sel === 'TODOS' ? Math.max(4, Math.min(14, 4 + (pct / 100) * 10)) : radiusForPct(pct);
}
