// Portado da plataforma Politiza IA (politiza.ia.br) — modelo de mapa Leaflet
// com choropleth de municípios por associação política.
//
// NOTA: a camada de "leads" (lideranças, ativos políticos, membros de campanha,
// ações de campo, candidatos de chapa) do mapa original do Politiza depende de
// 6 tabelas exclusivas do modelo de dados daquela plataforma (leaders,
// political_assets, campaign_members, actions, tracking_interviews,
// party_slate_candidates), que não existem no banco da Juntos Mato Grosso 142 —
// não foi portada aqui. Esta versão traz a infraestrutura de mapa base +
// choropleth, prontas para receber essas camadas depois, se decidido portar
// os módulos correspondentes (Inteligência/Tracking).
import { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { Map as MapIcon, Filter, X } from 'lucide-react';
import MapZoomControl from '@/components/maps/MapZoomControl';
import { MtAssociationChoropleth, MtAssociationLegend } from '@/components/maps/MtAssociationChoropleth';

type BgMode = 'colored' | 'outline' | 'hidden';

export default function MapaEstrategico() {
  const [showFilters, setShowFilters] = useState(true);
  const [bgMode, setBgMode] = useState<BgMode>('colored');

  const bgOptions: { id: BgMode; label: string }[] = [
    { id: 'colored', label: 'Cores' },
    { id: 'outline', label: 'Contornos' },
    { id: 'hidden', label: 'Oculto' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <MapIcon className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-base font-bold text-foreground">Mapa Estratégico</h1>
            <p className="text-xs text-muted-foreground">
              Visualização geográfica de Mato Grosso — 142 municípios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Filter className="w-4 h-4" />
            Camadas
          </button>
        </div>
      </div>

      <div className="flex relative" style={{ height: 'calc(100vh - 110px)' }}>
        {/* Filters Panel */}
        {showFilters && (
          <div className="w-72 border-r border-border p-4 space-y-4 flex-shrink-0 overflow-auto" style={{ background: 'var(--gradient-card)' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Camada de fundo</span>
              <button onClick={() => setShowFilters(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-md bg-muted/30 border border-border">
                {bgOptions.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setBgMode(o.id)}
                    className={`text-[10px] py-1.5 rounded font-medium transition-colors ${
                      bgMode === o.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">
                {bgMode === 'colored' && 'Municípios coloridos por associação.'}
                {bgMode === 'outline' && 'Mapa branco, apenas contornos.'}
                {bgMode === 'hidden' && 'Apenas o mapa base.'}
              </p>
            </div>

            {bgMode === 'colored' && <MtAssociationLegend />}

            <div className="pt-3 border-t border-border">
              <p className="text-[10px] text-muted-foreground leading-snug">
                Associações de municípios ainda não cadastradas. Cadastre em breve via
                painel administrativo para colorir o mapa por alinhamento político.
              </p>
            </div>
          </div>
        )}

        {/* Map */}
        <div className="flex-1 relative" style={{ background: bgMode === 'outline' ? '#ffffff' : undefined }}>
          <MapContainer
            center={[-12.6819, -56.0949]}
            zoom={6}
            style={{ height: '100%', width: '100%', background: bgMode === 'outline' ? '#ffffff' : undefined }}
            zoomControl={false}
          >
            {bgMode !== 'outline' && (
              <TileLayer
                url={bgMode === 'colored'
                  ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                  : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'}
                attribution='&copy; <a href="https://carto.com">CARTO</a>'
                opacity={bgMode === 'colored' ? 0.35 : 1}
              />
            )}

            {bgMode === 'colored' && <MtAssociationChoropleth />}
            {bgMode === 'outline' && (
              <MtAssociationChoropleth fillOpacity={0} strokeColor="#94a3b8" strokeWeight={0.5} />
            )}

            <MapZoomControl />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
