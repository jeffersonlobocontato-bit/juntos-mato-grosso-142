import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";

interface TSEUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUF: string;
  onSuccess: () => void;
  anosEleitorais: { ano: number; tipo: string; descricao: string }[];
}

type UploadStep = "select" | "uploading" | "processing" | "complete" | "error";

export default function TSEUploadModal({
  open,
  onOpenChange,
  selectedUF,
  onSuccess,
  anosEleitorais,
}: TSEUploadModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedAno, setSelectedAno] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("select");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [stats, setStats] = useState<{
    candidatos: number;
    votos: number;
    locais: number;
  } | null>(null);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Required columns for TSE CSV files
  const REQUIRED_COLUMNS = [
    "NR_TURNO", "CD_CARGO", "NR_PARTIDO", "SG_PARTIDO", 
    "NR_VOTAVEL", "NM_VOTAVEL", "QT_VOTOS", "CD_MUNICIPIO",
    "NR_ZONA", "SG_UF"
  ];

  const validateCSV = async (file: File): Promise<{ valid: boolean; errors: string[]; preview: string[] }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const errors: string[] = [];

        if (lines.length < 2) {
          errors.push("Arquivo vazio ou sem dados");
          resolve({ valid: false, errors, preview: [] });
          return;
        }

        // Parse header (handle BOM and different encodings)
        const headerLine = lines[0].replace(/^\ufeff/, "").trim();
        const headers = headerLine.split(";").map(h => h.replace(/"/g, "").trim().toUpperCase());

        // Check for required columns
        const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
          errors.push(`Colunas obrigatórias não encontradas: ${missingColumns.join(", ")}`);
        }

        // Validate first few data rows
        const dataLines = lines.slice(1, 6).filter(l => l.trim());
        if (dataLines.length === 0) {
          errors.push("Nenhuma linha de dados encontrada");
        } else {
          // Check if delimiter is semicolon
          const firstDataLine = dataLines[0];
          const columnCount = firstDataLine.split(";").length;
          if (columnCount < 5) {
            errors.push("Formato inválido: verifique se o delimitador é ponto-e-vírgula (;)");
          }
        }

        // Preview info
        const preview = [
          `Colunas encontradas: ${headers.length}`,
          `Linhas de dados: ~${lines.length - 1}`,
          `Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
        ];

        resolve({ valid: errors.length === 0, errors, preview });
      };
      reader.onerror = () => {
        resolve({ valid: false, errors: ["Erro ao ler arquivo"], preview: [] });
      };
      // Read first 50KB for validation
      reader.readAsText(file.slice(0, 50000));
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo CSV.",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setValidationErrors([]);

      // Validate CSV structure
      const validation = await validateCSV(file);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        toast({
          title: "Problemas no arquivo",
          description: "Verifique os erros de validação antes de continuar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Arquivo válido",
          description: validation.preview.join(" | "),
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedAno) {
      toast({
        title: "Dados incompletos",
        description: "Selecione o ano e o arquivo CSV.",
        variant: "destructive",
      });
      return;
    }

    if (validationErrors.length > 0) {
      toast({
        title: "Arquivo com erros",
        description: "Corrija os erros de validação antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setStep("uploading");
      setProgress(10);
      setProgressMessage("Enviando arquivo...");

      // Upload file to storage
      const filePath = `${selectedUF}/${selectedAno}/${Date.now()}_${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("tse-csv")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      setProgress(30);
      setProgressMessage("Arquivo enviado. Iniciando processamento...");
      setStep("processing");

      // Call edge function to process
      const { data, error } = await supabase.functions.invoke("tse-process-csv", {
        body: {
          ano: parseInt(selectedAno),
          uf: selectedUF,
          filePath,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setProgress(100);
        setProgressMessage("Importação concluída!");
        setStats(data.stats);
        setStep("complete");
        
        toast({
          title: "Importação concluída",
          description: `${data.stats?.votos?.toLocaleString("pt-BR") || 0} votos importados.`,
        });
        
        onSuccess();
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setStep("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro ao processar arquivo");
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const resetModal = () => {
    setSelectedFile(null);
    setSelectedAno("");
    setStep("select");
    setProgress(0);
    setProgressMessage("");
    setErrorMessage("");
    setStats(null);
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de CSV do TSE
          </DialogTitle>
          <DialogDescription>
            Faça upload de arquivos CSV baixados diretamente do repositório do TSE
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === "select" && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Baixe os arquivos em{" "}
                  <a
                    href="https://dadosabertos.tse.jus.br/dataset/?groups=resultados"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    dadosabertos.tse.jus.br
                  </a>
                  . Selecione "Votação por Seção Eleitoral".
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={selectedUF} disabled />
              </div>

              <div className="space-y-2">
                <Label>Ano da Eleição</Label>
                <Select value={selectedAno} onValueChange={setSelectedAno}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {anosEleitorais.map(ano => (
                      <SelectItem key={ano.ano} value={ano.ano.toString()}>
                        {ano.ano} - {ano.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Arquivo CSV</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    selectedFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar ou arraste o arquivo CSV
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-1">Erros de validação:</div>
                    <ul className="list-disc list-inside text-sm">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !selectedAno || validationErrors.length > 0}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Iniciar Importação
                </Button>
              </div>
            </>
          )}

          {(step === "uploading" || step === "processing") && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <h3 className="font-semibold mb-2">
                {step === "uploading" ? "Enviando arquivo..." : "Processando dados..."}
              </h3>
              <Progress value={progress} className="mb-2" />
              <p className="text-sm text-muted-foreground">{progressMessage}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Isso pode levar alguns minutos dependendo do tamanho do arquivo.
              </p>
            </div>
          )}

          {step === "complete" && (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="font-semibold mb-2 text-lg">Importação Concluída!</h3>
              
              {stats && (
                <div className="grid grid-cols-3 gap-4 mt-4 mb-6">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{stats.candidatos.toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">Candidatos</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{stats.locais.toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">Locais</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{stats.votos.toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">Votos</div>
                  </div>
                </div>
              )}

              <Button onClick={handleClose}>Fechar</Button>
            </div>
          )}

          {step === "error" && (
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="font-semibold mb-2 text-lg">Erro na Importação</h3>
              <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Fechar
                </Button>
                <Button onClick={resetModal}>Tentar Novamente</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
