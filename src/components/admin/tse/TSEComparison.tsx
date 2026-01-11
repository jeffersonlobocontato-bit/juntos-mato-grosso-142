import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

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

interface TSEComparisonProps {
  estados: Estado[];
  selectedUF: string;
  onSelectUF: (uf: string) => void;
  eleicoes: Eleicao[];
}

const CHART_COLORS = {
  eleicao1: "#3b82f6",
  eleicao2: "#f59e0b",
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#6b7280",
};

export default function TSEComparison({
  estados,
  selectedUF,
  onSelectUF,
  eleicoes,
}: TSEComparisonProps) {
  const [eleicao1, setEleicao1] = useState<string>("");
  const [eleicao2, setEleicao2] = useState<string>("");
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

  // Fetch comparison data
  const { data: comparisonData, isLoading } = useQuery({
    queryKey: ["tse-comparison", eleicao1, eleicao2, selectedCargo, selectedUF],
    queryFn: async () => {
      if (!eleicao1 || !eleicao2) return null;

      // Get candidates and votes for election 1
      const getVotesForElection = async (eleicaoId: string) => {
        let candidatosQuery = supabase
          .from("tse_candidatos")
          .select(`
            id,
            nome_urna,
            numero_urna,
            partido:tse_partidos(sigla, cor_hex)
          `)
          .eq("eleicao_id", eleicaoId)
          .eq("uf", selectedUF);

        if (selectedCargo && selectedCargo !== "all") {
          candidatosQuery = candidatosQuery.eq("cargo_id", selectedCargo);
        }

        const { data: candidatos, error: candError } = await candidatosQuery;
        if (candError) throw candError;

        const candidatoIds = candidatos?.map(c => c.id) || [];
        if (!candidatoIds.length) return { candidatos: [], votosPorCandidato: {} };

        const { data: votos, error: votosError } = await supabase
          .from("tse_votos")
          .select("candidato_id, quantidade")
          .in("candidato_id", candidatoIds);

        if (votosError) throw votosError;

        const votosPorCandidato: Record<string, number> = {};
        votos?.forEach(v => {
          votosPorCandidato[v.candidato_id] = (votosPorCandidato[v.candidato_id] || 0) + v.quantidade;
        });

        return {
          candidatos: candidatos || [],
          votosPorCandidato,
        };
      };

      const [data1, data2] = await Promise.all([
        getVotesForElection(eleicao1),
        getVotesForElection(eleicao2),
      ]);

      // Find common candidates by name (approximation)
      const candidatosMap1: Record<string, { votos: number; partido: string; cor: string }> = {};
      data1.candidatos.forEach(c => {
        candidatosMap1[c.nome_urna] = {
          votos: data1.votosPorCandidato[c.id] || 0,
          partido: c.partido?.sigla || "",
          cor: c.partido?.cor_hex || "#666",
        };
      });

      const candidatosMap2: Record<string, { votos: number; partido: string; cor: string }> = {};
      data2.candidatos.forEach(c => {
        candidatosMap2[c.nome_urna] = {
          votos: data2.votosPorCandidato[c.id] || 0,
          partido: c.partido?.sigla || "",
          cor: c.partido?.cor_hex || "#666",
        };
      });

      // Combine and create comparison
      const allNames = new Set([...Object.keys(candidatosMap1), ...Object.keys(candidatosMap2)]);
      const comparison = Array.from(allNames).map(nome => {
        const votos1 = candidatosMap1[nome]?.votos || 0;
        const votos2 = candidatosMap2[nome]?.votos || 0;
        const partido = candidatosMap1[nome]?.partido || candidatosMap2[nome]?.partido || "";
        const cor = candidatosMap1[nome]?.cor || candidatosMap2[nome]?.cor || "#666";
        const variacao = votos1 > 0 ? ((votos2 - votos1) / votos1) * 100 : 0;

        return {
          nome,
          partido,
          cor,
          votos1,
          votos2,
          variacao,
        };
      }).filter(c => c.votos1 > 0 || c.votos2 > 0)
        .sort((a, b) => Math.max(b.votos1, b.votos2) - Math.max(a.votos1, a.votos2))
        .slice(0, 10);

      // Calculate totals
      const total1 = Object.values(data1.votosPorCandidato).reduce((sum, v) => sum + v, 0);
      const total2 = Object.values(data2.votosPorCandidato).reduce((sum, v) => sum + v, 0);

      return {
        comparison,
        totals: { total1, total2 },
        eleicao1Info: eleicoes.find(e => e.id === eleicao1),
        eleicao2Info: eleicoes.find(e => e.id === eleicao2),
      };
    },
    enabled: !!eleicao1 && !!eleicao2,
  });

  const getVariacaoIcon = (variacao: number) => {
    if (variacao > 5) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (variacao < -5) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getVariacaoBadge = (variacao: number) => {
    const color = variacao > 5 ? "bg-green-500/20 text-green-700" : 
                  variacao < -5 ? "bg-red-500/20 text-red-700" : 
                  "bg-gray-500/20 text-gray-700";
    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {getVariacaoIcon(variacao)}
        {variacao > 0 ? "+" : ""}{variacao.toFixed(1)}%
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análise Comparativa</CardTitle>
          <CardDescription>
            Compare resultados entre duas eleições diferentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={selectedUF} onValueChange={onSelectUF}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
              <Label>Eleição Base</Label>
              <Select value={eleicao1} onValueChange={setEleicao1}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
              <Label>Eleição Comparação</Label>
              <Select value={eleicao2} onValueChange={setEleicao2}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {eleicoes.filter(e => e.id !== eleicao1).map(eleicao => (
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
                  <SelectValue placeholder="Todos" />
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

      {/* Comparison Results */}
      {eleicao1 && eleicao2 ? (
        isLoading ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[400px]" />
            <Skeleton className="h-[400px]" />
          </div>
        ) : comparisonData?.comparison.length ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {comparisonData.eleicao1Info?.ano} - Total de Votos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {comparisonData.totals.total1.toLocaleString("pt-BR")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    {comparisonData.eleicao2Info?.ano} - Total de Votos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {comparisonData.totals.total2.toLocaleString("pt-BR")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Variação Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {comparisonData.totals.total1 > 0 && (
                      getVariacaoBadge(
                        ((comparisonData.totals.total2 - comparisonData.totals.total1) / 
                         comparisonData.totals.total1) * 100
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Side by Side Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Comparativo de Votos por Candidato
                </CardTitle>
                <CardDescription>
                  Top 10 candidatos - {comparisonData.eleicao1Info?.ano} vs {comparisonData.eleicao2Info?.ano}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={comparisonData.comparison}
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
                      formatter={(value: number, name: string) => [
                        value.toLocaleString("pt-BR"),
                        name === "votos1" ? comparisonData.eleicao1Info?.ano : comparisonData.eleicao2Info?.ano,
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        value === "votos1"
                          ? `${comparisonData.eleicao1Info?.ano}`
                          : `${comparisonData.eleicao2Info?.ano}`
                      }
                    />
                    <Bar dataKey="votos1" fill={CHART_COLORS.eleicao1} name="votos1" />
                    <Bar dataKey="votos2" fill={CHART_COLORS.eleicao2} name="votos2" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Variation Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Variação Percentual</CardTitle>
                <CardDescription>
                  Evolução de votos entre as eleições
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {comparisonData.comparison.map((item, index) => (
                    <div
                      key={item.nome}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {index + 1}º
                        </span>
                        <div>
                          <div className="font-medium">{item.nome}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.partido}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-blue-600">
                            {item.votos1.toLocaleString("pt-BR")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {comparisonData.eleicao1Info?.ano}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-amber-600">
                            {item.votos2.toLocaleString("pt-BR")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {comparisonData.eleicao2Info?.ano}
                          </div>
                        </div>
                        {getVariacaoBadge(item.variacao)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum dado encontrado para comparação
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecione duas eleições para comparar os resultados
          </CardContent>
        </Card>
      )}
    </div>
  );
}
