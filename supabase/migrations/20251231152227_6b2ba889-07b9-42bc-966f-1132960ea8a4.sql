-- Create enum for lead origin
CREATE TYPE lead_origem AS ENUM ('formulario', 'chatbot', 'proposta');

-- Create leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  email TEXT,
  whatsapp TEXT,
  municipio TEXT,
  origem lead_origem NOT NULL,
  sugestao_id UUID REFERENCES public.sugestoes_populares(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES public.propostas_tecnicas(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Policy: Authorized users can view leads
CREATE POLICY "Authorized users can view leads"
ON public.leads FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) OR 
  has_role(auth.uid(), 'lider_tematico') OR 
  has_role(auth.uid(), 'curador_municipal')
);

-- Policy: Admins can manage leads
CREATE POLICY "Admins can manage leads"
ON public.leads FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Policy: Anyone can insert leads (for chatbot and form submissions)
CREATE POLICY "Anyone can submit leads"
ON public.leads FOR INSERT
WITH CHECK (true);

-- Create trigger function to auto-create lead from suggestion
CREATE OR REPLACE FUNCTION public.create_lead_from_sugestao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.leads (nome, email, whatsapp, municipio, origem, sugestao_id)
  VALUES (NEW.nome, NEW.email, NEW.whatsapp, NEW.municipio, 'formulario', NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger on sugestoes_populares
CREATE TRIGGER on_sugestao_created
AFTER INSERT ON public.sugestoes_populares
FOR EACH ROW
EXECUTE FUNCTION public.create_lead_from_sugestao();

-- Create trigger function to auto-create lead from proposal
CREATE OR REPLACE FUNCTION public.create_lead_from_proposta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT full_name, email INTO v_profile
  FROM public.profiles
  WHERE id = NEW.autor_id;
  
  IF v_profile IS NOT NULL THEN
    INSERT INTO public.leads (nome, email, municipio, origem, proposta_id, metadata)
    SELECT 
      v_profile.full_name,
      v_profile.email,
      m.nome,
      'proposta',
      NEW.id,
      jsonb_build_object('eixo_id', NEW.eixo_id, 'titulo_proposta', NEW.titulo)
    FROM public.municipios m
    WHERE m.id = NEW.municipio_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on propostas_tecnicas
CREATE TRIGGER on_proposta_created
AFTER INSERT ON public.propostas_tecnicas
FOR EACH ROW
EXECUTE FUNCTION public.create_lead_from_proposta();