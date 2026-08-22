import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2, Link as LinkIcon, Globe, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TemasMultiSelect } from './TemasMultiSelect';

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  eixos: { id: string; nome: string }[];
  municipios: { id: string; nome: string; regiao: string | null }[];
  regioes: string[];
  preselectedAgentId?: string;
}

const DOC_CATEGORIES = [
  { value: 'plano_governo', label: 'Plano de Governo' },
  { value: 'documento_tecnico', label: 'Documento Técnico' },
  { value: 'noticia', label: 'Notícia/Publicação' },
  { value: 'comprovacao', label: 'Comprovação de Obra' },
  { value: 'investimento', label: 'Documento de Investimento' },
  { value: 'promessa', label: 'Promessa/Compromisso' },
  { value: 'legislacao', label: 'Legislação' },
  { value: 'outro', label: 'Outro' },
];

const TEMPORAL_STATUS = [
  { value: 'realizado', label: 'Realizado' },
  { value: 'em_andamento', label: 'Em Andamento' },
  { value: 'prometido', label: 'Prometido' },
  { value: 'nao_iniciado', label: 'Não Iniciado' },
];

export function DocumentUploadModal({
  open,
  onOpenChange,
  onSuccess,
  eixos,
  municipios,
  regioes,
  preselectedAgentId,
}: DocumentUploadModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'file' | 'text'>('text');
  
  // Scope state
  const [scope, setScope] = useState<'global' | 'agent_specific'>(preselectedAgentId ? 'agent_specific' : 'global');
  const [targetAgentId, setTargetAgentId] = useState(preselectedAgentId || '');
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [docCategory, setDocCategory] = useState('');
  const [temporalStatus, setTemporalStatus] = useState('');
  const [eixoId, setEixoId] = useState('');
  const [municipioId, setMunicipioId] = useState('');
  const [regiao, setRegiao] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [temaIds, setTemaIds] = useState<string[]>([]);
  const [allTemas, setAllTemas] = useState(false);


  useEffect(() => {
    if (open) {
      supabase
        .from('ai_agent_config')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => {
          if (data) setAgents(data);
        });
    }
  }, [open]);

  useEffect(() => {
    if (preselectedAgentId) {
      setScope('agent_specific');
      setTargetAgentId(preselectedAgentId);
    }
  }, [preselectedAgentId]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setContent('');
    setDocCategory('');
    setTemporalStatus('');
    setEixoId('');
    setMunicipioId('');
    setRegiao('');
    setSourceUrl('');
    setFile(null);
    setInputMode('text');
    setTemaIds([]);
    setAllTemas(false);

    if (!preselectedAgentId) {
      setScope('global');
      setTargetAgentId('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const triggerChunking = async (documentId: string) => {
    try {
      await supabase.functions.invoke('process-document-chunks', {
        body: { document_id: documentId },
      });
    } catch (e) {
      console.error('Chunking trigger failed (non-blocking):', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !docCategory) {
      toast({ title: "Campos obrigatórios", description: "Preencha título e categoria do documento", variant: "destructive" });
      return;
    }

    if (!allTemas && temaIds.length === 0) {
      toast({
        title: "Selecione ao menos 1 tema",
        description: "Ou marque \"Documento transversal\" se ele abrange todos os temas (ex.: Plano de Governo).",
        variant: "destructive",
      });
      return;
    }


    if (scope === 'agent_specific' && !targetAgentId) {
      toast({ title: "Selecione um agente", description: "Escolha o agente para vincular o documento", variant: "destructive" });
      return;
    }

    if (inputMode === 'text' && !content.trim()) {
      toast({ title: "Conteúdo obrigatório", description: "Cole ou digite o conteúdo do documento", variant: "destructive" });
      return;
    }

    if (inputMode === 'file' && !file) {
      toast({ title: "Arquivo obrigatório", description: "Selecione um arquivo para upload", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;
      let documentContent = content;

      if (inputMode === 'file' && file) {
        fileName = file.name;
        fileType = file.type;
        const fileExt = file.name.split('.').pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('ai-documents').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('ai-documents').getPublicUrl(filePath);
        fileUrl = publicUrl;

        if (file.type === 'text/plain') {
          documentContent = await file.text();
        } else {
          documentContent = `[Arquivo: ${file.name}]\n\nConteúdo disponível em: ${publicUrl}\n\n${description || 'Sem descrição adicional.'}`;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { data: newDoc, error: insertError } = await supabase
        .from('ai_documents')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          content: documentContent,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          doc_category: docCategory,
          temporal_status: temporalStatus || null,
          eixo_id: eixoId || null,
          municipio_id: municipioId || null,
          regiao: regiao || null,
          source_url: sourceUrl.trim() || null,
          uploaded_by: user?.id || null,
          is_active: true,
          scope,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Vincular temas (multi) — transversal vincula todos os temas
      if (newDoc) {
        let idsParaVincular = temaIds;
        if (allTemas) {
          const { data: todos } = await supabase.from('temas').select('id');
          idsParaVincular = (todos || []).map(t => t.id);
        }
        if (idsParaVincular.length > 0) {
          const links = idsParaVincular.map(tema_id => ({ document_id: newDoc.id, tema_id }));
          const { error: linkError } = await supabase.from('ai_document_temas').insert(links);
          if (linkError) console.error('Falha ao vincular temas:', linkError);
        }
      }



      // Auto-link to agent if agent_specific
      if (newDoc && scope === 'agent_specific' && targetAgentId) {
        await supabase.from('ai_agent_documents').insert({
          agent_id: targetAgentId,
          document_id: newDoc.id,
        });
      }

      // Trigger async chunking for RAG
      if (newDoc) {
        triggerChunking(newDoc.id);
      }

      toast({ title: "Documento adicionado!", description: "O documento foi adicionado à base de conhecimento" });
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({ title: "Erro ao adicionar documento", description: error instanceof Error ? error.message : "Tente novamente", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMunicipios = regiao 
    ? municipios.filter(m => m.regiao === regiao)
    : municipios;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Adicionar Documento à Base
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Scope Selector */}
          <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
            <Label className="text-sm font-medium">Este documento é para:</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={scope === 'global' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setScope('global'); setTargetAgentId(''); }}
                disabled={!!preselectedAgentId}
              >
                <Globe className="w-4 h-4 mr-2" />
                Biblioteca Global
              </Button>
              <Button
                type="button"
                variant={scope === 'agent_specific' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setScope('agent_specific')}
                disabled={!!preselectedAgentId}
              >
                <Bot className="w-4 h-4 mr-2" />
                Agente Específico
              </Button>
            </div>
            {scope === 'global' && (
              <p className="text-xs text-muted-foreground">Disponível para todos os agentes de IA.</p>
            )}
            {scope === 'agent_specific' && (
              <div className="mt-2">
                <Select value={targetAgentId || "__none__"} onValueChange={(v) => setTargetAgentId(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o agente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione o agente</SelectItem>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do documento" required />
          </div>

          {/* Input Mode Toggle */}
          <div className="space-y-2">
            <Label>Conteúdo</Label>
            <div className="flex gap-2">
              <Button type="button" variant={inputMode === 'text' ? 'default' : 'outline'} size="sm" onClick={() => setInputMode('text')}>
                <FileText className="w-4 h-4 mr-2" />
                Colar Texto
              </Button>
              <Button type="button" variant={inputMode === 'file' ? 'default' : 'outline'} size="sm" onClick={() => setInputMode('file')}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Arquivo
              </Button>
            </div>
          </div>

          {/* Content Input */}
          {inputMode === 'text' ? (
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Cole o conteúdo do documento aqui..." className="min-h-[150px]" />
          ) : (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input type="file" id="file-upload" className="hidden" accept=".pdf,.doc,.docx,.txt,.xlsx,.xls" onChange={handleFileChange} />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <FileText className="w-8 h-8" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p>Clique para selecionar um arquivo</p>
                    <p className="text-xs">PDF, DOC, DOCX, TXT, XLS, XLSX</p>
                  </div>
                )}
              </label>
            </div>
          )}

          {/* Category and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={docCategory} onValueChange={setDocCategory} required>
                <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status Temporal</Label>
              <Select value={temporalStatus || "__none__"} onValueChange={(v) => setTemporalStatus(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não se aplica</SelectItem>
                  {TEMPORAL_STATUS.map(status => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Eixo */}
          <div className="space-y-2">
            <Label>Eixo Temático</Label>
            <Select value={eixoId || "__none__"} onValueChange={(v) => setEixoId(v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o eixo (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Todos os eixos / Não se aplica</SelectItem>
                {eixos.map(eixo => (
                  <SelectItem key={eixo.id} value={eixo.id}>{eixo.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Temas vinculados */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Temas vinculados {!allTemas && <span className="text-destructive">*</span>}
            </Label>
            <label className="flex items-start gap-2 rounded-md border p-2 text-sm cursor-pointer bg-muted/30">
              <Checkbox
                checked={allTemas}
                onCheckedChange={(v) => setAllTemas(v === true)}
                className="mt-0.5"
              />
              <span>
                Documento transversal — abrange <strong>todos os temas</strong>
                <span className="block text-xs text-muted-foreground">
                  Use para Plano de Governo, diretrizes gerais e documentos institucionais.
                </span>
              </span>
            </label>
            {!allTemas && (
              <p className="text-xs text-muted-foreground">
                Selecione os temas a que este documento se refere. A IA usará apenas
                documentos vinculados ao tema da entrevista para fazer o cruzamento,
                evitando misturar fontes não relacionadas.
              </p>
            )}
            {!allTemas && <TemasMultiSelect value={temaIds} onChange={setTemaIds} />}
          </div>


          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Região</Label>
              <Select value={regiao || "__none__"} onValueChange={(v) => { setRegiao(v === "__none__" ? "" : v); setMunicipioId(""); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a região" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todas as regiões</SelectItem>
                  {regioes.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Município</Label>
              <Select value={municipioId || "__none__"} onValueChange={(v) => setMunicipioId(v === "__none__" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o município" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Todos os municípios</SelectItem>
                  {filteredMunicipios.map(m => (<SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição breve do documento (opcional)" className="min-h-[80px]" />
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <LinkIcon className="w-3.5 h-3.5" />
              URL da Fonte
            </Label>
            <Input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://exemplo.com/documento (opcional)" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>) : (<><Upload className="w-4 h-4 mr-2" />Salvar Documento</>)}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default DocumentUploadModal;
