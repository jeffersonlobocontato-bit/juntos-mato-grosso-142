import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw, Info, Upload, CloudDownload } from "lucide-react";
import TSEUploadModal from "./TSEUploadModal";

interface Estado {
  sigla: string;
  nome: string;
}

interface AnoEleitoral {
  ano: number;
  tipo: string;
  descricao: string;
}

interface Importacao {
  id: string;
  ano: number;
  uf: string;
  tipo_arquivo: string;
  status: string;
  registros_importados: number;
  total_registros: number | null;
  erro_mensagem: string | null;
  created_at: string;
}

interface TSEImporterProps {
  estados: Estado[];
  anosEleitorais: AnoEleitoral[];
  selectedUF: string;
  onSelectUF: (uf: string) => void;
  importacoes: Importacao[];
  onRefetch: () => void;
}

export default function TSEImporter({
  estados,
  anosEleitorais,
  selectedUF,
  onSelectUF,
  importacoes,
  onRefetch,
}: TSEImporterProps) {
  const { toast } = useToast();
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    ano: number;
    progress: number;
    message: string;
  } | null>(null);
  const [isAutoDownloading, setIsAutoDownloading] = useState(false);
  const [autoDownloadYear, setAutoDownloadYear] = useState<number | null>(null);

  const getImportStatus = (ano: number) => {
    const importacao = importacoes.find(i => i.ano === ano);
    return importacao?.status || "nao_importado";
  };

  const getImportData = (ano: number) => {
    return importacoes.find(i => i.ano === ano);
  };

  const toggleYear = (ano: number) => {
    setSelectedYears(prev =>
      prev.includes(ano)
        ? prev.filter(y => y !== ano)
        : [...prev, ano]
    );
  };

  const handleImport = async () => {
    if (selectedYears.length === 0) {
      toast({
        title: "Nenhum ano selecionado",
        description: "Selecione pelo menos um ano para importar.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    for (const ano of selectedYears.sort((a, b) => b - a)) {
      try {
        setImportProgress({
          ano,
          progress: 0,
          message: `Iniciando importação de ${ano}...`,
        });

        const { data, error } = await supabase.functions.invoke("tse-import", {
          body: { ano, uf: selectedUF },
        });

        if (error) throw error;

        setImportProgress({
          ano,
          progress: 100,
          message: `Importação de ${ano} concluída!`,
        });

        toast({
          title: "Importação concluída",
          description: `Dados de ${ano} para ${selectedUF} importados com sucesso.`,
        });

        onRefetch();
      } catch (error) {
        console.error(`Error importing ${ano}:`, error);
        toast({
          title: "Erro na importação",
          description: `Falha ao importar dados de ${ano}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
          variant: "destructive",
        });
      }
    }

    setIsImporting(false);
    setImportProgress(null);
    setSelectedYears([]);
  };

  const handleAutoDownload = async (ano: number) => {
    setIsAutoDownloading(true);
    setAutoDownloadYear(ano);
    
    try {
      setImportProgress({
        ano,
        progress: 10,
        message: `Conectando ao TSE para baixar dados de ${ano}...`,
      });

      const { data, error } = await supabase.functions.invoke("tse-auto-download", {
        body: { ano, uf: selectedUF },
      });

      if (error) throw error;

      setImportProgress({
        ano,
        progress: 100,
        message: `Download de ${ano} concluído!`,
      });

      toast({
        title: "Download concluído",
        description: data.message || `Dados de ${ano} para ${selectedUF} baixados do TSE.`,
      });

      onRefetch();
    } catch (error) {
      console.error(`Error downloading ${ano}:`, error);
      toast({
        title: "Erro no download",
        description: `Falha ao baixar dados de ${ano}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        variant: "destructive",
      });
    } finally {
      setIsAutoDownloading(false);
      setAutoDownloadYear(null);
      setImportProgress(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluido":
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Importado
          </Badge>
        );
      case "processando":
        return (
          <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processando
          </Badge>
        );
      case "erro":
        return (
          <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            Não importado
          </Badge>
        );
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* State Selector */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Selecionar Estado</CardTitle>
          <CardDescription>
            Escolha o estado para importar ou visualizar dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedUF} onValueChange={onSelectUF}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um estado" />
            </SelectTrigger>
            <SelectContent>
              {estados.map(estado => (
                <SelectItem key={estado.sigla} value={estado.sigla}>
                  {estado.nome} ({estado.sigla})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Use o <strong>Download Automático</strong> para baixar diretamente do TSE ou <strong>Upload Manual</strong> para arquivos CSV locais.
            </AlertDescription>
          </Alert>

          <div className="space-y-2 mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Manual de CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Years Selection */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Anos Eleitorais Disponíveis</CardTitle>
            <CardDescription>
              Selecione os anos que deseja importar para {selectedUF}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefetch}
            disabled={isImporting}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {anosEleitorais.map(anoData => {
              const status = getImportStatus(anoData.ano);
              const importData = getImportData(anoData.ano);
              const isDisabled = status === "concluido" || status === "processando" || isImporting;

              return (
                <div
                  key={anoData.ano}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    selectedYears.includes(anoData.ano)
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`ano-${anoData.ano}`}
                      checked={selectedYears.includes(anoData.ano)}
                      onCheckedChange={() => toggleYear(anoData.ano)}
                      disabled={isDisabled || isAutoDownloading}
                    />
                    <div>
                      <label
                        htmlFor={`ano-${anoData.ano}`}
                        className="font-medium cursor-pointer"
                      >
                        {anoData.ano} - {anoData.descricao}
                      </label>
                      {importData?.registros_importados ? (
                        <p className="text-sm text-muted-foreground">
                          {importData.registros_importados.toLocaleString("pt-BR")} registros
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status !== "concluido" && status !== "processando" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAutoDownload(anoData.ano)}
                        disabled={isAutoDownloading || isImporting}
                        title="Baixar automaticamente do TSE"
                      >
                        {isAutoDownloading && autoDownloadYear === anoData.ano ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CloudDownload className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {getStatusBadge(status)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Import Progress */}
          {importProgress && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Importando {importProgress.ano}...</span>
                <span className="text-sm text-muted-foreground">{importProgress.progress}%</span>
              </div>
              <Progress value={importProgress.progress} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">{importProgress.message}</p>
            </div>
          )}

          {/* Import Button */}
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleImport}
              disabled={selectedYears.length === 0 || isImporting}
              className="min-w-[200px]"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Importar Selecionados ({selectedYears.length})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Modal */}
      <TSEUploadModal
        open={showUploadModal}
        onOpenChange={setShowUploadModal}
        selectedUF={selectedUF}
        onSuccess={onRefetch}
        anosEleitorais={anosEleitorais}
      />
    </div>
  );
}
