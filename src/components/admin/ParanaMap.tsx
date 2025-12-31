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
  colorBy?: 'status' | 'eixo';
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

const ParanaMap: React.FC<ParanaMapProps> = ({
  markers,
  title,
  colorBy = 'status',
  statusColors = defaultStatusColors,
  eixoColors = defaultEixoColors,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

  const getMarkerColor = (marker: MapMarker): string => {
    if (colorBy === 'status' && marker.status) {
      return statusColors[marker.status] || '#6b7280';
    }
    if (colorBy === 'eixo' && marker.eixo) {
      return eixoColors[marker.eixo] || '#6b7280';
    }
    return '#3b82f6';
  };

  useEffect(() => {
    if (!mapContainer.current || !isVisible || !MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-51.5, -24.5], // Centro do Paraná
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
    });

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      setMapLoaded(false);
    };
  }, [isVisible]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !isVisible) return;

    // Limpar marcadores antigos
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Agrupar por município para clustering
    const groupedMarkers = markers.reduce((acc, marker) => {
      const key = `${marker.latitude}-${marker.longitude}`;
      if (!acc[key]) {
        acc[key] = { ...marker, count: 1, items: [marker] };
      } else {
        acc[key].count = (acc[key].count || 1) + 1;
        acc[key].items.push(marker);
      }
      return acc;
    }, {} as Record<string, MapMarker & { items: MapMarker[] }>);

    // Adicionar novos marcadores
    Object.values(groupedMarkers).forEach((group) => {
      if (!group.latitude || !group.longitude) return;

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.cssText = `
        width: ${Math.min(40, 24 + (group.count || 1) * 2)}px;
        height: ${Math.min(40, 24 + (group.count || 1) * 2)}px;
        background-color: ${getMarkerColor(group)};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        cursor: pointer;
        transition: transform 0.2s;
      `;
      el.textContent = (group.count || 1) > 1 ? String(group.count) : '';
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const popupContent = `
        <div style="max-width: 250px; padding: 8px;">
          <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 14px;">${group.municipio}</h3>
          <p style="color: #666; font-size: 12px; margin-bottom: 8px;">${group.count || 1} item(ns)</p>
          ${group.items.slice(0, 3).map(item => `
            <div style="background: #f5f5f5; padding: 6px; border-radius: 4px; margin-bottom: 4px; font-size: 11px;">
              <strong>${item.title}</strong>
              ${item.status ? `<span style="color: ${getMarkerColor(item)}; margin-left: 4px;">(${item.status})</span>` : ''}
              ${item.eixo ? `<br/><span style="color: #666;">${item.eixo}</span>` : ''}
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

    // Ajustar bounds se houver marcadores
    if (markers.length > 0) {
      const validMarkers = markers.filter(m => m.latitude && m.longitude);
      if (validMarkers.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validMarkers.forEach((marker) => {
          bounds.extend([marker.longitude, marker.latitude]);
        });
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 10 });
      }
    }
  }, [markers, mapLoaded, isVisible, colorBy]);

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

        {/* Legenda */}
        {isVisible && (
          <div className="mt-4 flex flex-wrap gap-3">
            {colorBy === 'status' &&
              Object.entries(statusColors).map(([status, color]) => (
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
            {colorBy === 'eixo' &&
              Object.entries(eixoColors).map(([eixo, color]) => (
                <div key={eixo} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-muted-foreground">{eixo}</span>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParanaMap;
