import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Plus, X, FileText, Users, Upload, Database, Loader2, Settings2, Maximize2, Minimize2 } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface AIAgent {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  agent_type: string;
  is_active: boolean;
  avatar_url: string | null;
  conversation_starters: string[];
  target_audience: string | null;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface AIDocument {
  id: string;
  title: string;
  doc_category: string;
}

interface AIHubFunction {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
}

interface ExtendedSearchConfig {
  enabled: boolean;
  sources: {
    ai_documents: boolean;
    propostas_tecnicas: boolean;
    sugestoes_populares: boolean;
  };
  doc_categories: string[];
  temporal_status: string[];
}

interface AgentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AIAgent | null;
  onSuccess: () => void;
  isAdminMaster?: boolean;
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

const DEFAULT_EXTENDED_SEARCH: ExtendedSearchConfig = {
  enabled: false,
  sources: {
    ai_documents: false,
    propostas_tecnicas: false,
    sugestoes_populares: false,
  },
  doc_categories: [],
  temporal_status: [],
};

export const AgentEditor = ({ open, onOpenChange, agent, onSuccess, isAdminMaster = false }: AgentEditorProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documents, setDocuments] = useState<AIDocument[]>([]);
  const [linkedDocIds, setLinkedDocIds] = useState<string[]>([]);
  const [hubFunctions, setHubFunctions] = useState<AIHubFunction[]>([]);
  const [allowedFunctionIds, setAllowedFunctionIds] = useState<string[]>([]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [targetAudience, setTargetAudience] = useState<string>('geral');
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);
  const [newStarter, setNewStarter] = useState('');

  // File upload state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadContent, setUploadContent] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');

  // Extended search config (admin_master only)
  const [extendedSearch, setExtendedSearch] = useState<ExtendedSearchConfig>(DEFAULT_EXTENDED_SEARCH);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDocuments();
      fetchHubFunctions();
      if (agent) {
        // Editing existing agent
        setName(agent.name);
        setDescription(agent.description || '');
        setSystemPrompt(agent.system_prompt);
        setTargetAudience(agent.target_audience || 'geral');
        setConversationStarters(Array.isArray(agent.conversation_starters) ? agent.conversation_starters : []);
        fetchLinkedDocuments(agent.id);
        fetchAllowedFunctions(agent.id);
        
        // Load extended search config
        const agentConfig = agent.config || {};
        const extSearch = agentConfig.extended_search as ExtendedSearchConfig | undefined;
        if (extSearch) {
          setExtendedSearch({
            enabled: extSearch.enabled ?? false,
            sources: {
              ai_documents: extSearch.sources?.ai_documents ?? false,
              propostas_tecnicas: extSearch.sources?.propostas_tecnicas ?? false,
              sugestoes_populares: extSearch.sources?.sugestoes_populares ?? false,
            },
            doc_categories: extSearch.doc_categories || [],
            temporal_status: extSearch.temporal_status || [],
          });
        } else {
          setExtendedSearch(DEFAULT_EXTENDED_SEARCH);
        }
      } else {
        // Creating new agent
        resetForm();
      }
    }
  }, [open, agent?.id]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSystemPrompt('');
    setTargetAudience('geral');
    setConversationStarters([]);
    setLinkedDocIds([]);
    setAllowedFunctionIds([]);
    setNewStarter('');
    setShowUploadForm(false);
    setUploadTitle('');
    setUploadFile(null);
    setUploadContent('');
    setUploadMode('file');
    setExtendedSearch(DEFAULT_EXTENDED_SEARCH);
    setAdvancedOpen(false);
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_documents')
        .select('id, title, doc_category')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchHubFunctions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_hub_functions')
        .select('*')
        .order('display_name');

      if (error) throw error;
      setHubFunctions(data || []);
    } catch (error) {
      console.error('Error fetching hub functions:', error);
    }
  };

  const fetchLinkedDocuments = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_agent_documents')
        .select('document_id')
        .eq('agent_id', agentId);

      if (error) throw error;
      setLinkedDocIds((data || []).map(d => d.document_id));
    } catch (error) {
      console.error('Error fetching linked documents:', error);
    }
  };

  const fetchAllowedFunctions = async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_agent_allowed_functions')
        .select('function_id')
        .eq('agent_id', agentId);

      if (error) throw error;
      setAllowedFunctionIds((data || []).map(f => f.function_id));
    } catch (error) {
      console.error('Error fetching allowed functions:', error);
    }
  };

  const addConversationStarter = () => {
    if (newStarter.trim() && conversationStarters.length < 5) {
      setConversationStarters([...conversationStarters, newStarter.trim()]);
      setNewStarter('');
    }
  };

  const removeConversationStarter = (index: number) => {
    setConversationStarters(conversationStarters.filter((_, i) => i !== index));
  };

  const toggleDocument = (docId: string) => {
    setLinkedDocIds(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const toggleFunction = (funcId: string) => {
    setAllowedFunctionIds(prev =>
      prev.includes(funcId)
        ? prev.filter(id => id !== funcId)
        : [...prev, funcId]
    );
  };

  // File upload handler
  const handleFileUpload = async () => {
    if (!uploadTitle.trim()) {
      toast.error('Título do documento é obrigatório');
      return;
    }

    if (uploadMode === 'file' && !uploadFile) {
      toast.error('Selecione um arquivo');
      return;
    }

    if (uploadMode === 'text' && !uploadContent.trim()) {
      toast.error('Conteúdo do documento é obrigatório');
      return;
    }

    setIsUploadingFile(true);

    try {
      let fileUrl = null;
      let fileName = null;
      let fileType = null;
      let documentContent = uploadContent;

      // Handle file upload
      if (uploadMode === 'file' && uploadFile) {
        fileName = uploadFile.name;
        fileType = uploadFile.type;
        
        const fileExt = uploadFile.name.split('.').pop();
        const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ai-documents')
          .upload(filePath, uploadFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('ai-documents')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;

        // For text files, read content
        if (uploadFile.type === 'text/plain') {
          documentContent = await uploadFile.text();
        } else {
          documentContent = `[Arquivo: ${uploadFile.name}]\n\nConteúdo disponível em: ${publicUrl}`;
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert document
      const { data: newDoc, error: insertError } = await supabase
        .from('ai_documents')
        .insert({
          title: uploadTitle.trim(),
          content: documentContent,
          file_url: fileUrl,
          file_name: fileName,
          file_type: fileType,
          doc_category: 'outro',
          uploaded_by: user?.id || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add to linked documents
      if (newDoc) {
        setLinkedDocIds(prev => [...prev, newDoc.id]);
        setDocuments(prev => [...prev, { id: newDoc.id, title: newDoc.title, doc_category: newDoc.doc_category }]);
      }

      toast.success('Documento adicionado à base do agente');
      setShowUploadForm(false);
      setUploadTitle('');
      setUploadFile(null);
      setUploadContent('');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Erro ao adicionar documento');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const toggleDocCategory = (category: string) => {
    setExtendedSearch(prev => ({
      ...prev,
      doc_categories: prev.doc_categories.includes(category)
        ? prev.doc_categories.filter(c => c !== category)
        : [...prev.doc_categories, category]
    }));
  };

  const toggleTemporalStatus = (status: string) => {
    setExtendedSearch(prev => ({
      ...prev,
      temporal_status: prev.temporal_status.includes(status)
        ? prev.temporal_status.filter(s => s !== status)
        : [...prev.temporal_status, status]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error('Nome e instruções são obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      let agentId = agent?.id;

      // Build config with extended search - using JSON.parse/stringify to ensure Json compatibility
      const configData = JSON.parse(JSON.stringify({
        ...(agent?.config || {}),
        extended_search: extendedSearch,
      })) as Json;

      if (agent) {
        // Update existing agent
        const { error } = await supabase
          .from('ai_agent_config')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            system_prompt: systemPrompt.trim(),
            target_audience: targetAudience,
            conversation_starters: conversationStarters as unknown as Json,
            config: configData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', agent.id);

        if (error) throw error;
      } else {
        // Create new agent
        const { data, error } = await supabase
          .from('ai_agent_config')
          .insert({
            name: name.trim(),
            description: description.trim() || null,
            system_prompt: systemPrompt.trim(),
            target_audience: targetAudience,
            conversation_starters: conversationStarters as unknown as Json,
            config: configData,
            agent_type: 'custom',
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        agentId = data.id;
      }

      // Update document links
      if (agentId) {
        // Delete existing document links
        await supabase
          .from('ai_agent_documents')
          .delete()
          .eq('agent_id', agentId);

        // Insert new document links
        if (linkedDocIds.length > 0) {
          const { error: linkError } = await supabase
            .from('ai_agent_documents')
            .insert(
              linkedDocIds.map(docId => ({
                agent_id: agentId,
                document_id: docId,
              }))
            );

          if (linkError) throw linkError;
        }

        // Delete existing function links
        await supabase
          .from('ai_agent_allowed_functions')
          .delete()
          .eq('agent_id', agentId);

        // Insert new function links
        if (allowedFunctionIds.length > 0) {
          const { error: funcError } = await supabase
            .from('ai_agent_allowed_functions')
            .insert(
              allowedFunctionIds.map(funcId => ({
                agent_id: agentId,
                function_id: funcId,
              }))
            );

          if (funcError) throw funcError;
        }
      }

      toast.success(agent ? 'Agente atualizado com sucesso' : 'Agente criado com sucesso');
      onSuccess();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error('Erro ao salvar agente');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`transition-all duration-300 ${isFullscreen ? 'max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh]' : 'max-w-2xl max-h-[90vh]'}`}>
        <DialogHeader className="flex flex-row items-start justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-violet-500" />
              {agent ? 'Editar Agente' : 'Criar Novo Agente'}
            </DialogTitle>
            <DialogDescription>
              Configure as instruções e comportamento do agente de IA
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8 w-8 shrink-0"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className={`pr-4 ${isFullscreen ? 'h-[calc(95vh-180px)]' : 'h-[calc(90vh-180px)]'}`}>
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Agente *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Assistente de Campanha"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="audience">Público-alvo</Label>
                    <Select value={targetAudience} onValueChange={setTargetAudience}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geral">Geral</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="politico">Político</SelectItem>
                        <SelectItem value="eleitoral">Eleitoral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva brevemente o propósito deste agente..."
                    rows={2}
                  />
                </div>
              </div>

              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Instruções (System Prompt) *</Label>
                <Textarea
                  id="prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Defina como o agente deve se comportar, qual seu papel, tom de voz, conhecimentos específicos..."
                  rows={6}
                  required
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Estas instruções definem a personalidade e comportamento do agente.
                </p>
              </div>

              {/* Allowed Functions (Permissions) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Acesso por Função Profissional
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecione quais funções profissionais podem acessar este agente. 
                  Se nenhuma for selecionada, apenas admin_master terá acesso.
                </p>
                
                {hubFunctions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
                    Nenhuma função cadastrada. Crie funções na aba de gestão.
                  </p>
                ) : (
                  <div className="border rounded-lg p-3 grid grid-cols-2 gap-2">
                    {hubFunctions.map((func) => (
                      <label 
                        key={func.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          allowedFunctionIds.includes(func.id) 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <Checkbox 
                          checked={allowedFunctionIds.includes(func.id)}
                          onCheckedChange={() => toggleFunction(func.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{func.display_name}</p>
                          {func.description && (
                            <p className="text-xs text-muted-foreground truncate">{func.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                
                {allowedFunctionIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {allowedFunctionIds.length} função(ões) selecionada(s)
                  </p>
                )}
              </div>

              {/* Conversation Starters */}
              <div className="space-y-2">
                <Label>Sugestões de Conversa</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Adicione até 5 sugestões que aparecerão como chips clicáveis
                </p>
                
                <div className="flex gap-2">
                  <Input
                    value={newStarter}
                    onChange={(e) => setNewStarter(e.target.value)}
                    placeholder="Ex: Quais são as principais propostas?"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addConversationStarter();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addConversationStarter}
                    disabled={conversationStarters.length >= 5}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {conversationStarters.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {conversationStarters.map((starter, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1 py-1">
                        {starter}
                        <button
                          type="button"
                          onClick={() => removeConversationStarter(idx)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Document Links */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Base de Conhecimento
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Vincule documentos que o agente deve usar como referência
                </p>
                
                {/* Upload New Document Section */}
                <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                  {!showUploadForm ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setShowUploadForm(true)}
                    >
                      <Upload className="w-4 h-4" />
                      Adicionar Novo Documento
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Novo Documento</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowUploadForm(false);
                            setUploadTitle('');
                            setUploadFile(null);
                            setUploadContent('');
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <Input
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="Título do documento"
                      />

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={uploadMode === 'file' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUploadMode('file')}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Arquivo
                        </Button>
                        <Button
                          type="button"
                          variant={uploadMode === 'text' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setUploadMode('text')}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          Texto
                        </Button>
                      </div>

                      {uploadMode === 'file' ? (
                        <div className="border-2 border-dashed rounded-lg p-4 text-center">
                          <input
                            type="file"
                            id="agent-file-upload"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setUploadFile(file);
                                if (!uploadTitle) {
                                  setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
                                }
                              }
                            }}
                          />
                          <label htmlFor="agent-file-upload" className="cursor-pointer">
                            {uploadFile ? (
                              <div className="flex items-center justify-center gap-2 text-primary">
                                <FileText className="w-6 h-6" />
                                <div className="text-left">
                                  <p className="font-medium text-sm">{uploadFile.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">
                                <Upload className="w-6 h-6 mx-auto mb-1" />
                                <p className="text-sm">Clique para selecionar</p>
                                <p className="text-xs">PDF, DOC, TXT, XLS</p>
                              </div>
                            )}
                          </label>
                        </div>
                      ) : (
                        <Textarea
                          value={uploadContent}
                          onChange={(e) => setUploadContent(e.target.value)}
                          placeholder="Cole o conteúdo do documento..."
                          rows={4}
                        />
                      )}

                      <Button
                        type="button"
                        onClick={handleFileUpload}
                        disabled={isUploadingFile}
                        className="w-full gap-2"
                      >
                        {isUploadingFile ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Adicionar à Base
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Existing Documents */}
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum documento disponível na biblioteca
                  </p>
                ) : (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {documents.map((doc) => (
                      <label 
                        key={doc.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          linkedDocIds.includes(doc.id) 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <Checkbox 
                          checked={linkedDocIds.includes(doc.id)}
                          onCheckedChange={() => toggleDocument(doc.id)}
                        />
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.doc_category}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                
                {linkedDocIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {linkedDocIds.length} documento(s) selecionado(s)
                  </p>
                )}
              </div>

              {/* Advanced Settings - Admin Master Only */}
              {isAdminMaster && (
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        Configurações Avançadas
                      </span>
                      <Badge variant={extendedSearch.enabled ? "default" : "secondary"}>
                        {extendedSearch.enabled ? "Ativo" : "Inativo"}
                      </Badge>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4 border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="flex items-center gap-2">
                          <Database className="w-4 h-4" />
                          Busca Expandida
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Permite ao agente acessar bases de dados adicionais
                        </p>
                      </div>
                      <Switch
                        checked={extendedSearch.enabled}
                        onCheckedChange={(checked) => 
                          setExtendedSearch(prev => ({ ...prev, enabled: checked }))
                        }
                      />
                    </div>

                    {extendedSearch.enabled && (
                      <div className="space-y-4 pt-2 border-t">
                        {/* Data Sources */}
                        <div className="space-y-2">
                          <Label className="text-sm">Fontes de Dados</Label>
                          <div className="space-y-2">
                            <label 
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                extendedSearch.sources.propostas_tecnicas 
                                  ? 'bg-green-500/10 border border-green-500/30' 
                                  : 'bg-muted/50 hover:bg-muted'
                              }`}
                            >
                              <Checkbox 
                                checked={extendedSearch.sources.propostas_tecnicas}
                                onCheckedChange={(checked) => setExtendedSearch(prev => ({
                                  ...prev,
                                  sources: { ...prev.sources, propostas_tecnicas: !!checked }
                                }))}
                              />
                              <div>
                                <p className="text-sm font-medium">Propostas Técnicas</p>
                                <p className="text-xs text-muted-foreground">
                                  Acessa propostas técnicas aprovadas e em análise
                                </p>
                              </div>
                            </label>

                            <label 
                              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                extendedSearch.sources.sugestoes_populares 
                                  ? 'bg-orange-500/10 border border-orange-500/30' 
                                  : 'bg-muted/50 hover:bg-muted'
                              }`}
                            >
                              <Checkbox 
                                checked={extendedSearch.sources.sugestoes_populares}
                                onCheckedChange={(checked) => setExtendedSearch(prev => ({
                                  ...prev,
                                  sources: { ...prev.sources, sugestoes_populares: !!checked }
                                }))}
                              />
                              <div>
                                <p className="text-sm font-medium">Sugestões Populares</p>
                                <p className="text-xs text-muted-foreground">
                                  Acessa sugestões enviadas pelos cidadãos
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : agent ? 'Salvar Alterações' : 'Criar Agente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
