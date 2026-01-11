import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, MapPin, BarChart3, Download } from "lucide-react";
import TSEImporter from "@/components/admin/tse/TSEImporter";
import TSEMap from "@/components/admin/tse/TSEMap";
import TSEAnalysis from "@/components/admin/tse/TSEAnalysis";

const ESTADOS_BRASIL = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
];

const ANOS_ELEITORAIS = [
  { ano: 2024, tipo: "municipal", descricao: "Eleições Municipais 2024" },
  { ano: 2022, tipo: "federal", descricao: "Eleições Gerais 2022" },
  { ano: 2020, tipo: "municipal", descricao: "Eleições Municipais 2020" },
  { ano: 2018, tipo: "federal", descricao: "Eleições Gerais 2018" },
  { ano: 2016, tipo: "municipal", descricao: "Eleições Municipais 2016" },
  { ano: 2014, tipo: "federal", descricao: "Eleições Gerais 2014" },
  { ano: 2012, tipo: "municipal", descricao: "Eleições Municipais 2012" },
  { ano: 2010, tipo: "federal", descricao: "Eleições Gerais 2010" },
];

export default function AdminTSE() {
  const [selectedUF, setSelectedUF] = useState("PR");
  const [activeTab, setActiveTab] = useState("importar");

  // Fetch import status for selected state
  const { data: importacoes, refetch: refetchImportacoes } = useQuery({
    queryKey: ["tse-importacoes", selectedUF],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tse_importacoes")
        .select("*")
        .eq("uf", selectedUF)
        .order("ano", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch elections data
  const { data: eleicoes } = useQuery({
    queryKey: ["tse-eleicoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tse_eleicoes")
        .select("*")
        .order("ano", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch vote statistics
  const { data: voteStats } = useQuery({
    queryKey: ["tse-vote-stats", selectedUF],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tse_votos")
        .select("eleicao_id, quantidade")
        .eq("uf", selectedUF);

      if (error) throw error;
      
      const totalVotes = data?.reduce((sum, v) => sum + (v.quantidade || 0), 0) || 0;
      return { totalVotes, recordCount: data?.length || 0 };
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="h-6 w-6" />
            Dados Eleitorais TSE
          </h1>
          <p className="text-muted-foreground">
            Importação, visualização e análise de dados eleitorais históricos do TSE (2010-2024)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estado Selecionado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ESTADOS_BRASIL.find(e => e.sigla === selectedUF)?.nome || selectedUF}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Anos Importados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {importacoes?.filter(i => i.status === "concluido").length || 0} / {ANOS_ELEITORAIS.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Votos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {voteStats?.totalVotes?.toLocaleString("pt-BR") || "0"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {voteStats?.recordCount?.toLocaleString("pt-BR") || "0"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="importar" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Importar
          </TabsTrigger>
          <TabsTrigger value="mapa" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Mapa
          </TabsTrigger>
          <TabsTrigger value="analise" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="importar" className="mt-6">
          <TSEImporter
            estados={ESTADOS_BRASIL}
            anosEleitorais={ANOS_ELEITORAIS}
            selectedUF={selectedUF}
            onSelectUF={setSelectedUF}
            importacoes={importacoes || []}
            onRefetch={refetchImportacoes}
          />
        </TabsContent>

        <TabsContent value="mapa" className="mt-6">
          <TSEMap
            estados={ESTADOS_BRASIL}
            selectedUF={selectedUF}
            onSelectUF={setSelectedUF}
            eleicoes={eleicoes || []}
          />
        </TabsContent>

        <TabsContent value="analise" className="mt-6">
          <TSEAnalysis
            estados={ESTADOS_BRASIL}
            selectedUF={selectedUF}
            onSelectUF={setSelectedUF}
            eleicoes={eleicoes || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
