-- Tabela de conversas de chat com agentes de IA
CREATE TABLE public.ai_chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agent_config(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nova Conversa',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  selected_pesquisa_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_ai_chat_conversations_user_id ON public.ai_chat_conversations(user_id);
CREATE INDEX idx_ai_chat_conversations_agent_id ON public.ai_chat_conversations(agent_id);
CREATE INDEX idx_ai_chat_conversations_updated_at ON public.ai_chat_conversations(updated_at DESC);

-- RLS
ALTER TABLE public.ai_chat_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON public.ai_chat_conversations
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all conversations"
  ON public.ai_chat_conversations
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_ai_chat_conversations_updated_at
  BEFORE UPDATE ON public.ai_chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();