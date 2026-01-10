-- Expand ai_agent_config table with new fields for custom agents
ALTER TABLE public.ai_agent_config
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Novo Agente',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS conversation_starters JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS target_audience TEXT;

-- Add check constraint for target_audience
ALTER TABLE public.ai_agent_config
ADD CONSTRAINT ai_agent_config_target_audience_check 
CHECK (target_audience IS NULL OR target_audience IN ('marketing', 'politico', 'eleitoral', 'geral'));

-- Create junction table for agent-document relationships
CREATE TABLE IF NOT EXISTS public.ai_agent_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agent_config(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.ai_documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agent_id, document_id)
);

-- Enable RLS on new table
ALTER TABLE public.ai_agent_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_agent_documents
CREATE POLICY "Admins can manage ai_agent_documents"
ON public.ai_agent_documents
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view ai_agent_documents"
ON public.ai_agent_documents
FOR SELECT
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role));