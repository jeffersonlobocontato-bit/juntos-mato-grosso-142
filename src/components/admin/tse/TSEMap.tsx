import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  PR: [-51.4166, -25.2521],
  SP: [-46.6333, -23.5505],
  RJ: [-43.1729, -22.9068],
  MG: [-44.0384, -19.9167],
  RS: [-51.2177, -30.0346],
  SC: [-48.5480, -27.5954],
  BA: [-38.5016, -12.9714],
  // Add more as needed
};

export default function TSEMap({
  estados,
  selectedUF,
  onSelectUF,
  eleicoes,
}: TSEMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedEleicao, setSelectedEleicao] = useState<string>("");
  const [selectedCargo, setSelectedCargo] = useState<string>("");
  const [selectedCandidato, setSelectedCandidato] = useState<string>("");

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

      if (selectedCargo) {
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

      if (selectedCandidato) {
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

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!token) {
      console.warn("Mapbox token not found");
      return;
    }

    mapboxgl.accessToken = token;

    const center = STATE_CENTERS[selectedUF] || [-51.4166, -25.2521];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center,
      zoom: 7,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update map center when state changes
  useEffect(() => {
    if (!map.current) return;
    const center = STATE_CENTERS[selectedUF] || [-51.4166, -25.2521];
    map.current.flyTo({ center, zoom: 7 });
  }, [selectedUF]);

  // Add markers for voting locations
  useEffect(() => {
    if (!map.current || !locaisVotacao?.length) return;

    // Remove existing markers
    const markers = document.querySelectorAll(".mapboxgl-marker");
    markers.forEach(m => m.remove());

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

      new mapboxgl.Marker(el)
        .setLngLat([Number(local.longitude), Number(local.latitude)])
        .setPopup(popup)
        .addTo(map.current!);
    });
  }, [locaisVotacao]);

  // Get filtered elections for selected state
  const filteredEleicoes = eleicoes.filter(e => {
    // Check if there's data for this election in the selected state
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
                <SelectItem value="">Todos os cargos</SelectItem>
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
                <SelectItem value="">Todos os candidatos</SelectItem>
                {candidatos?.map(candidato => (
                  <SelectItem key={candidato.id} value={candidato.id}>
                    {candidato.nome_urna} ({candidato.partido?.sigla || candidato.numero_urna})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <CardTitle className="text-lg">Mapa de Votos</CardTitle>
          <CardDescription>
            Visualização geolocalizada dos votos por local de votação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLocais ? (
            <Skeleton className="h-[500px] w-full rounded-lg" />
          ) : (
            <div
              ref={mapContainer}
              className="h-[500px] w-full rounded-lg overflow-hidden"
            />
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500/80 border border-white" />
              <span className="text-muted-foreground">Com votos (tamanho = volume)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500/50 border border-white" />
              <span className="text-muted-foreground">Sem votos registrados</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
