import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Bot, MessageSquare, Users, Sparkles, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { AgentCard } from '@/components/ai-hub/AgentCard';
import { AgentEditor } from '@/components/ai-hub/AgentEditor';
import { AgentChat } from '@/components/ai-hub/AgentChat';
import { ResearchAnalystChat } from '@/components/ai-hub/ResearchAnalystChat';

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

interface AIHubFunction {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

const AdminAIHub = () => {
  const { user, isLoading: authLoading, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [hubFunctions, setHubFunctions] = useState<AIHubFunction[]>([]);
  const [userFunctionIds, setUserFunctionIds] = useState<string[]>([]);
  const [agentAllowedFunctions, setAgentAllowedFunctions] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [chatAgent, setChatAgent] = useState<AIAgent | null>(null);
  
  // New function form
  const [newFunctionName, setNewFunctionName] = useState('');
  const [newFunctionDisplayName, setNewFunctionDisplayName] = useState('');
  const [newFunctionDescription, setNewFunctionDescription] = useState('');

  const isAdminMaster = hasRole('admin_master');
  const canManageAgents = isAdmin || isAdminMaster;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchAgents(),
        fetchHubFunctions(),
        fetchUserFunctions(),
        fetchAgentAllowedFunctions(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agent_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAgents: AIAgent[] = (data || []).map(agent => {
        let starters: string[] = [];
        if (Array.isArray(agent.conversation_starters)) {
          starters = agent.conversation_starters as string[];
        } else if (typeof agent.conversation_starters === 'string') {
          try {
            starters = JSON.parse(agent.conversation_starters);
          } catch {
            starters = [];
          }
        }
        
        return {
          ...agent,
          conversation_starters: starters,
          config: (agent.config as Record<string, unknown>) || {}
        };
      });

      setAgents(formattedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Erro ao carregar agentes');
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

  const fetchUserFunctions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_ai_hub_functions')
        .select('function_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserFunctionIds((data || []).map(f => f.function_id));
    } catch (error) {
      console.error('Error fetching user functions:', error);
    }
  };

  const fetchAgentAllowedFunctions = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agent_allowed_functions')
        .select('agent_id, function_id');

      if (error) throw error;
      
      const mapping: Record<string, string[]> = {};
      (data || []).forEach(row => {
        if (!mapping[row.agent_id]) {
          mapping[row.agent_id] = [];
        }
        mapping[row.agent_id].push(row.function_id);
      });
      
      setAgentAllowedFunctions(mapping);
    } catch (error) {
      console.error('Error fetching agent allowed functions:', error);
    }
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setEditorOpen(true);
  };

  const handleEditAgent = (agent: AIAgent) => {
    setEditingAgent(agent);
    setEditorOpen(true);
  };

  const handleChatAgent = (agent: AIAgent) => {
    setChatAgent(agent);
  };

  const handleDeleteAgent = async (agentId: string) => {
    try {
      const { error } = await supabase
        .from('ai_agent_config')
        .delete()
        .eq('id', agentId);

      if (error) throw error;

      setAgents(prev => prev.filter(a => a.id !== agentId));
      toast.success('Agente excluído com sucesso');
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Erro ao excluir agente');
    }
  };

  const handleToggleActive = async (agentId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('ai_agent_config')
        .update({ is_active: isActive })
        .eq('id', agentId);

      if (error) throw error;

      setAgents(prev => prev.map(a => 
        a.id === agentId ? { ...a, is_active: isActive } : a
      ));
      toast.success(isActive ? 'Agente ativado' : 'Agente desativado');
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast.error('Erro ao alterar status do agente');
    }
  };

  const handleEditorSuccess = () => {
    setEditorOpen(false);
    setEditingAgent(null);
    fetchData();
  };

  const handleCreateFunction = async () => {
    if (!newFunctionDisplayName.trim()) {
      toast.error('Nome da função é obrigatório');
      return;
    }

    const name = newFunctionName.trim() || newFunctionDisplayName.trim().toLowerCase().replace(/\s+/g, '_');

    try {
      const { error } = await supabase
        .from('ai_hub_functions')
        .insert({
          name,
          display_name: newFunctionDisplayName.trim(),
          description: newFunctionDescription.trim() || null,
          is_system: false,
        });

      if (error) throw error;

      toast.success('Função criada com sucesso');
      setNewFunctionName('');
      setNewFunctionDisplayName('');
      setNewFunctionDescription('');
      fetchHubFunctions();
    } catch (error) {
      console.error('Error creating function:', error);
      toast.error('Erro ao criar função');
    }
  };

  const handleDeleteFunction = async (funcId: string) => {
    try {
      const { error } = await supabase
        .from('ai_hub_functions')
        .delete()
        .eq('id', funcId);

      if (error) throw error;

      toast.success('Função excluída com sucesso');
      fetchHubFunctions();
    } catch (error) {
      console.error('Error deleting function:', error);
      toast.error('Erro ao excluir função');
    }
  };

  // Filter agents based on user permissions
  const getVisibleAgents = (): AIAgent[] => {
    if (isAdminMaster) {
      return agents; // Admin master sees all agents
    }

    // For regular users, filter by their function access
    return agents.filter(agent => {
      const allowedFuncs = agentAllowedFunctions[agent.id] || [];
      
      // If no functions are specified, only admin_master can see
      if (allowedFuncs.length === 0) {
        return false;
      }
      
      // Check if user has any of the allowed functions
      return userFunctionIds.some(funcId => allowedFuncs.includes(funcId));
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // If chat is open, show chat interface
  if (chatAgent) {
    // Use specialized ResearchAnalystChat for pesquisas agents
    if (chatAgent.agent_type === 'pesquisas') {
      return (
        <ResearchAnalystChat 
          agent={chatAgent} 
          onClose={() => setChatAgent(null)} 
        />
      );
    }
    
    return (
      <AgentChat 
        agent={chatAgent} 
        onClose={() => setChatAgent(null)} 
      />
    );
  }

  const visibleAgents = getVisibleAgents();
  const activeAgents = agents.filter(a => a.is_active);
  const audienceStats = {
    marketing: agents.filter(a => a.target_audience === 'marketing').length,
    politico: agents.filter(a => a.target_audience === 'politico').length,
    eleitoral: agents.filter(a => a.target_audience === 'eleitoral').length,
    geral: agents.filter(a => a.target_audience === 'geral' || !a.target_audience).length,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/admin')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-display font-bold text-foreground">
                    HUB de IA
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Estratégias Políticas, Eleitorais e de MKT
                  </p>
                </div>
              </div>
            </div>
            {canManageAgents && (
              <Button onClick={handleCreateAgent} className="gap-2">
                <Plus className="w-4 h-4" />
                Criar Agente
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="agents" className="gap-2">
              <Bot className="w-4 h-4" />
              Agentes
            </TabsTrigger>
            {isAdminMaster && (
              <TabsTrigger value="functions" className="gap-2">
                <Settings className="w-4 h-4" />
                Funções Profissionais
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="agents" className="space-y-6">
            {/* Stats Cards - Only show for admin_master */}
            {isAdminMaster && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                          <Bot className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{agents.length}</p>
                          <p className="text-xs text-muted-foreground">Agentes Totais</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{activeAgents.length}</p>
                          <p className="text-xs text-muted-foreground">Ativos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{audienceStats.marketing}</p>
                          <p className="text-xs text-muted-foreground">Marketing</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{audienceStats.politico + audienceStats.eleitoral}</p>
                          <p className="text-xs text-muted-foreground">Político/Eleitoral</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}

            {/* Agents Grid */}
            {visibleAgents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {isAdminMaster ? 'Nenhum agente criado' : 'Nenhum agente disponível'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {isAdminMaster 
                      ? 'Crie seu primeiro agente de IA para começar'
                      : 'Você ainda não tem acesso a nenhum agente de IA'}
                  </p>
                  {canManageAgents && (
                    <Button onClick={handleCreateAgent}>
                      <Plus className="w-4 h-4 mr-2" />
                      Criar Primeiro Agente
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleAgents.map((agent, index) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <AgentCard
                      agent={agent}
                      canManage={canManageAgents}
                      onEdit={() => handleEditAgent(agent)}
                      onChat={() => handleChatAgent(agent)}
                      onDelete={() => handleDeleteAgent(agent.id)}
                      onToggleActive={(isActive) => handleToggleActive(agent.id, isActive)}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {isAdminMaster && (
            <TabsContent value="functions" className="space-y-6">
              {/* Create New Function */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Criar Nova Função
                  </CardTitle>
                  <CardDescription>
                    Adicione funções profissionais para controlar o acesso aos agentes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="funcDisplayName">Nome de Exibição *</Label>
                      <Input
                        id="funcDisplayName"
                        value={newFunctionDisplayName}
                        onChange={(e) => setNewFunctionDisplayName(e.target.value)}
                        placeholder="Ex: Assessor de Imprensa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="funcName">Identificador (opcional)</Label>
                      <Input
                        id="funcName"
                        value={newFunctionName}
                        onChange={(e) => setNewFunctionName(e.target.value)}
                        placeholder="Ex: assessor_imprensa"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="funcDesc">Descrição</Label>
                      <Input
                        id="funcDesc"
                        value={newFunctionDescription}
                        onChange={(e) => setNewFunctionDescription(e.target.value)}
                        placeholder="Breve descrição da função"
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateFunction} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Criar Função
                  </Button>
                </CardContent>
              </Card>

              {/* Functions List */}
              <Card>
                <CardHeader>
                  <CardTitle>Funções Cadastradas</CardTitle>
                  <CardDescription>
                    Gerencie as funções profissionais do HUB de IA
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hubFunctions.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma função cadastrada ainda
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {hubFunctions.map((func) => (
                        <div 
                          key={func.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{func.display_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {func.name}
                                {func.is_system && (
                                  <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">
                                    Sistema
                                  </span>
                                )}
                              </p>
                              {func.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {func.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {!func.is_system && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Excluir função "${func.display_name}"?`)) {
                                  handleDeleteFunction(func.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Agent Editor Modal */}
      <AgentEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agent={editingAgent}
        onSuccess={handleEditorSuccess}
        isAdminMaster={isAdminMaster}
      />
    </div>
  );
};

export default AdminAIHub;
