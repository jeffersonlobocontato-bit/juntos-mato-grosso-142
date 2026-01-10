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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, Keyboard, Loader2 } from 'lucide-react';

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
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
      if (!validTypes.includes(file.type)) {
        toast.error('Formato inválido. Aceitos: PDF, Excel, CSV');
        return;
      }
      setSelectedFile(file);
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

  const handleSubmit = async () => {
    if (!titulo.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    const finalInstituto = instituto === 'Outro' ? institutoCustom : instituto;
    if (!finalInstituto.trim()) {
      toast.error('Instituto é obrigatório');
      return;
    }

    setIsSubmitting(true);

    try {
      let fileData = null;
      if (selectedFile) {
        fileData = await uploadFile();
      }

      const pesquisaData = {
        titulo: titulo.trim(),
        instituto: finalInstituto.trim(),
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
        status,
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
        toast.success('Pesquisa atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('pesquisas_eleitorais')
          .insert(pesquisaData);

        if (error) throw error;
        toast.success('Pesquisa criada com sucesso');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving pesquisa:', error);
      toast.error('Erro ao salvar pesquisa');
    } finally {
      setIsSubmitting(false);
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
                  <Label htmlFor="titulo">Título da Pesquisa *</Label>
                  <Input
                    id="titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ex: Pesquisa Datafolha - Janeiro 2026"
                  />
                </div>

                <div>
                  <Label htmlFor="instituto">Instituto *</Label>
                  <Select value={instituto} onValueChange={setInstituto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o instituto" />
                    </SelectTrigger>
                    <SelectContent>
                      {INSTITUTOS.map(inst => (
                        <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                
                {selectedFile && (
                  <div className="mt-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                    <span className="text-sm">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      Remover
                    </Button>
                  </div>
                )}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2 text-amber-600">⚠️ Importante: Arquivos PDF/Excel</h4>
                <p className="text-sm text-muted-foreground">
                  Para arquivos PDF ou Excel, é necessário <strong>copiar e colar o texto da pesquisa</strong> na 
                  aba "Dados Manuais" antes de processar. O sistema não consegue extrair texto 
                  automaticamente desses formatos.
                </p>
              </div>

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

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || isUploading}>
            {(isSubmitting || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {pesquisa ? 'Salvar Alterações' : 'Criar Pesquisa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
