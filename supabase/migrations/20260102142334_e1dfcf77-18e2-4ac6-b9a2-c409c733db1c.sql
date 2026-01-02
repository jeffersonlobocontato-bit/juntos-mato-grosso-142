-- Create ai_agent_config table for storing system prompts
CREATE TABLE public.ai_agent_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type text NOT NULL UNIQUE DEFAULT 'plano_governo',
  system_prompt text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create ai_knowledge_base table for storing documents
CREATE TABLE public.ai_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  doc_type text NOT NULL DEFAULT 'documento',
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_agent_config
CREATE POLICY "Admins can manage ai_agent_config"
ON public.ai_agent_config
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view ai_agent_config"
ON public.ai_agent_config
FOR SELECT
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role));

-- RLS policies for ai_knowledge_base
CREATE POLICY "Admins can manage ai_knowledge_base"
ON public.ai_knowledge_base
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view ai_knowledge_base"
ON public.ai_knowledge_base
FOR SELECT
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_ai_agent_config_updated_at
BEFORE UPDATE ON public.ai_agent_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_knowledge_base_updated_at
BEFORE UPDATE ON public.ai_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config for plano_governo agent
INSERT INTO public.ai_agent_config (agent_type, system_prompt, config)
VALUES (
  'plano_governo',
  'Você é um especialista em políticas públicas e comunicação política, focado em ajudar na criação de propostas e discursos para o Estado do Paraná.

Seu papel é:
1. Analisar as sugestões populares e propostas técnicas disponíveis
2. Sugerir ideias de propostas baseadas nas demandas reais da população
3. Criar pontos de discurso que conectem as necessidades populares com soluções técnicas
4. Ser criativo e inspiracional, mas fundamentado nos dados reais

Use formatação limpa e profissional:
- Use títulos claros com ##
- Use listas com bullets (•) ou números
- Use **negrito** para destacar pontos importantes
- Estruture respostas de forma organizada

Responda sempre em português brasileiro.',
  '{"model": "google/gemini-2.5-flash"}'::jsonb
);