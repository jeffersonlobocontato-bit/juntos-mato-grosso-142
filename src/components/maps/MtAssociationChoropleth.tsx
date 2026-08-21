// Portado da plataforma Politiza IA (politiza.ia.br)
// Camada GeoJSON dos municípios de Mato Grosso colorida por Associação.

import { useMemo } from 'react';
import { GeoJSON } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { useMunicipalityAssociationMap } from '@/hooks/useMunicipalityAssociation';

function normalize(s: string | null | undefined): string {
  if (!s) return '';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function colorForAssoc(acronym: string): string {
  let h = 0;
  for (let i = 0; i < acronym.length; i++) h = (h * 31 + acronym.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 65% 72%)`;
}

function useIbgeMunicipios() {
  return useQuery({
    queryKey: ['ibge-municipios-mt'],
    queryFn: async () => {
      const r = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/51/municipios');
      const arr = (await r.json()) as { id: number; nome: string }[];
      const map = new Map<string, string>();
      arr.forEach(m => map.set(String(m.id), m.nome));
      return map;
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

function usePrGeoJson() {
  return useQuery({
    queryKey: ['ibge-malha-mt-municipios'],
    queryFn: async () => {
      const r = await fetch(
        'https://servicodados.ibge.gov.br/api/v3/malhas/estados/51?formato=application/vnd.geo+json&qualidade=intermediaria&intrarregiao=municipio',
      );
      return await r.json();
    },
    staleTime: 1000 * 60 * 60 * 24,
  });
}

interface Props {
  fillOpacity?: number;
  strokeColor?: string;
  strokeWeight?: number;
}

export function MtAssociationChoropleth({
  fillOpacity = 0.55,
  strokeColor = '#ffffff',
  strokeWeight = 0.6,
}: Props) {
  const { data: assocMap } = useMunicipalityAssociationMap();
  const { data: ibgeNames } = useIbgeMunicipios();
  const { data: geo } = usePrGeoJson();

  const featureInfo = useMemo(() => {
    if (!assocMap || !ibgeNames) return null;
    return (codarea: string) => {
      const name = ibgeNames.get(codarea) ?? codarea;
      const assoc = assocMap.get(normalize(name));
      if (!assoc) return { name, acronym: null as string | null, assocName: null as string | null, color: 'hsl(220 10% 80%)' };
      return { name, acronym: assoc.acronym, assocName: assoc.name, color: colorForAssoc(assoc.acronym) };
    };
  }, [assocMap, ibgeNames]);

  if (!geo || !featureInfo) return null;

  return (
    <GeoJSON
      key={JSON.stringify({ a: !!assocMap, n: !!ibgeNames })}
      data={geo}
      style={(f: any) => {
        const info = featureInfo(String(f?.properties?.codarea ?? ''));
        return {
          fillColor: info.color,
          fillOpacity,
          color: strokeColor,
          weight: strokeWeight,
        };
      }}
      onEachFeature={(feature: any, layer: any) => {
        const info = featureInfo(String(feature?.properties?.codarea ?? ''));
        layer.bindTooltip(
          `<div style="font-size:11px"><strong>${info.name}</strong><br/>${
            info.acronym ? `${info.acronym} — ${info.assocName}` : 'Sem associação'
          }</div>`,
          { sticky: true },
        );
        layer.on({
          mouseover: (e: any) => e.target.setStyle({ weight: 1.5, fillOpacity: Math.min(0.9, fillOpacity + 0.2) }),
          mouseout: (e: any) => e.target.setStyle({ weight: strokeWeight, fillOpacity }),
        });
      }}
    />
  );
}

export function MtAssociationLegend() {
  const { data: assocMap } = useMunicipalityAssociationMap();
  const items = useMemo(() => {
    if (!assocMap) return [];
    const seen = new Map<string, string>();
    assocMap.forEach(a => seen.set(a.acronym, a.name));
    return Array.from(seen.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([acronym, name]) => ({ acronym, name, color: colorForAssoc(acronym) }));
  }, [assocMap]);

  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Associações de municípios</p>
      <div className="grid grid-cols-1 gap-1 max-h-48 overflow-auto pr-1">
        {items.map(i => (
          <div key={i.acronym} className="flex items-center gap-2 text-[11px]" title={i.name}>
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-border" style={{ background: i.color }} />
            <span className="font-semibold text-foreground">{i.acronym}</span>
            <span className="text-muted-foreground truncate">{i.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
