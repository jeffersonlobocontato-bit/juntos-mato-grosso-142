-- Create enum for political proposal status
CREATE TYPE public.proposal_politica_status AS ENUM ('rascunho', 'revisao', 'aprovada', 'publicada', 'arquivada');

-- Create propostas_politicas table
CREATE TABLE public.propostas_politicas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo_completo TEXT NOT NULL,
  eixo_id UUID REFERENCES public.eixos_tematicos(id),
  publico_alvo TEXT,
  impacto_esperado TEXT,
  status proposal_politica_status NOT NULL DEFAULT 'rascunho',
  ordem_exibicao INTEGER NOT NULL DEFAULT 0,
  visivel_publico BOOLEAN NOT NULL DEFAULT false,
  autor_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.propostas_politicas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all political proposals"
ON public.propostas_politicas FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Leaders can view political proposals"
ON public.propostas_politicas FOR SELECT
USING (has_role(auth.uid(), 'lider_tematico'::app_role));

CREATE POLICY "Curators can view political proposals"
ON public.propostas_politicas FOR SELECT
USING (has_role(auth.uid(), 'curador_municipal'::app_role));

CREATE POLICY "Anyone can view public political proposals"
ON public.propostas_politicas FOR SELECT
USING (visivel_publico = true);

-- Trigger for updated_at
CREATE TRIGGER update_propostas_politicas_updated_at
BEFORE UPDATE ON public.propostas_politicas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create lead when political proposal is created
CREATE OR REPLACE FUNCTION public.create_lead_from_proposta_politica()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
BEGIN
  SELECT full_name, email INTO v_profile
  FROM public.profiles
  WHERE id = NEW.autor_id;
  
  IF v_profile IS NOT NULL THEN
    INSERT INTO public.leads (nome, email, origem, metadata)
    VALUES (
      v_profile.full_name,
      v_profile.email,
      'proposta',
      jsonb_build_object('tipo', 'politica', 'titulo_proposta', NEW.titulo, 'eixo_id', NEW.eixo_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_lead_on_proposta_politica
AFTER INSERT ON public.propostas_politicas
FOR EACH ROW
EXECUTE FUNCTION public.create_lead_from_proposta_politica();