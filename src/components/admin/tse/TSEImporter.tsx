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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Download, CheckCircle2, Clock, AlertCircle, Loader2, RefreshCw, Info, Upload, CloudDownload, PlayCircle, MoreHorizontal } from "lucide-react";
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
  file_path: string | null;
  current_batch: number | null;
}

interface ResumeData {
  ano: number;
  uf: string;
  filePath: string;
  resumeFromLine: number;
  tipoArquivo: "votacao_secao" | "totalizacao";
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
  const [resumeData, setResumeData] = useState<ResumeData | undefined>();
  const [importProgress, setImportProgress] = useState<{
    ano: number;
    progress: number;
    message: string;
  } | null>(null);

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

  const handleContinueImport = (importData: Importacao) => {
    if (!importData.file_path) {
      toast({ 
        title: "Erro", 
        description: "Caminho do arquivo não encontrado. Faça um novo upload.", 
        variant: "destructive" 
      });
      return;
    }
    setResumeData({
      ano: importData.ano,
      uf: selectedUF,
      filePath: importData.file_path,
      resumeFromLine: importData.current_batch || 0,
      tipoArquivo: importData.tipo_arquivo as "votacao_secao" | "totalizacao",
    });
    setShowUploadModal(true);
  };

  const handleResetImport = async (ano: number) => {
    const { error } = await supabase
      .from("tse_importacoes")
      .update({ 
        status: "pendente", 
        registros_importados: 0, 
        total_registros: null, 
        current_batch: null,
        erro_mensagem: null
      })
      .eq("ano", ano)
      .eq("uf", selectedUF);
    
    if (error) {
      toast({ 
        title: "Erro ao resetar", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Import resetado", 
        description: `Import de ${ano} foi resetado para pendente.` 
      });
      onRefetch();
    }
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
    // Auto-download is disabled due to memory limits in Edge Functions
    // TSE files are often 100MB+ which exceeds the ~150MB limit
    toast({
      title: "Download Automático Indisponível",
      description: (
        <div className="space-y-2">
          <p>Os arquivos do TSE são muito grandes (100MB+) para download automático.</p>
          <p className="font-medium">Use o "Upload Manual" com arquivo baixado diretamente do TSE.</p>
        </div>
      ),
      variant: "destructive",
    });
    
    // Open the TSE portal in a new tab for manual download
    window.open(
      `https://dadosabertos.tse.jus.br/dataset/resultados-${ano}`,
      "_blank"
    );
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
              <strong>Fluxo recomendado:</strong> Clique no ícone <CloudDownload className="h-3 w-3 inline mx-1" /> para abrir o portal TSE, baixe o arquivo CSV, e depois use <strong>Upload Manual</strong>.
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
                      disabled={isDisabled}
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
                      {importData?.status === "erro" && importData?.erro_mensagem && (
                        <p className="text-xs text-destructive mt-1">
                          {importData.erro_mensagem.includes("bloqueado") ? (
                            <>
                              Bloqueado pelo TSE.{" "}
                              <a 
                                href={`https://dadosabertos.tse.jus.br/dataset/resultados-${anoData.ano}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline hover:text-destructive/80"
                              >
                                Baixe aqui
                              </a>
                              {" "}e use "Upload CSV".
                            </>
                          ) : importData.erro_mensagem}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Continue button for stuck processing */}
                    {status === "processando" && importData && importData.registros_importados > 0 && importData.file_path && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleContinueImport(importData)}
                          disabled={isImporting}
                          className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Continuar
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleResetImport(anoData.ano)}
                              className="text-destructive"
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resetar para Pendente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                    {status !== "concluido" && status !== "processando" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAutoDownload(anoData.ano)}
                        disabled={isImporting}
                        title="Abrir portal TSE para download manual"
                      >
                        <CloudDownload className="h-4 w-4" />
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
        onOpenChange={(open) => {
          setShowUploadModal(open);
          if (!open) setResumeData(undefined);
        }}
        selectedUF={selectedUF}
        onSuccess={onRefetch}
        anosEleitorais={anosEleitorais}
        resumeData={resumeData}
      />
    </div>
  );
}
