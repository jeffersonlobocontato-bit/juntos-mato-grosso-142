import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

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

interface TSEAnalysisProps {
  estados: Estado[];
  selectedUF: string;
  onSelectUF: (uf: string) => void;
  eleicoes: Eleicao[];
}

const CHART_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export default function TSEAnalysis({
  estados,
  selectedUF,
  onSelectUF,
  eleicoes,
}: TSEAnalysisProps) {
  const [selectedEleicao, setSelectedEleicao] = useState<string>("");
  const [selectedCargo, setSelectedCargo] = useState<string>("all");

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

  // Fetch vote totals by candidate
  const { data: votosPorCandidato, isLoading: isLoadingVotos } = useQuery({
    queryKey: ["tse-votos-candidato", selectedEleicao, selectedCargo, selectedUF],
    queryFn: async () => {
      if (!selectedEleicao) return [];

      // Get candidates with their votes
      let candidatosQuery = supabase
        .from("tse_candidatos")
        .select(`
          id,
          nome_urna,
          numero_urna,
          situacao,
          partido:tse_partidos(sigla, cor_hex)
        `)
        .eq("eleicao_id", selectedEleicao)
        .eq("uf", selectedUF);

      if (selectedCargo && selectedCargo !== "all") {
        candidatosQuery = candidatosQuery.eq("cargo_id", selectedCargo);
      }

      const { data: candidatos, error: candError } = await candidatosQuery;
      if (candError) throw candError;

      // Get votes for these candidates
      const candidatoIds = candidatos?.map(c => c.id) || [];
      if (!candidatoIds.length) return [];

      const { data: votos, error: votosError } = await supabase
        .from("tse_votos")
        .select("candidato_id, quantidade")
        .in("candidato_id", candidatoIds);

      if (votosError) throw votosError;

      // Aggregate votes by candidate
      const votosPorCandidatoMap: Record<string, number> = {};
      votos?.forEach(v => {
        votosPorCandidatoMap[v.candidato_id] = (votosPorCandidatoMap[v.candidato_id] || 0) + v.quantidade;
      });

      // Combine and sort
      const result = candidatos?.map(c => ({
        nome: c.nome_urna,
        numero: c.numero_urna,
        partido: c.partido?.sigla || "",
        cor: c.partido?.cor_hex || "#666666",
        votos: votosPorCandidatoMap[c.id] || 0,
        situacao: c.situacao,
      })).sort((a, b) => b.votos - a.votos);

      return result || [];
    },
    enabled: !!selectedEleicao,
  });

  // Fetch votes by party
  const { data: votosPorPartido, isLoading: isLoadingPartidos } = useQuery({
    queryKey: ["tse-votos-partido", selectedEleicao, selectedUF],
    queryFn: async () => {
      if (!selectedEleicao) return [];

      // Get all candidates for this election
      const { data: candidatos, error: candError } = await supabase
        .from("tse_candidatos")
        .select(`
          id,
          partido:tse_partidos(id, sigla, cor_hex)
        `)
        .eq("eleicao_id", selectedEleicao)
        .eq("uf", selectedUF);

      if (candError) throw candError;

      const candidatoIds = candidatos?.map(c => c.id) || [];
      if (!candidatoIds.length) return [];

      // Get votes
      const { data: votos, error: votosError } = await supabase
        .from("tse_votos")
        .select("candidato_id, quantidade")
        .in("candidato_id", candidatoIds);

      if (votosError) throw votosError;

      // Build candidato -> partido map
      const candidatoPartido: Record<string, { sigla: string; cor: string }> = {};
      candidatos?.forEach(c => {
        if (c.partido) {
          candidatoPartido[c.id] = {
            sigla: c.partido.sigla,
            cor: c.partido.cor_hex || "#666666",
          };
        }
      });

      // Aggregate by party
      const votosPorPartidoMap: Record<string, { votos: number; cor: string }> = {};
      votos?.forEach(v => {
        const partido = candidatoPartido[v.candidato_id];
        if (partido) {
          if (!votosPorPartidoMap[partido.sigla]) {
            votosPorPartidoMap[partido.sigla] = { votos: 0, cor: partido.cor };
          }
          votosPorPartidoMap[partido.sigla].votos += v.quantidade;
        }
      });

      // Convert to array and sort
      return Object.entries(votosPorPartidoMap)
        .map(([sigla, data]) => ({
          partido: sigla,
          votos: data.votos,
          cor: data.cor,
        }))
        .sort((a, b) => b.votos - a.votos)
        .slice(0, 15); // Top 15 parties
    },
    enabled: !!selectedEleicao,
  });

  // Calculate totals
  const totalVotos = votosPorCandidato?.reduce((sum, c) => sum + c.votos, 0) || 0;
  const top5Candidatos = votosPorCandidato?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros de Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
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
                  {eleicoes.map(eleicao => (
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
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      {selectedEleicao ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Candidates Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Candidatos Mais Votados</CardTitle>
              <CardDescription>
                Top 10 candidatos por número de votos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingVotos ? (
                <Skeleton className="h-[300px] w-full" />
              ) : votosPorCandidato?.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={votosPorCandidato.slice(0, 10)}
                    layout="vertical"
                    margin={{ left: 100 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => v.toLocaleString("pt-BR")} />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={90}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString("pt-BR"), "Votos"]}
                    />
                    <Bar dataKey="votos" radius={[0, 4, 4, 0]}>
                      {votosPorCandidato.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vote Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição de Votos</CardTitle>
              <CardDescription>
                Percentual de votos por candidato (top 5)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingVotos ? (
                <Skeleton className="h-[300px] w-full" />
              ) : top5Candidatos.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={top5Candidatos}
                      dataKey="votos"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ nome, percent }) => `${nome}: ${(percent * 100).toFixed(1)}%`}
                      labelLine={false}
                    >
                      {top5Candidatos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString("pt-BR"), "Votos"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Votes by Party */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Votos por Partido</CardTitle>
              <CardDescription>
                Total de votos recebidos por partido (top 15)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPartidos ? (
                <Skeleton className="h-[300px] w-full" />
              ) : votosPorPartido?.length ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={votosPorPartido}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="partido" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => v.toLocaleString("pt-BR")} />
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString("pt-BR"), "Votos"]}
                    />
                    <Bar dataKey="votos" radius={[4, 4, 0, 0]}>
                      {votosPorPartido.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Resumo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {totalVotos.toLocaleString("pt-BR")}
                  </div>
                  <div className="text-sm text-muted-foreground">Total de Votos</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {votosPorCandidato?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Candidatos</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {votosPorPartido?.length || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Partidos</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">
                    {votosPorCandidato?.[0]?.nome || "-"}
                  </div>
                  <div className="text-sm text-muted-foreground">Mais Votado</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Selecione uma eleição para visualizar as análises
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
