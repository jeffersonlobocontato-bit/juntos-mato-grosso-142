import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type AgentConfig = {
  id: string;
  agent_type: string;
  system_prompt: string;
  config: unknown;
  is_active: boolean;
};

type KnowledgeDoc = {
  id: string;
  title: string;
  content: string;
  doc_type: string;
  priority: number;
  is_active: boolean;
};

interface AIConfigPanelProps {
  isAdmin: boolean;
}

const AIConfigPanel = ({ isAdmin }: AIConfigPanelProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Agent config state
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  
  // Knowledge base state
  const [documents, setDocuments] = useState<KnowledgeDoc[]>([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch agent config
      const { data: configData, error: configError } = await supabase
        .from('ai_agent_config')
        .select('*')
        .eq('agent_type', 'plano_governo')
        .single();

      if (configError && configError.code !== 'PGRST116') {
        console.error('Error fetching config:', configError);
      }
      
      if (configData) {
        setAgentConfig(configData);
        setEditedPrompt(configData.system_prompt);
      }

      // Fetch knowledge base
      const { data: docsData, error: docsError } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .order('priority', { ascending: false });

      if (docsError) {
        console.error('Error fetching docs:', docsError);
      }
      
      if (docsData) {
        setDocuments(docsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePrompt = async () => {
    if (!isAdmin || !agentConfig) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ai_agent_config')
        .update({ system_prompt: editedPrompt })
        .eq('id', agentConfig.id);

      if (error) throw error;

      setAgentConfig({ ...agentConfig, system_prompt: editedPrompt });
      toast({
        title: "Sucesso",
        description: "Instrução do agente atualizada com sucesso"
      });
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar a instrução",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addDocument = async () => {
    if (!isAdmin || !newDocTitle.trim() || !newDocContent.trim()) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .insert({
          title: newDocTitle.trim(),
          content: newDocContent.trim(),
          doc_type: 'documento',
          priority: documents.length,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setDocuments([data, ...documents]);
      setNewDocTitle('');
      setNewDocContent('');
      toast({
        title: "Sucesso",
        description: "Documento adicionado à base de conhecimento"
      });
    } catch (error) {
      console.error('Error adding document:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar documento",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDocActive = async (doc: KnowledgeDoc) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .update({ is_active: !doc.is_active })
        .eq('id', doc.id);

      if (error) throw error;

      setDocuments(documents.map(d => 
        d.id === doc.id ? { ...d, is_active: !d.is_active } : d
      ));
    } catch (error) {
      console.error('Error toggling document:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar documento",
        variant: "destructive"
      });
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from('ai_knowledge_base')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      setDocuments(documents.filter(d => d.id !== docId));
      toast({
        title: "Sucesso",
        description: "Documento removido da base de conhecimento"
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover documento",
        variant: "destructive"
      });
    }
  };

  if (!isAdmin) return null;

  return (
    <Card className="mb-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Configuração do Agente de IA
              </span>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* System Prompt Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Instrução do Sistema (System Prompt)
                  </Label>
                  <Textarea
                    value={editedPrompt}
                    onChange={(e) => setEditedPrompt(e.target.value)}
                    placeholder="Digite a instrução do agente..."
                    className="min-h-[150px] text-sm"
                  />
                  <div className="flex justify-end">
                    <Button 
                      onClick={savePrompt} 
                      disabled={isSaving || editedPrompt === agentConfig?.system_prompt}
                      size="sm"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar Instrução
                    </Button>
                  </div>
                </div>

                {/* Knowledge Base Section */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium">Base de Conhecimento</Label>
                  
                  {/* Add new document */}
                  <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <Input
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="Título do documento"
                      className="text-sm"
                    />
                    <Textarea
                      value={newDocContent}
                      onChange={(e) => setNewDocContent(e.target.value)}
                      placeholder="Conteúdo do documento (informações que o agente deve conhecer)..."
                      className="min-h-[80px] text-sm"
                    />
                    <Button 
                      onClick={addDocument}
                      disabled={!newDocTitle.trim() || !newDocContent.trim() || isSaving}
                      size="sm"
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar à Base de Conhecimento
                    </Button>
                  </div>

                  {/* Document list */}
                  {documents.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <div 
                            key={doc.id} 
                            className={`p-3 rounded-lg border ${doc.is_active ? 'bg-card' : 'bg-muted/30 opacity-60'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {doc.content}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={doc.is_active}
                                  onCheckedChange={() => toggleDocActive(doc)}
                                  className="scale-75"
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => deleteDocument(doc.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum documento na base de conhecimento
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AIConfigPanel;
