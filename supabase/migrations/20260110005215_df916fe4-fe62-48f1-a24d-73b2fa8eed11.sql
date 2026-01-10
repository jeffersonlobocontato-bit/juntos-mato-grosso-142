-- Create table for AI Hub professional functions
CREATE TABLE public.ai_hub_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_hub_functions ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_hub_functions
CREATE POLICY "Admin master can manage ai_hub_functions"
ON public.ai_hub_functions
FOR ALL
USING (has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Authenticated users can view ai_hub_functions"
ON public.ai_hub_functions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert default system functions
INSERT INTO public.ai_hub_functions (name, display_name, description, is_system) VALUES
  ('jornalista', 'Jornalista', 'Profissional de jornalismo e redação', true),
  ('social_media', 'Social Media', 'Profissional de mídias sociais', true),
  ('estrategista_eleitoral', 'Estrategista Eleitoral', 'Estrategista de campanhas eleitorais', true),
  ('coordenador_politico', 'Coordenador Político', 'Coordenador político de campanha', true);

-- Create table linking users to AI Hub functions
CREATE TABLE public.user_ai_hub_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  function_id UUID NOT NULL REFERENCES public.ai_hub_functions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, function_id)
);

-- Enable RLS
ALTER TABLE public.user_ai_hub_functions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_ai_hub_functions
CREATE POLICY "Admin master can manage user_ai_hub_functions"
ON public.user_ai_hub_functions
FOR ALL
USING (has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Users can view own ai_hub_functions"
ON public.user_ai_hub_functions
FOR SELECT
USING (auth.uid() = user_id);

-- Create table linking agents to allowed functions
CREATE TABLE public.ai_agent_allowed_functions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.ai_agent_config(id) ON DELETE CASCADE,
  function_id UUID NOT NULL REFERENCES public.ai_hub_functions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, function_id)
);

-- Enable RLS
ALTER TABLE public.ai_agent_allowed_functions ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_agent_allowed_functions
CREATE POLICY "Admin master can manage ai_agent_allowed_functions"
ON public.ai_agent_allowed_functions
FOR ALL
USING (has_role(auth.uid(), 'admin_master'));

CREATE POLICY "Authenticated users can view ai_agent_allowed_functions"
ON public.ai_agent_allowed_functions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at on ai_hub_functions
CREATE TRIGGER update_ai_hub_functions_updated_at
BEFORE UPDATE ON public.ai_hub_functions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();