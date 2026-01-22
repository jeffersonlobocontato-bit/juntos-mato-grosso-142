import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { unzipSync, strFromU8 } from "fflate";
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
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Info, FileArchive, Download, ExternalLink } from "lucide-react";

interface ResumeData {
  ano: number;
  uf: string;
  filePath: string;
  resumeFromLine: number;
  tipoArquivo: "votacao_secao" | "totalizacao";
}

interface TSEUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedUF: string;
  onSuccess: () => void;
  anosEleitorais: { ano: number; tipo: string; descricao: string }[];
  resumeData?: ResumeData;
}

type UploadStep = "select" | "extracting" | "uploading" | "processing" | "complete" | "error";

interface ExtractedFile {
  name: string;
  content: string;
  rawBytes?: Uint8Array;      // For large files - keep original bytes for upload
  originalSize: number;
  extractedSize: number;
  isPartialContent?: boolean; // True if content is only a preview (large files)
}

export default function TSEUploadModal({
  open,
  onOpenChange,
  selectedUF,
  onSuccess,
  anosEleitorais,
  resumeData,
}: TSEUploadModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedAno, setSelectedAno] = useState<string>("");
  const [selectedTipoArquivo, setSelectedTipoArquivo] = useState<"votacao_secao" | "totalizacao">("votacao_secao");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedFile, setExtractedFile] = useState<ExtractedFile | null>(null);
  const [isZipFile, setIsZipFile] = useState(false);
  const [step, setStep] = useState<UploadStep>("select");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [stats, setStats] = useState<{
    candidatos?: number;
    votos?: number;
    locais?: number;
    resultados?: number;
    partidos?: number;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Maximum file size: 2GB to support large TSE files
  // Large files use partial decoding for validation + raw bytes for upload
  const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  
  // Patterns indicating incorrect file types
  const INVALID_FILE_PATTERNS = ["bu_imgbu", "logjez", "rdv", "imgbu", "_jez_", "vscmr"];
  
  // Required columns for TSE CSV files - votacao_secao
  // Based on actual TSE file structure (votacao_secao_YYYY_UF.csv)
  const REQUIRED_COLUMNS_VOTACAO = [
    "NR_TURNO", "CD_CARGO", "NR_VOTAVEL", "NM_VOTAVEL", 
    "QT_VOTOS", "CD_MUNICIPIO", "NR_ZONA", "SG_UF"
  ];

  // Required columns for TSE CSV files - totalizacao
  // Based on actual TSE file structure (Resultado_Totalizacao_YYYY_UF.csv)
  const REQUIRED_COLUMNS_TOTALIZACAO = [
    "NR_TURNO", "CD_CARGO", "NR_VOTAVEL", 
    "QT_VOTOS", "CD_MUNICIPIO", "SG_UF"
  ];

  // Get required columns based on file type
  const getRequiredColumns = () => {
    return selectedTipoArquivo === "totalizacao" 
      ? REQUIRED_COLUMNS_TOTALIZACAO 
      : REQUIRED_COLUMNS_VOTACAO;
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Resume processing when resumeData is provided
  useEffect(() => {
    if (open && resumeData) {
      // Configure initial state for resume mode
      setSelectedAno(resumeData.ano.toString());
      setSelectedTipoArquivo(resumeData.tipoArquivo);
      setStep("processing");
      setProgress(30);
      setProgressMessage(`Retomando processamento da linha ${resumeData.resumeFromLine.toLocaleString("pt-BR")}...`);
      
      // Start resume processing
      resumeProcessing(resumeData);
    }
  }, [open, resumeData]);

  // Resume processing function - reuses chunk logic without upload
  const resumeProcessing = async (data: ResumeData) => {
    try {
      const interval = startProgressPolling(data.ano.toString(), data.uf, data.tipoArquivo);

      const edgeFunctionName = data.tipoArquivo === "totalizacao" 
        ? "tse-process-totalizacao" 
        : "tse-process-csv";
      
      let resumeFromLine = data.resumeFromLine;
      let chunkCount = 0;
      const maxChunks = 200;
      
      while (chunkCount < maxChunks) {
        chunkCount++;
        console.log(`[TSE Resume] Processing chunk ${chunkCount}, resuming from line ${resumeFromLine}`);
        setProgressMessage(`Retomando... chunk ${chunkCount}, linha ${resumeFromLine.toLocaleString("pt-BR")}`);
        
        const { data: result, error } = await supabase.functions.invoke(edgeFunctionName, {
          body: {
            ano: data.ano,
            uf: data.uf,
            filePath: data.filePath,
            resumeFromLine,
          },
        });

        console.log("[TSE Resume] Resposta do chunk:", { result, error, chunkCount });

        if (error) {
          console.error("[TSE Resume] Erro na Edge Function:", error);
          throw new Error(`Erro no processamento: ${error.message}`);
        }

        if (!result?.success) {
          const errorDetail = result?.error || result?.message || "Erro desconhecido no processamento";
          console.error("[TSE Resume] Processamento falhou:", result);
          throw new Error(errorDetail);
        }

        // Check if we need to continue processing
        if (result.shouldContinue && result.lastProcessedLine > resumeFromLine) {
          resumeFromLine = result.lastProcessedLine;
          setProgressMessage(`Processando... ${result.totalVotesInserted?.toLocaleString("pt-BR") || 0} votos (chunk ${chunkCount})`);
          setProgress(Math.min(30 + (chunkCount * 2), 95));
          
          // Small delay between chunks to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // Processing complete
        if (interval) {
          clearInterval(interval);
          setPollingInterval(null);
        }

        setProgress(100);
        setProgressMessage("Retomada concluída!");
        setStats({
          votos: result.totalVotesInserted,
        });
        setStep("complete");
        
        toast({
          title: "Retomada concluída",
          description: `${result.totalVotesInserted?.toLocaleString("pt-BR") || 0} votos importados em ${chunkCount} chunk(s).`,
        });
        
        onSuccess();
        break;
      }

      if (chunkCount >= maxChunks) {
        throw new Error("Limite de chunks atingido. O arquivo pode ser muito grande.");
      }
    } catch (error) {
      console.error("[TSE Resume] Erro completo:", error);
      
      // Stop polling if still running
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      setStep("error");
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido na retomada");
      
      toast({
        title: "Erro na retomada",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Generate direct download URL for TSE files
  const getDirectDownloadUrl = (ano: string, uf: string, tipo: "votacao_secao" | "totalizacao"): string => {
    if (tipo === "totalizacao") {
      return `https://cdn.tse.jus.br/estatistica/sead/odsele/relatorio_resultado_totalizacao/Relatorio_Resultado_Totalizacao_${ano}_${uf}.zip`;
    }
    // votacao_secao
    return `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_${ano}_${uf}.zip`;
  };

  const getExpectedFileName = (ano: string, uf: string, tipo: "votacao_secao" | "totalizacao"): string => {
    if (tipo === "totalizacao") {
      return `Relatorio_Resultado_Totalizacao_${ano}_${uf}.zip`;
    }
    return `votacao_secao_${ano}_${uf}.zip`;
  };

  // Convert Latin-1 (ISO-8859-1) bytes to UTF-8 string
  const decodeLatinToUtf8 = (bytes: Uint8Array): string => {
    // Try UTF-8 first (some newer TSE files might be UTF-8)
    try {
      const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
      const result = utf8Decoder.decode(bytes);
      // If it contains the expected characters, it's likely UTF-8
      if (result.includes('NR_TURNO') || result.includes('VOTACAO')) {
        console.log("[TSE] File detected as UTF-8");
        return result;
      }
    } catch {
      // Not valid UTF-8, try Latin-1
    }
    
    // Decode as Latin-1 (ISO-8859-1)
    const latin1Decoder = new TextDecoder('iso-8859-1');
    const result = latin1Decoder.decode(bytes);
    console.log("[TSE] File decoded as Latin-1 (ISO-8859-1)");
    return result;
  };

  // Extract CSV from ZIP file
  // OPTIMIZED: For large files (>100MB), only decode first 100KB for validation
  // and keep raw bytes for direct upload to avoid browser memory crash
  const extractZipFile = async (file: File): Promise<ExtractedFile> => {
    console.log("[TSE] Starting ZIP extraction:", file.name, file.size);
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Decompress the ZIP
    const unzipped = unzipSync(uint8Array);
    
    // Find the main CSV file (usually votacao_secao*.csv or similar)
    const fileNames = Object.keys(unzipped);
    console.log("[TSE] Files in ZIP:", fileNames);
    
    // Priority: votacao_secao, then any CSV, or totalizacao files
    let targetFile = fileNames.find(name => 
      name.toLowerCase().includes('votacao_secao') && name.endsWith('.csv')
    );
    
    if (!targetFile) {
      targetFile = fileNames.find(name => 
        name.toLowerCase().includes('resultado_totalizacao') && name.endsWith('.csv')
      );
    }
    
    if (!targetFile) {
      targetFile = fileNames.find(name => name.endsWith('.csv'));
    }
    
    if (!targetFile) {
      throw new Error("Nenhum arquivo CSV encontrado no ZIP");
    }
    
    console.log("[TSE] Extracting file:", targetFile);
    
    const csvBytes = unzipped[targetFile];
    const isLargeFile = csvBytes.length > 100 * 1024 * 1024; // > 100MB
    
    console.log(`[TSE] CSV bytes: ${csvBytes.length}, isLarge: ${isLargeFile}`);
    
    if (isLargeFile) {
      // For large files: only decode first 100KB for header validation
      // Keep raw bytes for direct upload to Storage
      console.log("[TSE] Large file detected - using partial decode strategy");
      
      const headerBytes = csvBytes.slice(0, 100000);
      const headerContent = decodeLatinToUtf8(headerBytes);
      
      console.log(`[TSE] Header preview length: ${headerContent.length}`);
      
      return {
        name: targetFile,
        content: headerContent,      // Only first 100KB for validation
        rawBytes: csvBytes,          // Keep full bytes for upload
        originalSize: file.size,
        extractedSize: csvBytes.length,
        isPartialContent: true,
      };
    }
    
    // Normal decode for smaller files
    const csvContent = decodeLatinToUtf8(csvBytes);
    console.log(`[TSE] Full content length: ${csvContent.length}`);
    
    return {
      name: targetFile,
      content: csvContent,
      originalSize: file.size,
      extractedSize: csvBytes.length,
      isPartialContent: false,
    };
  };

  // Validate CSV content (works with both file and string)
  // OPTIMIZED: For large files, only validates first portion to avoid memory crash
  const validateCSVContent = (content: string, fileName: string): { valid: boolean; errors: string[]; preview: string[] } => {
    const errors: string[] = [];
    const contentLength = content.length;
    const isLargeFile = contentLength > 100 * 1024 * 1024; // > 100MB
    
    console.log(`[TSE Validation] Content length: ${contentLength}, isLarge: ${isLargeFile}`);
    
    // For large files, only validate first 100KB to avoid memory issues with split()
    const contentToValidate = isLargeFile ? content.substring(0, 100000) : content;
    const lines = contentToValidate.split("\n");

    // Check if we have at least header + 1 data line
    if (lines.length < 2) {
      // For large files, the split on partial content should still work
      // But let's double check with raw content
      if (contentLength > 1000) {
        const firstNewline = content.indexOf('\n');
        if (firstNewline > 0) {
          // We have content but lines array is weird - try manual parsing
          const headerLine = content.substring(0, firstNewline).replace(/^\ufeff/, "").trim();
          const headers = headerLine.split(";").map(h => h.replace(/"/g, "").trim().toUpperCase());
          
          console.log(`[TSE Validation] Large file fallback - headers found: ${headers.length}`);
          
          // Validate headers
          const requiredCols = getRequiredColumns();
          const missingColumns = requiredCols.filter(col => !headers.includes(col));
          if (missingColumns.length > 0) {
            errors.push(`Colunas obrigatórias não encontradas: ${missingColumns.join(", ")}`);
          }
          
          // Estimate line count from file size (avg ~80 bytes per line for TSE files)
          const estimatedLines = Math.round(contentLength / 80);
          const sizeInMB = (contentLength / 1024 / 1024).toFixed(2);
          
          return {
            valid: errors.length === 0,
            errors,
            preview: [
              `Arquivo: ${fileName}`,
              `Colunas: ${headers.length}`,
              `Linhas: ~${estimatedLines.toLocaleString("pt-BR")} (estimado)`,
              `Tamanho: ${sizeInMB} MB`,
            ]
          };
        }
      }
      errors.push("Arquivo vazio ou sem dados");
      return { valid: false, errors, preview: [] };
    }

    // Parse header (handle BOM and different encodings)
    const headerLine = lines[0].replace(/^\ufeff/, "").trim();
    const headers = headerLine.split(";").map(h => h.replace(/"/g, "").trim().toUpperCase());

    // Check for required columns
    const requiredCols = getRequiredColumns();
    const missingColumns = requiredCols.filter(col => !headers.includes(col));
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

    // Calculate size in MB - for large files use length estimate
    let sizeInMB: string;
    let lineCount: number;
    
    if (isLargeFile) {
      sizeInMB = (contentLength / 1024 / 1024).toFixed(2);
      // Estimate lines from content length
      lineCount = Math.round(contentLength / 80);
    } else {
      sizeInMB = (new TextEncoder().encode(content).length / 1024 / 1024).toFixed(2);
      lineCount = lines.length - 1;
    }

    // Preview info
    const preview = [
      `Arquivo: ${fileName}`,
      `Colunas: ${headers.length}`,
      `Linhas: ~${lineCount.toLocaleString("pt-BR")}${isLargeFile ? ' (estimado)' : ''}`,
      `Tamanho: ${sizeInMB} MB`,
    ];

    return { valid: errors.length === 0, errors, preview };
  };

  const validateCSVFile = async (file: File): Promise<{ valid: boolean; errors: string[]; preview: string[] }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = validateCSVContent(text, file.name);
        // Update size info with actual file size
        result.preview[3] = `Tamanho: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        resolve(result);
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
    if (!file) return;

    const isZip = file.name.toLowerCase().endsWith(".zip");
    const isCsv = file.name.toLowerCase().endsWith(".csv");
    const fileName = file.name.toLowerCase();

    if (!isZip && !isCsv) {
      toast({
        title: "Formato inválido",
        description: "Por favor, selecione um arquivo CSV ou ZIP.",
        variant: "destructive",
      });
      return;
    }

    // Reset state
    setSelectedFile(null);
    setIsZipFile(false);
    setExtractedFile(null);
    setValidationErrors([]);

    // Check for invalid file patterns (BU, logs, etc.)
    const invalidPattern = INVALID_FILE_PATTERNS.find(pattern => fileName.includes(pattern));
    if (invalidPattern) {
      const errors = [
        "Este arquivo contém dados de Boletim de Urna (BU), logs ou outros arquivos auxiliares.",
        "Esses dados NÃO contêm resultados de votação por seção.",
        "Baixe o arquivo correto: votacao_secao_YYYY_UF.zip",
      ];
      setValidationErrors(errors);
      toast({
        title: "Arquivo incorreto",
        description: "Este não é o arquivo de votação por seção. Veja as instruções.",
        variant: "destructive",
      });
      return;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeInMB = (file.size / 1024 / 1024).toFixed(0);
      const limitInMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
      const errors = [
        `Arquivo muito grande: ${sizeInMB}MB (limite: ${limitInMB}MB)`,
        "Arquivos maiores que 500MB podem travar o navegador.",
        "Verifique se você baixou o arquivo correto: votacao_secao_YYYY_UF.zip",
        "Arquivos de BU (bu_imgbu) são muito maiores e contêm dados diferentes.",
      ];
      setValidationErrors(errors);
      toast({
        title: "Arquivo muito grande",
        description: `O limite é ${limitInMB}MB. Verifique se baixou o arquivo correto.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setIsZipFile(isZip);

    if (isZip) {
      // Extract and validate ZIP
      try {
        setStep("extracting");
        setProgressMessage("Extraindo arquivo ZIP...");
        
        const extracted = await extractZipFile(file);
        setExtractedFile(extracted);
        
        // Validate extracted CSV content
        const validation = validateCSVContent(extracted.content, extracted.name);
        setStep("select");
        
        if (!validation.valid) {
          setValidationErrors(validation.errors);
          toast({
            title: "Problemas no arquivo",
            description: "Verifique os erros de validação antes de continuar.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "ZIP extraído com sucesso",
            description: validation.preview.join(" | "),
          });
        }
      } catch (error) {
        console.error("[TSE] ZIP extraction error:", error);
        setStep("select");
        setValidationErrors([error instanceof Error ? error.message : "Erro ao extrair ZIP"]);
        toast({
          title: "Erro ao extrair ZIP",
          description: error instanceof Error ? error.message : "Erro desconhecido",
          variant: "destructive",
        });
      }
    } else {
      // Validate CSV directly
      const validation = await validateCSVFile(file);
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

  // Poll for processing progress
  const startProgressPolling = useCallback((ano: string, uf: string, tipoArquivo: string) => {
    console.log("[TSE] Starting progress polling for", ano, uf, tipoArquivo);
    
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("tse_importacoes")
          .select("registros_importados, total_registros, status, erro_mensagem")
          .eq("ano", parseInt(ano))
          .eq("uf", uf)
          .eq("tipo_arquivo", tipoArquivo)
          .single();
        
        if (error) {
          console.log("[TSE] Polling error:", error);
          return;
        }
        
        if (data) {
          console.log("[TSE] Progress update:", data);
          
          if (data.status === "erro") {
            setStep("error");
            setErrorMessage(data.erro_mensagem || "Erro no processamento");
            clearInterval(interval);
            setPollingInterval(null);
            return;
          }
          
          if (data.status === "concluido") {
            setProgress(100);
            setProgressMessage("Importação concluída!");
            clearInterval(interval);
            setPollingInterval(null);
            return;
          }
          
          // Calculate progress based on records
          if (data.total_registros && data.total_registros > 0) {
            const pct = Math.min(95, Math.round((data.registros_importados / data.total_registros) * 100));
            setProgress(30 + (pct * 0.65)); // 30-95% range for processing
            setProgressMessage(`Processando: ${data.registros_importados.toLocaleString("pt-BR")} de ${data.total_registros.toLocaleString("pt-BR")} registros`);
          } else if (data.registros_importados > 0) {
            setProgressMessage(`Processando: ${data.registros_importados.toLocaleString("pt-BR")} registros...`);
          }
        }
      } catch (err) {
        console.error("[TSE] Polling exception:", err);
      }
    }, 3000); // Poll every 3 seconds
    
    setPollingInterval(interval);
    return interval;
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !selectedAno) {
      toast({
        title: "Dados incompletos",
        description: "Selecione o ano e o arquivo.",
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
      setProgressMessage("Preparando arquivo para upload...");

      // Prepare file content - use extracted CSV for ZIP files
      let fileToUpload: Blob;
      let fileName: string;
      
      if (isZipFile && extractedFile) {
        if (extractedFile.rawBytes) {
          // Large file - upload raw bytes directly (Latin-1 encoding preserved)
          // The Edge Function will handle decoding line by line
          console.log("[TSE Upload] Using raw bytes for large file:", extractedFile.rawBytes.length);
          // Create a new Uint8Array copy to ensure we have a proper ArrayBuffer
          const bytesCopy = new Uint8Array(extractedFile.rawBytes);
          fileToUpload = new Blob([bytesCopy.buffer as ArrayBuffer], { type: "text/csv" });
          fileName = extractedFile.name;
          setProgressMessage("Enviando arquivo grande (bytes originais)...");
        } else {
          // Normal file - create blob from extracted UTF-8 content
          fileToUpload = new Blob([extractedFile.content], { type: "text/csv;charset=utf-8" });
          fileName = extractedFile.name;
          setProgressMessage("Enviando CSV extraído...");
        }
      } else {
        fileToUpload = selectedFile;
        fileName = selectedFile.name;
        setProgressMessage("Enviando arquivo CSV...");
      }

      setProgress(15);

      // Upload file to storage
      const filePath = `${selectedUF}/${selectedAno}/${Date.now()}_${fileName}`;
      console.log("[TSE Upload] Iniciando upload:", { filePath, size: fileToUpload.size });
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("tse-csv")
        .upload(filePath, fileToUpload);

      if (uploadError) {
        console.error("[TSE Upload] Erro no storage:", uploadError);
        
        let errorMsg = uploadError.message;
        if (uploadError.message.includes("row-level security") || uploadError.message.includes("RLS")) {
          errorMsg = "Erro de permissão: você não tem acesso para fazer upload. Contate o administrador.";
        } else if (uploadError.message.includes("bucket")) {
          errorMsg = "Bucket de armazenamento não encontrado. Verifique a configuração.";
        } else if (uploadError.message.includes("size")) {
          errorMsg = "Arquivo muito grande. O limite é 50MB por arquivo.";
        }
        
        throw new Error(errorMsg);
      }

      console.log("[TSE Upload] Upload concluído:", uploadData);

      // Verify file exists
      setProgress(25);
      setProgressMessage("Verificando arquivo no servidor...");
      
      // Use the timestamped filename from the upload path for verification
      const uploadedFileName = filePath.split('/').pop() || '';
      
      const { data: fileCheck, error: fileCheckError } = await supabase.storage
        .from("tse-csv")
        .list(`${selectedUF}/${selectedAno}`, { 
          search: uploadedFileName.substring(0, 25) 
        });

      if (fileCheckError || !fileCheck || fileCheck.length === 0) {
        console.error("[TSE Upload] Arquivo não encontrado após upload:", fileCheckError, "Buscando por:", uploadedFileName);
        throw new Error("Arquivo não foi salvo corretamente. Tente novamente.");
      }

      console.log("[TSE Upload] Arquivo verificado, iniciando processamento");
      setProgress(30);
      setProgressMessage("Arquivo enviado. Iniciando processamento dos dados...");
      setStep("processing");

      // Start progress polling
      const interval = startProgressPolling(selectedAno, selectedUF, selectedTipoArquivo);

      // Call appropriate edge function based on file type
      const edgeFunctionName = selectedTipoArquivo === "totalizacao" 
        ? "tse-process-totalizacao" 
        : "tse-process-csv";
      
      // Process with automatic chunked resumption for large files
      let resumeFromLine = 0;
      let chunkCount = 0;
      const maxChunks = 200; // Safety limit: ~200 chunks * 25s * ~5k lines = ~1M lines per chunk
      
      while (chunkCount < maxChunks) {
        chunkCount++;
        console.log(`[TSE Upload] Processing chunk ${chunkCount}, resuming from line ${resumeFromLine}`);
        setProgressMessage(`Processando dados... (chunk ${chunkCount}, linha ${resumeFromLine.toLocaleString()})`);
        
        const { data, error } = await supabase.functions.invoke(edgeFunctionName, {
          body: {
            ano: parseInt(selectedAno),
            uf: selectedUF,
            filePath,
            resumeFromLine,
          },
        });

        console.log("[TSE Upload] Resposta do chunk:", { data, error, chunkCount });

        if (error) {
          console.error("[TSE Upload] Erro na Edge Function:", error);
          throw new Error(`Erro no processamento: ${error.message}`);
        }

        if (!data?.success) {
          const errorDetail = data?.error || data?.message || "Erro desconhecido no processamento";
          console.error("[TSE Upload] Processamento falhou:", data);
          throw new Error(errorDetail);
        }

        // Check if we need to continue processing
        if (data.shouldContinue && data.lastProcessedLine > resumeFromLine) {
          resumeFromLine = data.lastProcessedLine;
          setProgressMessage(`Processando... ${data.totalVotesInserted?.toLocaleString() || 0} votos importados (chunk ${chunkCount})`);
          
          // Small delay between chunks to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }

        // Processing complete
        if (interval) {
          clearInterval(interval);
          setPollingInterval(null);
        }

        setProgress(100);
        setProgressMessage("Importação concluída!");
        setStats({
          votos: data.totalVotesInserted,
        });
        setStep("complete");
        
        toast({
          title: "Importação concluída",
          description: `${data.totalVotesInserted?.toLocaleString("pt-BR") || 0} votos importados em ${chunkCount} chunk(s).`,
        });
        
        onSuccess();
        break;
      }

      // Stop polling if still running
      if (interval) {
        clearInterval(interval);
        setPollingInterval(null);
      }

      if (chunkCount >= maxChunks) {
        throw new Error("Limite de chunks atingido. O arquivo pode ser muito grande.");
      }
    } catch (error) {
      console.error("[TSE Upload] Erro completo:", error);
      
      // Stop polling if still running
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      setStep("error");
      
      const errorMsg = error instanceof Error ? error.message : "Erro ao processar arquivo";
      setErrorMessage(errorMsg);
      
      toast({
        title: "Erro na importação",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const resetModal = () => {
    // Stop any active polling
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    setSelectedFile(null);
    setExtractedFile(null);
    setIsZipFile(false);
    setSelectedAno("");
    setSelectedTipoArquivo("votacao_secao");
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
            Upload de Arquivo TSE
          </DialogTitle>
          <DialogDescription>
            Faça upload de arquivos CSV ou ZIP baixados diretamente do repositório do TSE
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === "select" && (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm space-y-2">
                  <p>
                    <strong>Arquivo correto:</strong> <code className="bg-muted px-1 rounded">votacao_secao_YYYY_UF.zip</code>
                  </p>
                  <p>
                    Baixe em{" "}
                    <a
                      href="https://dadosabertos.tse.jus.br/dataset/?groups=resultados"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      dadosabertos.tse.jus.br
                    </a>
                    {" "}→ "Votação por Seção Eleitoral" → Selecione o estado (UF).
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ NÃO use arquivos de Boletim de Urna (bu_imgbu), pois são muito grandes e contêm dados diferentes.
                  </p>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="space-y-2">
                <Label>Tipo de Arquivo</Label>
                <Select value={selectedTipoArquivo} onValueChange={(v) => setSelectedTipoArquivo(v as "votacao_secao" | "totalizacao")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="votacao_secao">
                      Votação por Seção (dados detalhados por seção eleitoral)
                    </SelectItem>
                    <SelectItem value="totalizacao">
                      Resultado/Totalização (dados agregados por município)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Direct download link when year is selected */}
              {selectedAno && (
                <Alert className="border-primary/30 bg-primary/5">
                  <Download className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <div className="flex flex-col gap-2">
                      <p className="font-medium">
                        Baixe o arquivo correto:
                      </p>
                      <a
                        href={getDirectDownloadUrl(selectedAno, selectedUF, selectedTipoArquivo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-primary hover:underline font-mono text-xs bg-background px-2 py-1.5 rounded border"
                      >
                        <Download className="h-3 w-3" />
                        {getExpectedFileName(selectedAno, selectedUF, selectedTipoArquivo)}
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      </a>
                      <p className="text-xs text-muted-foreground">
                        Clique para baixar diretamente do portal TSE (~50-150MB)
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Arquivo CSV ou ZIP</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    selectedFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.zip"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        {isZipFile ? (
                          <FileArchive className="h-5 w-5 text-primary" />
                        ) : (
                          <FileText className="h-5 w-5 text-primary" />
                        )}
                        <span className="font-medium">{selectedFile.name}</span>
                        <span className="text-sm text-muted-foreground">
                          ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      {extractedFile && (
                        <div className="text-xs text-muted-foreground border-t pt-2 mt-2">
                          <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-500" />
                          CSV extraído: <strong>{extractedFile.name}</strong>
                          {" "}({(extractedFile.extractedSize / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <FileArchive className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Clique para selecionar ou arraste o arquivo
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos aceitos: CSV ou ZIP
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
                  disabled={!selectedFile || !selectedAno || validationErrors.length > 0 || (isZipFile && !extractedFile)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Iniciar Importação
                </Button>
              </div>
            </>
          )}

          {step === "extracting" && (
            <div className="py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <h3 className="font-semibold mb-2">Extraindo arquivo ZIP...</h3>
              <p className="text-sm text-muted-foreground">{progressMessage}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Convertendo encoding Latin-1 para UTF-8...
              </p>
            </div>
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
                {step === "processing" 
                  ? "Atualizando a cada 3 segundos..." 
                  : "Isso pode levar alguns minutos dependendo do tamanho do arquivo."}
              </p>
            </div>
          )}

          {step === "complete" && (
            <div className="py-8 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
              <h3 className="font-semibold mb-2 text-lg">Importação Concluída!</h3>
              
              {stats && selectedTipoArquivo === "votacao_secao" && (
                <div className="grid grid-cols-3 gap-4 mt-4 mb-6">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{(stats.candidatos || 0).toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">Candidatos</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{(stats.locais || 0).toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">Locais</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{(stats.votos || 0).toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">Votos</div>
                  </div>
                </div>
              )}

              {stats && selectedTipoArquivo === "totalizacao" && (
                <div className="grid grid-cols-2 gap-4 mt-4 mb-6">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{(stats.partidos || 0).toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">Novos Partidos</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-xl font-bold">{(stats.resultados || 0).toLocaleString("pt-BR")}</div>
                    <div className="text-xs text-muted-foreground">Resultados</div>
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
