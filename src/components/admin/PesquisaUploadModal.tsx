import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, Keyboard, Loader2, CheckCircle2, Sparkles, Brain, Zap } from 'lucide-react';

// PDF.js types
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface Pesquisa {
  id: string;
  titulo: string;
  instituto: string;
  tipo_pesquisa: 'quantitativa' | 'qualitativa' | 'mista';
  data_campo_inicio: string | null;
  data_campo_fim: string | null;
  data_publicacao: string | null;
  registro_tse: string | null;
  universo: string | null;
  amostra_total: number | null;
  margem_erro: number | null;
  nivel_confianca: number | null;
  abrangencia: string | null;
  status: 'rascunho' | 'processando' | 'ativa' | 'arquivada';
  is_active: boolean;
}

interface PesquisaUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pesquisa: Pesquisa | null;
  onSuccess: () => void;
}

const INSTITUTOS = [
  'Datafolha',
  'IPEC',
  'Quaest',
  'Real Time Big Data',
  'Paraná Pesquisas',
  'Atlas Intel',
  'Ágili Pesquisas',
  'Neokemp',
  'Instituto Mapa',
  'Veritá',
  'Outro'
];

export const PesquisaUploadModal = ({ 
  open, 
  onOpenChange, 
  pesquisa, 
  onSuccess 
}: PesquisaUploadModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('metadata');
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [instituto, setInstituto] = useState('');
  const [institutoCustom, setInstitutoCustom] = useState('');
  const [tipoPesquisa, setTipoPesquisa] = useState<'quantitativa' | 'qualitativa' | 'mista'>('quantitativa');
  const [dataCampoInicio, setDataCampoInicio] = useState('');
  const [dataCampoFim, setDataCampoFim] = useState('');
  const [dataPublicacao, setDataPublicacao] = useState('');
  const [registroTse, setRegistroTse] = useState('');
  const [universo, setUniverso] = useState('');
  const [amostraTotal, setAmostraTotal] = useState('');
  const [margemErro, setMargemErro] = useState('');
  const [nivelConfianca, setNivelConfianca] = useState('95');
  const [abrangencia, setAbrangencia] = useState('estadual');
  const [status, setStatus] = useState<'rascunho' | 'ativa'>('rascunho');
  const [isActive, setIsActive] = useState(true);
  const [content, setContent] = useState('');
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  
  // AI Processing state
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStep, setAiStep] = useState('');
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  
  // Auto-process flow state
  const [processingStage, setProcessingStage] = useState<'idle' | 'uploading' | 'extracting' | 'saving' | 'ai' | 'done'>('idle');

  useEffect(() => {
    if (pesquisa) {
      setTitulo(pesquisa.titulo);
      setInstituto(INSTITUTOS.includes(pesquisa.instituto) ? pesquisa.instituto : 'Outro');
      setInstitutoCustom(INSTITUTOS.includes(pesquisa.instituto) ? '' : pesquisa.instituto);
      setTipoPesquisa(pesquisa.tipo_pesquisa);
      setDataCampoInicio(pesquisa.data_campo_inicio || '');
      setDataCampoFim(pesquisa.data_campo_fim || '');
      setDataPublicacao(pesquisa.data_publicacao || '');
      setRegistroTse(pesquisa.registro_tse || '');
      setUniverso(pesquisa.universo || '');
      setAmostraTotal(pesquisa.amostra_total?.toString() || '');
      setMargemErro(pesquisa.margem_erro?.toString() || '');
      setNivelConfianca(pesquisa.nivel_confianca?.toString() || '95');
      setAbrangencia(pesquisa.abrangencia || 'estadual');
      setStatus(pesquisa.status === 'ativa' ? 'ativa' : 'rascunho');
      setIsActive(pesquisa.is_active);
    } else {
      resetForm();
    }
  }, [pesquisa, open]);

  const resetForm = () => {
    setTitulo('');
    setInstituto('');
    setInstitutoCustom('');
    setTipoPesquisa('quantitativa');
    setDataCampoInicio('');
    setDataCampoFim('');
    setDataPublicacao('');
    setRegistroTse('');
    setUniverso('');
    setAmostraTotal('');
    setMargemErro('');
    setNivelConfianca('95');
    setAbrangencia('estadual');
    setStatus('rascunho');
    setIsActive(true);
    setContent('');
    setSelectedFile(null);
    setActiveTab('metadata');
    setExtractionSuccess(false);
    setIsProcessingAI(false);
    setAiProgress(0);
    setAiStep('');
    setProcessingStage('idle');
  };

  const loadPdfJs = async (): Promise<any> => {
    if (window.pdfjsLib) {
      return window.pdfjsLib;
    }
    
    // Load PDF.js from CDN
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = await loadPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw error;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Aceitos: PDF, Excel, CSV');
      return;
    }
    
    setSelectedFile(file);
    setExtractionSuccess(false);
    
    // Auto-extract text from PDF
    if (file.type === 'application/pdf') {
      setIsExtractingText(true);
      toast.info('Extraindo texto do PDF...');
      
      try {
        const extractedText = await extractTextFromPDF(file);
        
        if (extractedText.length > 50) {
          setContent(extractedText);
          setExtractionSuccess(true);
          setActiveTab('manual'); // Switch to manual tab to show extracted content
          toast.success(`Texto extraído com sucesso! ${extractedText.length.toLocaleString()} caracteres.`);
        } else {
          toast.warning('PDF parece ter pouco texto. Por favor, cole o conteúdo manualmente na aba "Dados Manuais".');
        }
      } catch (error) {
        console.error('PDF extraction error:', error);
        toast.error('Não foi possível extrair texto do PDF. Por favor, cole o conteúdo manualmente na aba "Dados Manuais".');
      } finally {
        setIsExtractingText(false);
      }
    } else if (file.type === 'text/csv') {
      // For CSV, read as text
      try {
        const text = await file.text();
        if (text.length > 50) {
          setContent(text);
          setExtractionSuccess(true);
          setActiveTab('manual');
          toast.success(`Conteúdo CSV carregado! ${text.length.toLocaleString()} caracteres.`);
        }
      } catch (error) {
        toast.error('Erro ao ler arquivo CSV.');
      }
    } else {
      // Excel files - inform user to paste manually
      toast.info('Arquivo Excel detectado. Por favor, abra o arquivo e cole o conteúdo na aba "Dados Manuais".');
    }
  };

  const uploadFile = async (): Promise<{ url: string; name: string; type: string } | null> => {
    if (!selectedFile) return null;
    
    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `pesquisas/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pesquisas-eleitorais')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pesquisas-eleitorais')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        name: selectedFile.name,
        type: selectedFile.type
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao fazer upload do arquivo');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const savePesquisa = async (processWithAI: boolean = false, skipValidation: boolean = false): Promise<string | null> => {
    const finalInstituto = instituto === 'Outro' ? institutoCustom : instituto;
    
    // Only validate título/instituto for manual save (not auto-process)
    if (!skipValidation) {
      if (!titulo.trim()) {
        toast.error('Título é obrigatório para salvar manualmente');
        return null;
      }

      if (!finalInstituto.trim()) {
        toast.error('Instituto é obrigatório para salvar manualmente');
        return null;
      }

      if (processWithAI && content.trim().length < 100) {
        toast.error('Cole o texto da pesquisa na aba "Dados Manuais" antes de processar com IA');
        setActiveTab('manual');
        return null;
      }
    }

    try {
      let fileData = null;
      if (selectedFile) {
        fileData = await uploadFile();
      }

      const pesquisaData = {
        titulo: titulo.trim() || `Pesquisa - ${selectedFile?.name || 'Nova'}`,
        instituto: finalInstituto.trim() || 'A identificar',
        tipo_pesquisa: tipoPesquisa,
        data_campo_inicio: dataCampoInicio || null,
        data_campo_fim: dataCampoFim || null,
        data_publicacao: dataPublicacao || null,
        registro_tse: registroTse.trim() || null,
        universo: universo.trim() || null,
        amostra_total: amostraTotal ? parseInt(amostraTotal) : null,
        margem_erro: margemErro ? parseFloat(margemErro) : null,
        nivel_confianca: nivelConfianca ? parseFloat(nivelConfianca) : 95,
        abrangencia,
        status: processWithAI ? 'processando' as const : status,
        is_active: isActive,
        content: content.trim() || null,
        ...(fileData && {
          file_url: fileData.url,
          file_name: fileData.name,
          file_type: fileData.type
        })
      };

      if (pesquisa) {
        const { error } = await supabase
          .from('pesquisas_eleitorais')
          .update(pesquisaData)
          .eq('id', pesquisa.id);

        if (error) throw error;
        return pesquisa.id;
      } else {
        const { data, error } = await supabase
          .from('pesquisas_eleitorais')
          .insert(pesquisaData)
          .select('id')
          .single();

        if (error) throw error;
        return data.id;
      }
    } catch (error) {
      console.error('Error saving pesquisa:', error);
      throw error;
    }
  };

  const processWithAI = async (pesquisaId: string, textContent?: string) => {
    setAiStep('Conectando à IA...');
    setAiProgress(10);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    setAiStep('Enviando dados para análise...');
    setAiProgress(30);

    // Use provided textContent or fall back to state content
    const contentToSend = (textContent || content).trim();
    console.log('Sending to AI, content length:', contentToSend.length);

    const response = await supabase.functions.invoke('process-pesquisa', {
      body: { 
        pesquisa_id: pesquisaId,
        content_text: contentToSend
      }
    });

    if (response.error) {
      throw new Error(response.error.message || 'Erro ao processar pesquisa');
    }

    setAiProgress(70);
    setAiStep('Salvando resultados...');

    const result = response.data;

    // Update pesquisa status to ativa
    await supabase
      .from('pesquisas_eleitorais')
      .update({ status: 'ativa' })
      .eq('id', pesquisaId);

    setAiProgress(100);
    setAiStep('Concluído!');

    return result;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const pesquisaId = await savePesquisa(false);
      if (pesquisaId) {
        toast.success(pesquisa ? 'Pesquisa atualizada' : 'Pesquisa criada');
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving pesquisa:', error);
      toast.error('Erro ao salvar pesquisa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAndProcess = async () => {
    setIsSubmitting(true);
    setIsProcessingAI(true);
    setAiProgress(0);
    setProcessingStage('saving');
    setAiStep('Salvando pesquisa...');

    try {
      const pesquisaId = await savePesquisa(true);
      if (!pesquisaId) {
        setIsProcessingAI(false);
        setIsSubmitting(false);
        setProcessingStage('idle');
        return;
      }

      setAiProgress(20);
      setProcessingStage('ai');
      toast.info('Pesquisa salva! Iniciando processamento com IA...');

      const result = await processWithAI(pesquisaId);

      setProcessingStage('done');
      const totalResults = (result.resultados_count || 0) + (result.cruzamentos_count || 0);
      toast.success(`Processamento concluído! ${totalResults} resultados extraídos.`);
      
      onSuccess();
    } catch (error: any) {
      console.error('Error processing pesquisa:', error);
      toast.error(error.message || 'Erro ao processar pesquisa com IA');
      
      // Revert status if processing failed
      setAiStep('');
      setAiProgress(0);
      setProcessingStage('idle');
    } finally {
      setIsSubmitting(false);
      setIsProcessingAI(false);
    }
  };

  // Fully automated flow: Upload → Extract → Save → Process AI
  const handleAutoProcess = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo PDF primeiro');
      return;
    }

    setIsSubmitting(true);
    setIsProcessingAI(true);
    setAiProgress(0);

    try {
      // Step 1: Extract text (if not already done)
      let textToProcess = content;
      
      if (!textToProcess || textToProcess.length < 100) {
        if (selectedFile.type === 'application/pdf') {
          setProcessingStage('extracting');
          setAiStep('Extraindo texto do PDF...');
          setAiProgress(10);
          
          const extractedText = await extractTextFromPDF(selectedFile);
          if (extractedText.length < 100) {
            throw new Error('Não foi possível extrair texto suficiente do PDF. O arquivo pode estar escaneado ou protegido.');
          }
          textToProcess = extractedText;
          setContent(extractedText);
        } else {
          throw new Error('Para arquivos não-PDF, cole o conteúdo na aba "Dados Manuais" primeiro.');
        }
      }

      setAiProgress(25);
      setProcessingStage('uploading');
      setAiStep('Fazendo upload do arquivo...');

      // Step 2: Upload file
      const fileData = await uploadFile();

      setAiProgress(40);
      setProcessingStage('saving');
      setAiStep('Salvando pesquisa...');

      // Step 3: Save pesquisa with content
      const finalInstituto = instituto === 'Outro' ? institutoCustom : instituto;
      const pesquisaData = {
        titulo: titulo.trim() || `Pesquisa - ${selectedFile.name}`,
        instituto: finalInstituto.trim() || 'A identificar',
        tipo_pesquisa: tipoPesquisa,
        data_campo_inicio: dataCampoInicio || null,
        data_campo_fim: dataCampoFim || null,
        data_publicacao: dataPublicacao || null,
        registro_tse: registroTse.trim() || null,
        universo: universo.trim() || null,
        amostra_total: amostraTotal ? parseInt(amostraTotal) : null,
        margem_erro: margemErro ? parseFloat(margemErro) : null,
        nivel_confianca: nivelConfianca ? parseFloat(nivelConfianca) : 95,
        abrangencia,
        status: 'processando' as const,
        is_active: isActive,
        content: textToProcess,
        ...(fileData && {
          file_url: fileData.url,
          file_name: fileData.name,
          file_type: fileData.type
        })
      };

      let pesquisaId: string;
      if (pesquisa) {
        const { error } = await supabase
          .from('pesquisas_eleitorais')
          .update(pesquisaData)
          .eq('id', pesquisa.id);
        if (error) throw error;
        pesquisaId = pesquisa.id;
      } else {
        const { data, error } = await supabase
          .from('pesquisas_eleitorais')
          .insert(pesquisaData)
          .select('id')
          .single();
        if (error) throw error;
        pesquisaId = data.id;
      }

      setAiProgress(55);
      setProcessingStage('ai');
      setAiStep('Processando com Inteligência Artificial...');

      // Step 4: Process with AI - pass the extracted text directly
      const result = await processWithAI(pesquisaId, textToProcess);

      setAiProgress(100);
      setProcessingStage('done');
      setAiStep('Concluído!');

      const chunksInfo = result.data?.chunks_processed > 1 ? ` (${result.data.chunks_processed} partes)` : '';
      const totalResults = (result.data?.resultados_count || 0) + (result.data?.cruzamentos_count || 0);
      toast.success(`✅ Processamento automático concluído${chunksInfo}! ${totalResults} resultados extraídos.`);
      
      onSuccess();
    } catch (error: any) {
      console.error('Auto-process error:', error);
      toast.error(error.message || 'Erro no processamento automático');
      setProcessingStage('idle');
      setAiProgress(0);
      setAiStep('');
    } finally {
      setIsSubmitting(false);
      setIsProcessingAI(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {pesquisa ? 'Editar Pesquisa' : 'Nova Pesquisa Eleitoral'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metadata" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Metadados
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Arquivo
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Dados Manuais
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-4 pr-4">
            <TabsContent value="metadata" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="titulo">Título da Pesquisa</Label>
                  <Input
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Preenchido automaticamente pela IA"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Deixe em branco - será extraído automaticamente do PDF
                  </p>
                </div>

                <div>
                  <Label htmlFor="instituto">Instituto</Label>
                  <Select value={instituto} onValueChange={setInstituto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Identificado automaticamente" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTITUTOS.map(inst => (
                        <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Opcional - será identificado automaticamente do PDF
                  </p>
                </div>

                {instituto === 'Outro' && (
                  <div>
                    <Label htmlFor="institutoCustom">Nome do Instituto</Label>
                    <Input
                      id="institutoCustom"
                      value={institutoCustom}
                      onChange={(e) => setInstitutoCustom(e.target.value)}
                      placeholder="Digite o nome"
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="tipoPesquisa">Tipo de Pesquisa</Label>
                  <Select value={tipoPesquisa} onValueChange={(v) => setTipoPesquisa(v as typeof tipoPesquisa)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quantitativa">Quantitativa</SelectItem>
                      <SelectItem value="qualitativa">Qualitativa</SelectItem>
                      <SelectItem value="mista">Mista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dataCampoInicio">Data Início Campo</Label>
                  <Input
                    id="dataCampoInicio"
                    type="date"
                    value={dataCampoInicio}
                    onChange={(e) => setDataCampoInicio(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="dataCampoFim">Data Fim Campo</Label>
                  <Input
                    id="dataCampoFim"
                    type="date"
                    value={dataCampoFim}
                    onChange={(e) => setDataCampoFim(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="dataPublicacao">Data de Publicação</Label>
                  <Input
                    id="dataPublicacao"
                    type="date"
                    value={dataPublicacao}
                    onChange={(e) => setDataPublicacao(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="registroTse">Registro TSE</Label>
                  <Input
                    id="registroTse"
                    value={registroTse}
                    onChange={(e) => setRegistroTse(e.target.value)}
                    placeholder="Ex: PR-00123/2026"
                  />
                </div>

                <div>
                  <Label htmlFor="amostraTotal">Tamanho da Amostra</Label>
                  <Input
                    id="amostraTotal"
                    type="number"
                    value={amostraTotal}
                    onChange={(e) => setAmostraTotal(e.target.value)}
                    placeholder="Ex: 2000"
                  />
                </div>

                <div>
                  <Label htmlFor="margemErro">Margem de Erro (%)</Label>
                  <Input
                    id="margemErro"
                    type="number"
                    step="0.1"
                    value={margemErro}
                    onChange={(e) => setMargemErro(e.target.value)}
                    placeholder="Ex: 2.5"
                  />
                </div>

                <div>
                  <Label htmlFor="nivelConfianca">Nível de Confiança (%)</Label>
                  <Input
                    id="nivelConfianca"
                    type="number"
                    step="0.1"
                    value={nivelConfianca}
                    onChange={(e) => setNivelConfianca(e.target.value)}
                    placeholder="Ex: 95"
                  />
                </div>

                <div>
                  <Label htmlFor="abrangencia">Abrangência</Label>
                  <Select value={abrangencia} onValueChange={setAbrangencia}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="estadual">Estadual</SelectItem>
                      <SelectItem value="regional">Regional</SelectItem>
                      <SelectItem value="municipal">Municipal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label htmlFor="universo">Universo/População</Label>
                  <Input
                    id="universo"
                    value={universo}
                    onChange={(e) => setUniverso(e.target.value)}
                    placeholder="Ex: Eleitores do estado do Paraná com 16 anos ou mais"
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rascunho">Rascunho</SelectItem>
                      <SelectItem value="ativa">Ativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="isActive">Disponível para análise de IA</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="space-y-4 mt-0">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Upload de Arquivo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Arraste um arquivo ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Formatos aceitos: PDF, Excel (.xlsx, .xls), CSV
                </p>
                <Input
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild variant="outline">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Selecionar Arquivo
                  </label>
                </Button>
                
                {isExtractingText && (
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm">Extraindo texto do PDF...</span>
                  </div>
                )}
                
                {selectedFile && !isExtractingText && (
                  <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {extractionSuccess && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      <span className="text-sm">{selectedFile.name}</span>
                      {extractionSuccess && (
                        <span className="text-xs text-green-600 bg-green-500/10 px-2 py-0.5 rounded">
                          Texto extraído
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedFile(null);
                        setExtractionSuccess(false);
                      }}
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>

              {extractionSuccess ? (
                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-green-600">✅ Texto Extraído Automaticamente</h4>
                  <p className="text-sm text-muted-foreground">
                    O texto do PDF foi extraído e está disponível na aba "Dados Manuais". 
                    Revise o conteúdo antes de salvar e processar com IA.
                  </p>
                </div>
              ) : (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 text-amber-600">📄 Extração Automática de PDF</h4>
                  <p className="text-sm text-muted-foreground">
                    Ao selecionar um arquivo PDF, o sistema tentará extrair o texto automaticamente. 
                    Para arquivos Excel, é necessário copiar e colar na aba "Dados Manuais".
                  </p>
                </div>
              )}

              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">📊 Processamento com IA</h4>
                <p className="text-sm text-muted-foreground">
                  Após salvar e preencher os dados manuais, o sistema utilizará IA para extrair 
                  automaticamente os resultados estruturados (intenção de voto, rejeição, cruzamentos).
                </p>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-0">
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-2 text-primary">📋 Instruções para Processamento</h4>
                <p className="text-sm text-muted-foreground">
                  Cole abaixo <strong>todo o conteúdo textual</strong> da pesquisa (copie do PDF ou Excel). 
                  A IA irá extrair APENAS os dados presentes neste texto, sem inventar informações.
                </p>
              </div>
              
              <div>
                <Label htmlFor="content" className="flex items-center gap-2">
                  Dados da Pesquisa (Texto) 
                  <span className="text-xs text-muted-foreground">
                    {content.length > 0 && `(${content.length.toLocaleString()} caracteres)`}
                  </span>
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={`Cole aqui TODO o conteúdo da pesquisa copiado do PDF/Excel...

EXEMPLO - PESQUISA PARANÁ PESQUISAS - JANEIRO 2026

INTENÇÃO DE VOTO ESTIMULADA - GOVERNADOR PR
- Candidato João Silva (PARTIDO): 35%
- Candidato Maria Santos (PARTIDO): 28%
- Candidato Pedro Oliveira (PARTIDO): 15%
- Brancos/Nulos: 12%
- Não sabem/Não responderam: 10%

REJEIÇÃO
- João Silva: 25%
- Maria Santos: 32%
- Pedro Oliveira: 18%

AVALIAÇÃO DO GOVERNO ATUAL
- Ótimo/Bom: 28%
- Regular: 35%
- Ruim/Péssimo: 32%
- Não sabem: 5%

METODOLOGIA
- Instituto: Paraná Pesquisas
- Registro TSE: PR-00123/2026
- Período de campo: 05 a 08 de janeiro de 2026
- Amostra: 2.000 eleitores
- Margem de erro: 2,2 pontos percentuais
- Nível de confiança: 95%
- Abrangência: Estado do Paraná`}
                  className="min-h-[350px] font-mono text-sm"
                />
              </div>
              
              {content.length > 0 && content.length < 200 && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg">
                  <p className="text-sm text-amber-600">
                    ⚠️ O conteúdo parece muito curto. Certifique-se de colar todos os dados da pesquisa.
                  </p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                💡 <strong>Importante:</strong> Cole o texto COMPLETO da pesquisa. Quanto mais informações você fornecer, 
                mais precisa será a extração. A IA NÃO inventará dados - apenas extrairá o que está no texto acima.
              </p>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {isProcessingAI && (
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <Brain className="w-5 h-5 text-primary animate-pulse" />
              <span className="font-medium text-primary">Processamento Automático</span>
            </div>
            
            {/* Progress steps */}
            <div className="flex items-center justify-between mb-3 text-xs">
              <div className={`flex items-center gap-1 ${processingStage === 'extracting' || aiProgress >= 10 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${processingStage === 'extracting' ? 'bg-primary animate-pulse' : aiProgress >= 10 ? 'bg-green-500' : 'bg-muted'}`} />
                Extração
              </div>
              <div className={`flex items-center gap-1 ${processingStage === 'uploading' || aiProgress >= 25 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${processingStage === 'uploading' ? 'bg-primary animate-pulse' : aiProgress >= 25 ? 'bg-green-500' : 'bg-muted'}`} />
                Upload
              </div>
              <div className={`flex items-center gap-1 ${processingStage === 'saving' || aiProgress >= 40 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${processingStage === 'saving' ? 'bg-primary animate-pulse' : aiProgress >= 40 ? 'bg-green-500' : 'bg-muted'}`} />
                Salvando
              </div>
              <div className={`flex items-center gap-1 ${processingStage === 'ai' || aiProgress >= 55 ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${processingStage === 'ai' ? 'bg-primary animate-pulse' : aiProgress >= 55 ? 'bg-green-500' : 'bg-muted'}`} />
                IA
              </div>
              <div className={`flex items-center gap-1 ${processingStage === 'done' ? 'text-green-600' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${processingStage === 'done' ? 'bg-green-500' : 'bg-muted'}`} />
                Concluído
              </div>
            </div>
            
            <Progress value={aiProgress} className="h-2 mb-2" />
            <p className="text-sm text-muted-foreground">{aiStep}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessingAI}>
            Cancelar
          </Button>
          <Button 
            variant="outline"
            onClick={handleSubmit} 
            disabled={isSubmitting || isUploading || isProcessingAI}
          >
            {(isSubmitting && !isProcessingAI) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {pesquisa ? 'Salvar' : 'Criar Rascunho'}
          </Button>
          
          {/* Auto-process button - for PDF files */}
          {selectedFile?.type === 'application/pdf' && (
            <Button 
              onClick={handleAutoProcess} 
              disabled={isSubmitting || isUploading || isProcessingAI}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isProcessingAI ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Processar PDF Automaticamente
            </Button>
          )}
          
          {/* Manual process button - when content is available */}
          {(!selectedFile || selectedFile.type !== 'application/pdf') && (
            <Button 
              onClick={handleSubmitAndProcess} 
              disabled={isSubmitting || isUploading || isProcessingAI || content.trim().length < 100}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isProcessingAI ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              Salvar e Processar IA
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
