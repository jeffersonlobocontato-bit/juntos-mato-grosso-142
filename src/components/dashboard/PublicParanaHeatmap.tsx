import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

interface MunicipioData {
  id: string;
  nome: string;
  latitude: number | null;
  longitude: number | null;
}

interface ProposalData {
  municipio: string | null;
  eixo_nome: string;
  count: number;
}

interface AggregatedMarker {
  municipio: string;
  latitude: number;
  longitude: number;
  eixos: { nome: string; count: number }[];
  total: number;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
const PARANA_CENTER: [number, number] = [-55.9, -12.7];

const eixoColors: Record<string, string> = {
  "Saúde": "#ef4444",
  "Educação": "#3b82f6",
  "Segurança Pública": "#f59e0b",
  "Infraestrutura": "#8b5cf6",
  "Meio Ambiente": "#22c55e",
  "Economia": "#ec4899",
  "Tecnologia": "#14b8a6",
  "Desenvolvimento Social": "#f97316",
};

const getEixoColor = (eixo: string): string => {
  for (const [key, color] of Object.entries(eixoColors)) {
    if (key.toLowerCase().includes(eixo.toLowerCase()) || eixo.toLowerCase().includes(key.toLowerCase())) {
      return color;
    }
  }
  return "#10b981";
};

const PublicParanaHeatmap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Fetch municipalities with coordinates
  const { data: municipios } = useQuery({
    queryKey: ["municipios-coords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("municipios")
        .select("id, nome, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);
      if (error) throw error;
      return data as MunicipioData[];
    },
  });

  // Fetch leads with proposal data to aggregate by municipality
  const { data: leadsData } = useQuery({
    queryKey: ["leads-proposals-aggregate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("municipio, metadata")
        .eq("origem", "proposta")
        .not("municipio", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch eixos for name mapping
  const { data: eixos } = useQuery({
    queryKey: ["eixos-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eixos_tematicos")
        .select("id, nome");
      if (error) throw error;
      return data;
    },
  });

  // Aggregate data by municipality and eixo
  const aggregatedMarkers: AggregatedMarker[] = (() => {
    if (!municipios || !leadsData || !eixos) return [];

    const municipioMap = new Map<string, MunicipioData>();
    municipios.forEach((m) => municipioMap.set(m.nome, m));

    const eixoMap = new Map<string, string>();
    eixos.forEach((e) => eixoMap.set(e.id, e.nome));

    const aggregation = new Map<string, { eixos: Map<string, number>; lat: number; lng: number }>();

    leadsData.forEach((lead) => {
      const municipioNome = lead.municipio;
      if (!municipioNome) return;

      const mun = municipioMap.get(municipioNome);
      if (!mun || !mun.latitude || !mun.longitude) return;

      const metadata = lead.metadata as { eixo_id?: string } | null;
      const eixoId = metadata?.eixo_id;
      const eixoNome = eixoId ? eixoMap.get(eixoId) || "Outros" : "Outros";

      if (!aggregation.has(municipioNome)) {
        aggregation.set(municipioNome, {
          eixos: new Map(),
          lat: Number(mun.latitude),
          lng: Number(mun.longitude),
        });
      }

      const entry = aggregation.get(municipioNome)!;
      entry.eixos.set(eixoNome, (entry.eixos.get(eixoNome) || 0) + 1);
    });

    return Array.from(aggregation.entries()).map(([municipio, data]) => ({
      municipio,
      latitude: data.lat,
      longitude: data.lng,
      eixos: Array.from(data.eixos.entries()).map(([nome, count]) => ({ nome, count })),
      total: Array.from(data.eixos.values()).reduce((a, b) => a + b, 0),
    }));
  })();

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: PARANA_CENTER,
      zoom: 5,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      setIsMapLoaded(true);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Add markers when data is ready
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || aggregatedMarkers.length === 0) return;
    
    const map = mapRef.current;
    
    // Wait for style to be fully loaded before adding sources
    if (!map.isStyleLoaded()) {
      const onStyleLoad = () => {
        map.off("style.load", onStyleLoad);
        // Re-trigger this effect by forcing a state update
        setIsMapLoaded(false);
        setTimeout(() => setIsMapLoaded(true), 50);
      };
      map.on("style.load", onStyleLoad);
      return;
    }

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Create GeoJSON for heatmap
    const geojsonData = {
      type: "FeatureCollection",
      features: aggregatedMarkers.map((m) => ({
        type: "Feature",
        properties: { weight: m.total },
        geometry: {
          type: "Point",
          coordinates: [m.longitude, m.latitude],
        },
      })),
    };

    // Remove existing source/layer if any
    if (map.getSource("proposals-heat")) {
      map.removeLayer("proposals-heat-layer");
      map.removeSource("proposals-heat");
    }

    map.addSource("proposals-heat", {
      type: "geojson",
      data: geojsonData,
    });

    map.addLayer({
      id: "proposals-heat-layer",
      type: "heatmap",
      source: "proposals-heat",
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 10, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 3],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(16, 185, 129, 0)",
          0.2, "rgba(16, 185, 129, 0.3)",
          0.4, "rgba(34, 197, 94, 0.5)",
          0.6, "rgba(22, 163, 74, 0.7)",
          0.8, "rgba(21, 128, 61, 0.85)",
          1, "rgba(20, 83, 45, 1)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 9, 40],
        "heatmap-opacity": 0.7,
      },
    });

    // Add marker styles once
    if (!document.getElementById("heatmap-marker-style")) {
      const markerStyle = document.createElement("style");
      markerStyle.id = "heatmap-marker-style";
      markerStyle.textContent = `
        .heatmap-marker-inner {
          width: 100%;
          height: 100%;
          position: relative;
          transition: transform 0.2s ease;
        }
        .heatmap-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-color: rgba(16, 185, 129, 0.4);
          transform: translate(-50%, -50%);
          animation: heatmap-pulse 2s ease-in-out infinite;
          pointer-events: none;
        }
        .heatmap-marker-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 60%;
          height: 60%;
          border-radius: 50%;
          background-color: rgba(16, 185, 129, 0.8);
          border: 2px solid rgba(255, 255, 255, 0.6);
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .heatmap-marker-inner:hover .heatmap-marker-dot {
          background-color: rgba(16, 185, 129, 1);
        }
        @keyframes heatmap-pulse {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 0.2;
          }
        }
        .heatmap-popup .mapboxgl-popup-content {
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 0;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        }
        .heatmap-popup .mapboxgl-popup-tip {
          border-top-color: rgba(0, 0, 0, 0.9);
        }
      `;
      document.head.appendChild(markerStyle);
    }

    // Add markers on top for hover tooltips
    aggregatedMarkers.forEach((marker) => {
      const size = Math.min(16 + marker.total * 3, 40);
      
      // Container element (Mapbox controls this)
      const el = document.createElement("div");
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.cursor = "pointer";

      // Inner element (we control this for animations)
      const inner = document.createElement("div");
      inner.className = "heatmap-marker-inner";

      // Pulse ring
      const pulseRing = document.createElement("div");
      pulseRing.className = "heatmap-marker-pulse";

      // Center dot
      const dot = document.createElement("div");
      dot.className = "heatmap-marker-dot";

      inner.appendChild(pulseRing);
      inner.appendChild(dot);
      el.appendChild(inner);

      // Create popup content
      const eixosList = marker.eixos
        .sort((a, b) => b.count - a.count)
        .map((e) => `
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${getEixoColor(e.nome)};"></span>
            <span style="flex: 1; color: rgba(255,255,255,0.8); font-size: 11px;">${e.nome}</span>
            <span style="color: #10b981; font-size: 11px; font-weight: 600;">${e.count}</span>
          </div>
        `)
        .join("");

      const popup = new mapboxgl.Popup({
        offset: 15,
        closeButton: false,
        closeOnClick: false,
        className: "heatmap-popup",
      }).setHTML(`
        <div style="padding: 10px; min-width: 160px;">
          <div style="font-weight: 600; color: #fff; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1);">
            ${marker.municipio}
          </div>
          <div style="font-size: 10px; color: rgba(255,255,255,0.5); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
            Eixos com propostas:
          </div>
          ${eixosList}
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: rgba(255,255,255,0.5);">Total</span>
            <span style="font-size: 13px; font-weight: 700; color: #10b981;">${marker.total}</span>
          </div>
        </div>
      `);

      const mapboxMarker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);

      // Show popup on hover - apply transform to inner element only
      el.addEventListener("mouseenter", () => {
        inner.style.transform = "scale(1.3)";
        popup.setLngLat([marker.longitude, marker.latitude]).addTo(map);
      });

      el.addEventListener("mouseleave", () => {
        inner.style.transform = "scale(1)";
        popup.remove();
      });

      markersRef.current.push(mapboxMarker);
    });
  }, [isMapLoaded, aggregatedMarkers]);

  if (!MAPBOX_TOKEN) {
    return (
      <Card variant="default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Mapa de Propostas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] bg-muted/50 rounded-xl flex items-center justify-center">
            <p className="text-muted-foreground">Mapa não configurado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" />
          Mapa de Calor das Propostas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[400px] rounded-xl overflow-hidden border border-border">
          {!isMapLoaded && (
            <div className="absolute inset-0 bg-muted/50 flex items-center justify-center z-10">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
          <div ref={mapContainer} className="w-full h-full" />
        </div>
        <div className="mt-4 flex flex-wrap gap-3 justify-center">
          {Object.entries(eixoColors).slice(0, 4).map(([nome, color]) => (
            <div key={nome} className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground">{nome}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PublicParanaHeatmap;
