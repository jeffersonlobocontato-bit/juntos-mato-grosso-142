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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || !selectedAno}
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
