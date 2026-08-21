import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { MapPin, AlertCircle, Flame } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Estado {
  sigla: string;
  nome: string;
}

interface Eleicao {
  id: string;
  ano: number;
  turno: number;
  tipo: string;
  descricao: string;
}

interface TSEMapProps {
  estados: Estado[];
  selectedUF: string;
  onSelectUF: (uf: string) => void;
  eleicoes: Eleicao[];
}

// State centers for map positioning
const STATE_CENTERS: Record<string, [number, number]> = {
  MT: [-55.9, -12.7],
  MS: [-54.6295, -20.4697],
  PR: [-51.4166, -25.2521],
  SP: [-46.6333, -23.5505],
  RJ: [-43.1729, -22.9068],
  MG: [-44.0384, -19.9167],
  RS: [-51.2177, -30.0346],
  SC: [-48.5480, -27.5954],
  BA: [-38.5016, -12.9714],
};

const DEFAULT_CENTER: [number, number] = STATE_CENTERS.MT;

export default function TSEMap({
  estados,
  selectedUF,
  onSelectUF,
  eleicoes,
}: TSEMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedEleicao, setSelectedEleicao] = useState<string>("");
  const [selectedCargo, setSelectedCargo] = useState<string>("all");
  const [selectedCandidato, setSelectedCandidato] = useState<string>("all");
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapLoading, setMapLoading] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Fetch cargos
  const { data: cargos } = useQuery({
    queryKey: ["tse-cargos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tse_cargos")
        .select("*")
        .order("codigo_tse");

      if (error) throw error;
      return data;
    },
  });

  // Fetch candidates for selected election and cargo
  const { data: candidatos } = useQuery({
    queryKey: ["tse-candidatos", selectedEleicao, selectedCargo, selectedUF],
    queryFn: async () => {
      if (!selectedEleicao) return [];

      let query = supabase
        .from("tse_candidatos")
        .select(`
          *,
          partido:tse_partidos(sigla, cor_hex)
        `)
        .eq("eleicao_id", selectedEleicao)
        .eq("uf", selectedUF);

      if (selectedCargo && selectedCargo !== "all") {
        query = query.eq("cargo_id", selectedCargo);
      }

      const { data, error } = await query.order("nome_urna").limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEleicao,
  });

  // Fetch voting locations with votes
  const { data: locaisVotacao, isLoading: isLoadingLocais } = useQuery({
    queryKey: ["tse-locais-votos", selectedEleicao, selectedCandidato, selectedUF],
    queryFn: async () => {
      if (!selectedEleicao) return [];

      // First get the locations
      const { data: locais, error: locaisError } = await supabase
        .from("tse_locais_votacao")
        .select("*")
        .eq("uf", selectedUF)
        .not("latitude", "is", null)
        .limit(1000);

      if (locaisError) throw locaisError;
      if (!locais?.length) return [];

      // Then get votes aggregated by location
      let votosQuery = supabase
        .from("tse_votos")
        .select("local_id, quantidade, candidato_id")
        .eq("eleicao_id", selectedEleicao)
        .eq("uf", selectedUF);

      if (selectedCandidato && selectedCandidato !== "all") {
        votosQuery = votosQuery.eq("candidato_id", selectedCandidato);
      }

      const { data: votos, error: votosError } = await votosQuery;
      if (votosError) throw votosError;

      // Aggregate votes by location
      const votosPorLocal: Record<string, number> = {};
      votos?.forEach(v => {
        if (v.local_id) {
          votosPorLocal[v.local_id] = (votosPorLocal[v.local_id] || 0) + v.quantidade;
        }
      });

      // Combine locations with vote data
      return locais.map(local => ({
        ...local,
        totalVotos: votosPorLocal[local.id] || 0,
      }));
    },
    enabled: !!selectedEleicao,
  });

  // Clear all markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
  }, []);

  // Update heatmap layer
  const updateHeatmap = useCallback(() => {
    if (!map.current || !mapReady || !locaisVotacao?.length) return;

    // Remove existing heatmap layer and source if they exist
    if (map.current.getLayer("votes-heat")) {
      map.current.removeLayer("votes-heat");
    }
    if (map.current.getSource("votes")) {
      map.current.removeSource("votes");
    }

    if (!showHeatmap) return;

    // Clear markers when showing heatmap
    clearMarkers();

    // Find max votes for normalization
    const maxVotos = Math.max(...locaisVotacao.map(l => l.totalVotos), 1);

    // Create GeoJSON features
    const features = locaisVotacao
      .filter(local => local.latitude && local.longitude && local.totalVotos > 0)
      .map(local => ({
        type: "Feature" as const,
        properties: {
          votes: local.totalVotos,
          weight: local.totalVotos / maxVotos,
        },
        geometry: {
          type: "Point" as const,
          coordinates: [Number(local.longitude), Number(local.latitude)],
        },
      }));

    // Add source
    map.current.addSource("votes", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features,
      },
    });

    // Add heatmap layer
    map.current.addLayer({
      id: "votes-heat",
      type: "heatmap",
      source: "votes",
      maxzoom: 15,
      paint: {
        // Increase the heatmap weight based on vote count
        "heatmap-weight": [
          "interpolate",
          ["linear"],
          ["get", "weight"],
          0, 0,
          1, 1
        ],
        // Increase the heatmap color weight by zoom level
        "heatmap-intensity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, 1,
          15, 3
        ],
        // Color ramp for heatmap - blue to red
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0, "rgba(0, 0, 0, 0)",
          0.1, "rgba(59, 130, 246, 0.4)",
          0.3, "rgba(34, 197, 94, 0.6)",
          0.5, "rgba(234, 179, 8, 0.8)",
          0.7, "rgba(249, 115, 22, 0.9)",
          1, "rgba(239, 68, 68, 1)"
        ],
        // Adjust the heatmap radius by zoom level
        "heatmap-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          0, 15,
          10, 30,
          15, 50
        ],
        // Transition from heatmap to circle layer by zoom level
        "heatmap-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12, 1,
          15, 0.8
        ],
      },
    });
  }, [locaisVotacao, showHeatmap, mapReady, clearMarkers]);

  // Add markers for voting locations
  const updateMarkers = useCallback(() => {
    if (!map.current || !mapReady || !locaisVotacao?.length || showHeatmap) return;

    // Clear existing markers
    clearMarkers();

    // Find max votes for scaling
    const maxVotos = Math.max(...locaisVotacao.map(l => l.totalVotos), 1);

    // Add new markers
    locaisVotacao.forEach(local => {
      if (!local.latitude || !local.longitude) return;

      const size = Math.max(8, Math.min(30, (local.totalVotos / maxVotos) * 30));
      
      const el = document.createElement("div");
      el.className = "tse-marker";
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = "50%";
      el.style.backgroundColor = local.totalVotos > 0 ? "rgba(59, 130, 246, 0.8)" : "rgba(100, 100, 100, 0.5)";
      el.style.border = "2px solid rgba(255, 255, 255, 0.8)";
      el.style.cursor = "pointer";

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2">
          <h3 class="font-bold text-sm">${local.local_nome || "Local de Votação"}</h3>
          <p class="text-xs text-gray-600">${local.nome_municipio || ""}</p>
          <p class="text-xs">Zona ${local.zona}${local.secao ? `, Seção ${local.secao}` : ""}</p>
          <p class="text-sm font-bold mt-1">${local.totalVotos.toLocaleString("pt-BR")} votos</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([Number(local.longitude), Number(local.latitude)])
        .setPopup(popup)
        .addTo(map.current!);
      
      markersRef.current.push(marker);
    });
  }, [locaisVotacao, showHeatmap, mapReady, clearMarkers]);

  // Initialize map with delay to ensure container has dimensions
  useEffect(() => {
    if (map.current) return;
    
    const initializeMap = () => {
      if (!mapContainer.current) return;
      
      // Check container dimensions
      const container = mapContainer.current;
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        // Retry after a short delay
        setTimeout(initializeMap, 100);
        return;
      }

      const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
      if (!token) {
        setMapError("Token do Mapbox não configurado. Configure a variável VITE_MAPBOX_PUBLIC_TOKEN.");
        setMapLoading(false);
        return;
      }

      try {
        mapboxgl.accessToken = token;

        const center = STATE_CENTERS[selectedUF] || DEFAULT_CENTER;

        map.current = new mapboxgl.Map({
          container: container,
          style: "mapbox://styles/mapbox/dark-v11",
          center,
          zoom: selectedUF === "MT" ? 5.2 : 7,
        });

        map.current.on('load', () => {
          setMapLoading(false);
          setMapError(null);
          setMapReady(true);
        });

        map.current.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapError("Erro ao carregar o mapa. Verifique sua conexão.");
          setMapLoading(false);
        });

        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      } catch (error) {
        console.error('Map initialization error:', error);
        setMapError("Erro ao inicializar o mapa. Tente recarregar a página.");
        setMapLoading(false);
      }
    };

    // Small delay to ensure DOM is ready
    const timeout = setTimeout(initializeMap, 150);

    return () => {
      clearTimeout(timeout);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [selectedUF]);

  // Update map center when state changes
  useEffect(() => {
    if (!map.current) return;
    const center = STATE_CENTERS[selectedUF] || DEFAULT_CENTER;
    map.current.flyTo({ center, zoom: selectedUF === "MT" ? 5.2 : 7 });
  }, [selectedUF]);

  // Update visualization when data or mode changes
  useEffect(() => {
    if (showHeatmap) {
      updateHeatmap();
    } else {
      // Remove heatmap layer if exists
      if (map.current && mapReady) {
        if (map.current.getLayer("votes-heat")) {
          map.current.removeLayer("votes-heat");
        }
        if (map.current.getSource("votes")) {
          map.current.removeSource("votes");
        }
      }
      updateMarkers();
    }
  }, [showHeatmap, locaisVotacao, mapReady, updateHeatmap, updateMarkers]);

  // Get filtered elections for selected state
  const filteredEleicoes = eleicoes.filter(() => {
    return true; // For now, show all elections
  });

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Filters */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            Configure a visualização do mapa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={selectedUF} onValueChange={onSelectUF}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um estado" />
              </SelectTrigger>
              <SelectContent>
                {estados.map(estado => (
                  <SelectItem key={estado.sigla} value={estado.sigla}>
                    {estado.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Eleição</Label>
            <Select value={selectedEleicao} onValueChange={setSelectedEleicao}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma eleição" />
              </SelectTrigger>
              <SelectContent>
                {filteredEleicoes.map(eleicao => (
                  <SelectItem key={eleicao.id} value={eleicao.id}>
                    {eleicao.ano} - {eleicao.descricao || eleicao.tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Cargo</Label>
            <Select value={selectedCargo} onValueChange={setSelectedCargo}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os cargos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                {cargos?.map(cargo => (
                  <SelectItem key={cargo.id} value={cargo.id}>
                    {cargo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Candidato</Label>
            <Select
              value={selectedCandidato}
              onValueChange={setSelectedCandidato}
              disabled={!candidatos?.length}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os candidatos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os candidatos</SelectItem>
                {candidatos?.map(candidato => (
                  <SelectItem key={candidato.id} value={candidato.id}>
                    {candidato.nome_urna} ({candidato.partido?.sigla || candidato.numero_urna})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visualization Toggle */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <Label htmlFor="heatmap-toggle" className="text-sm font-medium">
                  Mapa de Calor
                </Label>
              </div>
              <Switch
                id="heatmap-toggle"
                checked={showHeatmap}
                onCheckedChange={setShowHeatmap}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {showHeatmap 
                ? "Exibindo densidade de votos" 
                : "Exibindo marcadores por local"}
            </p>
          </div>

          {/* Stats */}
          {locaisVotacao && (
            <div className="pt-4 border-t">
              <h4 className="font-medium text-sm mb-2">Estatísticas</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Locais:</span>
                  <span className="font-medium">{locaisVotacao.length.toLocaleString("pt-BR")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de votos:</span>
                  <span className="font-medium">
                    {locaisVotacao.reduce((sum, l) => sum + l.totalVotos, 0).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Map */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">
            {showHeatmap ? "Mapa de Calor de Votos" : "Mapa de Votos"}
          </CardTitle>
          <CardDescription>
            {showHeatmap 
              ? "Visualização da densidade de votos por região"
              : "Visualização geolocalizada dos votos por local de votação"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mapError ? (
            <div className="h-[500px] w-full rounded-lg bg-muted flex items-center justify-center">
              <div className="text-center text-muted-foreground p-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive opacity-70" />
                <p className="text-lg font-medium">Não foi possível carregar o mapa</p>
                <p className="text-sm mt-2">{mapError}</p>
              </div>
            </div>
          ) : isLoadingLocais || mapLoading ? (
            <div className="relative">
              <Skeleton className="h-[500px] w-full rounded-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm">Carregando mapa...</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={mapContainer}
              className="h-[500px] w-full rounded-lg overflow-hidden"
            />
          )}

          {/* Legend */}
          <div className="mt-4">
            {showHeatmap ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Legenda - Densidade de Votos</p>
                <div className="flex items-center gap-1 h-4 rounded overflow-hidden">
                  <div className="flex-1 h-full bg-gradient-to-r from-blue-500/40 via-green-500/60 via-yellow-500/80 via-orange-500/90 to-red-500" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Baixa</span>
                  <span>Média</span>
                  <span>Alta</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500/80 border border-white" />
                  <span className="text-muted-foreground">Com votos (tamanho = volume)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500/50 border border-white" />
                  <span className="text-muted-foreground">Sem votos registrados</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
