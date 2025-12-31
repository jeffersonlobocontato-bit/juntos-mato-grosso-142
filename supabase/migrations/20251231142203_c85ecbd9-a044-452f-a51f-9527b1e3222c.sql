-- Create proposals status enum
CREATE TYPE public.proposal_status AS ENUM ('rascunho', 'validada', 'consolidada', 'aprovada');

-- Create technical proposals table
CREATE TABLE public.propostas_tecnicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  municipio_id UUID REFERENCES public.municipios(id),
  eixo_id UUID REFERENCES public.eixos_tematicos(id) NOT NULL,
  autor_id UUID REFERENCES auth.users(id) NOT NULL,
  status proposal_status NOT NULL DEFAULT 'rascunho',
  etapa INTEGER NOT NULL DEFAULT 1 CHECK (etapa >= 1 AND etapa <= 4),
  metas TEXT,
  indicadores TEXT,
  anexos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create popular suggestions table
CREATE TABLE public.sugestoes_populares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  email TEXT,
  whatsapp TEXT,
  municipio TEXT NOT NULL,
  eixo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  publico BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.propostas_tecnicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugestoes_populares ENABLE ROW LEVEL SECURITY;

-- Proposals policies
CREATE POLICY "Users can view their own proposals"
ON public.propostas_tecnicas FOR SELECT
TO authenticated
USING (auth.uid() = autor_id);

CREATE POLICY "Users can create their own proposals"
ON public.propostas_tecnicas FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = autor_id);

CREATE POLICY "Users can update their own proposals"
ON public.propostas_tecnicas FOR UPDATE
TO authenticated
USING (auth.uid() = autor_id);

CREATE POLICY "Admins can manage all proposals"
ON public.propostas_tecnicas FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Leaders can view proposals in their axis"
ON public.propostas_tecnicas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.eixos_tematicos e
    WHERE e.id = eixo_id AND e.lider_id = auth.uid()
  )
);

-- Suggestions policies (public insert, admin read)
CREATE POLICY "Anyone can submit suggestions"
ON public.sugestoes_populares FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all suggestions"
ON public.sugestoes_populares FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'lider_tematico') OR public.has_role(auth.uid(), 'curador_municipal'));

CREATE POLICY "Admins can manage suggestions"
ON public.sugestoes_populares FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Add trigger for updated_at on proposals
CREATE TRIGGER update_propostas_updated_at
  BEFORE UPDATE ON public.propostas_tecnicas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();