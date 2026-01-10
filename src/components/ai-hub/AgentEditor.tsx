import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bot, Plus, X, FileText, Users } from 'lucide-react';
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

interface AgentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AIAgent | null;
  onSuccess: () => void;
}

export const AgentEditor = ({ open, onOpenChange, agent, onSuccess }: AgentEditorProps) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error('Nome e instruções são obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      let agentId = agent?.id;

      if (agent) {
        // Update existing agent
        const { error } = await supabase
          .from('ai_agent_config')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            system_prompt: systemPrompt.trim(),
            target_audience: targetAudience,
            conversation_starters: conversationStarters,
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
            conversation_starters: conversationStarters,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-500" />
            {agent ? 'Editar Agente' : 'Criar Novo Agente'}
          </DialogTitle>
          <DialogDescription>
            Configure as instruções e comportamento do agente de IA
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4">
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
                      <div 
                        key={func.id}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          allowedFunctionIds.includes(func.id) 
                            ? 'bg-primary/10 border border-primary/30' 
                            : 'hover:bg-muted/50 border border-transparent'
                        }`}
                        onClick={() => toggleFunction(func.id)}
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
                      </div>
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
                <Label>Base de Conhecimento</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Vincule documentos que o agente deve usar como referência
                </p>
                
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Nenhum documento disponível na biblioteca
                  </p>
                ) : (
                  <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {documents.map((doc) => (
                      <div 
                        key={doc.id}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => toggleDocument(doc.id)}
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
                      </div>
                    ))}
                  </div>
                )}
                
                {linkedDocIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {linkedDocIds.length} documento(s) selecionado(s)
                  </p>
                )}
              </div>
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
