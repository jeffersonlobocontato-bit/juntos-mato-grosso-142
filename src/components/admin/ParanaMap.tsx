import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  status?: string;
  eixo?: string;
  municipio: string;
  count?: number;
}

interface ParanaMapProps {
  markers: MapMarker[];
  title: string;
  statusColors?: Record<string, string>;
  eixoColors?: Record<string, string>;
}

const defaultStatusColors: Record<string, string> = {
  rascunho: '#6b7280',
  validada: '#3b82f6',
  consolidada: '#f59e0b',
  aprovada: '#22c55e',
};

const defaultEixoColors: Record<string, string> = {
  'Saúde': '#ef4444',
  'Educação': '#3b82f6',
  'Segurança': '#f59e0b',
  'Infraestrutura': '#8b5cf6',
  'Meio Ambiente': '#22c55e',
  'Economia': '#ec4899',
  'Cultura': '#14b8a6',
  'Assistência Social': '#f97316',
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN || '';

// Bounds do Paraná para filtrar marcadores fora do estado
const isWithinParana = (lat: number, lng: number): boolean => {
  return lat >= -26.8 && lat <= -22.4 && lng >= -54.8 && lng <= -48.0;
};

const ParanaMap: React.FC<ParanaMapProps> = ({
  markers,
  title,
  statusColors = defaultStatusColors,
  eixoColors = defaultEixoColors,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  const getStatusColor = (status?: string): string => {
    return status ? statusColors[status] || '#6b7280' : '#6b7280';
  };

  const getEixoColor = (eixo?: string): string => {
    return eixo ? eixoColors[eixo] || '#6b7280' : '#6b7280';
  };

  // Cria marcador bicolor com status (metade superior) e eixo (metade inferior)
  const createBicolorMarker = (
    statusColor: string,
    eixoColor: string,
    count: number
  ): HTMLDivElement => {
    const el = document.createElement('div');
    const size = Math.min(44, 28 + count * 2);
    
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: linear-gradient(to bottom, ${statusColor} 50%, ${eixoColor} 50%);
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    `;
    
    if (count > 1) {
      el.textContent = String(count);
    }
    
    return el;
  };

  useEffect(() => {
    if (!mapContainer.current || !isVisible || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-51.5, -24.5],
      zoom: 6,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);
      map.current?.resize();
      setTimeout(() => map.current?.resize(), 100);
      setTimeout(() => map.current?.resize(), 300);
    });

    map.current.on('style.load', () => {
      map.current?.resize();
    });

    const resizeObserver = new ResizeObserver(() => {
      map.current?.resize();
    });
    resizeObserver.observe(mapContainer.current);

    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      setMapLoaded(false);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !isVisible) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Filtrar marcadores fora do Paraná
    const validMarkers = markers.filter(
      (m) => m.latitude && m.longitude && isWithinParana(m.latitude, m.longitude)
    );

    // Agrupar por município
    const groupedMarkers = validMarkers.reduce((acc, marker) => {
      const key = `${marker.latitude}-${marker.longitude}`;
      if (!acc[key]) {
        acc[key] = { ...marker, count: 1, items: [marker] };
      } else {
        acc[key].count = (acc[key].count || 1) + 1;
        acc[key].items.push(marker);
      }
      return acc;
    }, {} as Record<string, MapMarker & { items: MapMarker[] }>);

    Object.values(groupedMarkers).forEach((group) => {
      if (!group.latitude || !group.longitude) return;

      // Usar primeiro item do grupo para cores
      const statusColor = getStatusColor(group.status);
      const eixoColor = getEixoColor(group.eixo);

      const el = createBicolorMarker(statusColor, eixoColor, group.count || 1);

      const popupContent = `
        <div style="max-width: 280px; padding: 10px;">
          <h3 style="font-weight: bold; margin-bottom: 6px; font-size: 14px;">${group.municipio}</h3>
          <p style="color: #666; font-size: 12px; margin-bottom: 10px;">${group.count || 1} item(ns)</p>
          ${group.items.slice(0, 3).map(item => `
            <div style="background: #f5f5f5; padding: 8px; border-radius: 6px; margin-bottom: 6px; font-size: 11px; border-left: 4px solid ${getStatusColor(item.status)};">
              <strong>${item.title}</strong>
              <div style="display: flex; gap: 8px; margin-top: 4px;">
                <span style="background: ${getStatusColor(item.status)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.status || 'N/A'}</span>
                <span style="background: ${getEixoColor(item.eixo)}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.eixo || 'N/A'}</span>
              </div>
            </div>
          `).join('')}
          ${(group.count || 1) > 3 ? `<p style="color: #666; font-size: 11px; font-style: italic;">+ ${(group.count || 1) - 3} mais...</p>` : ''}
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([group.longitude, group.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    if (validMarkers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      validMarkers.forEach((marker) => {
        bounds.extend([marker.longitude, marker.latitude]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 10 });
    }
  }, [markers, mapLoaded, isVisible]);

  if (!MAPBOX_TOKEN) {
    return (
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <MapPin className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
            <p className="text-muted-foreground text-center">
              Token do Mapbox não configurado.<br />
              Configure VITE_MAPBOX_PUBLIC_TOKEN para visualizar o mapa.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <MapPin className="h-5 w-5" />
          {title}
          <span className="text-sm font-normal text-muted-foreground">
            ({markers.length} itens)
          </span>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
        >
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="ml-1">{isVisible ? 'Ocultar' : 'Mostrar'}</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isVisible ? (
          <div
            ref={mapContainer}
            className="h-80 rounded-lg overflow-hidden"
            style={{ minHeight: '320px' }}
          />
        ) : (
          <div className="flex items-center justify-center h-20 bg-muted rounded-lg">
            <p className="text-muted-foreground">Mapa oculto</p>
          </div>
        )}

        {/* Legenda Bicolor */}
        {isVisible && (
          <div className="mt-4 space-y-3">
            {/* Legenda de Status */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                🔼 Metade superior: Status
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(statusColors).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-muted-foreground capitalize">
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legenda de Eixo */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                🔽 Metade inferior: Eixo Temático
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(eixoColors).map(([eixo, color]) => (
                  <div key={eixo} className="flex items-center gap-1.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-muted-foreground">{eixo}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParanaMap;
