import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Bot, MessageSquare, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AgentCard } from '@/components/ai-hub/AgentCard';
import { AgentEditor } from '@/components/ai-hub/AgentEditor';
import { AgentChat } from '@/components/ai-hub/AgentChat';

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

const AdminAIHub = () => {
  const { user, isLoading: authLoading, isAdmin, hasRole } = useAuth();
  const navigate = useNavigate();
  
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [chatAgent, setChatAgent] = useState<AIAgent | null>(null);

  const canManageAgents = isAdmin || hasRole('admin_master');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agent_config')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedAgents: AIAgent[] = (data || []).map(agent => ({
        ...agent,
        conversation_starters: Array.isArray(agent.conversation_starters) 
          ? agent.conversation_starters as string[]
          : [],
        config: (agent.config as Record<string, unknown>) || {}
      }));

      setAgents(formattedAgents);
    } catch (error) {
      console.error('Error fetching agents:', error);
      toast.error('Erro ao carregar agentes');
    } finally {
      setIsLoading(false);
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
    fetchAgents();
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
    return (
      <AgentChat 
        agent={chatAgent} 
        onClose={() => setChatAgent(null)} 
      />
    );
  }

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
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum agente criado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro agente de IA para começar
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
            {agents.map((agent, index) => (
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
      </main>

      {/* Agent Editor Modal */}
      <AgentEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        agent={editingAgent}
        onSuccess={handleEditorSuccess}
      />
    </div>
  );
};

export default AdminAIHub;
