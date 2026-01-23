import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Presentation } from '@/components/ai-hub/slides/types';

export interface Conversation {
  id: string;
  user_id: string;
  agent_id: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  selected_pesquisa_ids: string[];
  presentation: Presentation | null;
  created_at: string;
  updated_at: string;
}

interface UseConversationsResult {
  conversations: Conversation[];
  isLoading: boolean;
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  createConversation: (data: {
    agentId: string;
    title: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    selectedPesquisaIds: string[];
  }) => Promise<string | null>;
  updateConversation: (id: string, data: Partial<{
    title: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    selectedPesquisaIds: string[];
    presentation: Presentation | null;
  }>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  deletePresentation: (id: string) => Promise<void>;
  selectConversation: (id: string | null) => void;
  refreshConversations: () => Promise<void>;
}

export function useConversations(agentId: string): UseConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('ai_chat_conversations')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Transform the data to ensure proper typing
      const typedConversations: Conversation[] = (data || []).map(conv => ({
        ...conv,
        messages: Array.isArray(conv.messages) 
          ? conv.messages as Array<{ role: 'user' | 'assistant'; content: string }>
          : [],
        selected_pesquisa_ids: Array.isArray(conv.selected_pesquisa_ids) 
          ? conv.selected_pesquisa_ids as string[]
          : [],
        presentation: conv.presentation as unknown as Presentation | null,
      }));

      setConversations(typedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = async (data: {
    agentId: string;
    title: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    selectedPesquisaIds: string[];
  }): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado para salvar conversas');
        return null;
      }

      const { data: newConv, error } = await supabase
        .from('ai_chat_conversations')
        .insert({
          user_id: user.id,
          agent_id: data.agentId,
          title: data.title,
          messages: data.messages,
          selected_pesquisa_ids: data.selectedPesquisaIds,
        })
        .select()
        .single();

      if (error) throw error;

      const typedConv: Conversation = {
        ...newConv,
        messages: Array.isArray(newConv.messages) 
          ? newConv.messages as Array<{ role: 'user' | 'assistant'; content: string }>
          : [],
        selected_pesquisa_ids: Array.isArray(newConv.selected_pesquisa_ids) 
          ? newConv.selected_pesquisa_ids as string[]
          : [],
        presentation: newConv.presentation as unknown as Presentation | null,
      };

      setConversations(prev => [typedConv, ...prev]);
      setActiveConversationId(typedConv.id);
      
      return typedConv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Erro ao salvar conversa');
      return null;
    }
  };

  const updateConversation = async (id: string, data: Partial<{
    title: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    selectedPesquisaIds: string[];
    presentation: Presentation | null;
  }>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.messages !== undefined) updateData.messages = data.messages;
      if (data.selectedPesquisaIds !== undefined) updateData.selected_pesquisa_ids = data.selectedPesquisaIds;
      if (data.presentation !== undefined) updateData.presentation = data.presentation;
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('ai_chat_conversations')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => 
        prev.map(conv => 
          conv.id === id 
            ? { 
                ...conv, 
                title: data.title ?? conv.title,
                messages: data.messages ?? conv.messages,
                selected_pesquisa_ids: data.selectedPesquisaIds ?? conv.selected_pesquisa_ids,
                presentation: data.presentation !== undefined ? data.presentation : conv.presentation,
                updated_at: new Date().toISOString() 
              } 
            : conv
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    } catch (error) {
      console.error('Error updating conversation:', error);
      toast.error('Erro ao atualizar conversa');
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_chat_conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== id));
      
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
      
      toast.success('Conversa excluída');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Erro ao excluir conversa');
    }
  };

  const deletePresentation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ai_chat_conversations')
        .update({ presentation: null, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setConversations(prev => 
        prev.map(conv => 
          conv.id === id 
            ? { ...conv, presentation: null, updated_at: new Date().toISOString() } 
            : conv
        )
      );
      
      toast.success('Apresentação excluída');
    } catch (error) {
      console.error('Error deleting presentation:', error);
      toast.error('Erro ao excluir apresentação');
    }
  };

  const selectConversation = (id: string | null) => {
    setActiveConversationId(id);
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  return {
    conversations,
    isLoading,
    activeConversationId,
    activeConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    deletePresentation,
    selectConversation,
    refreshConversations: fetchConversations,
  };
}
