-- Create user_municipios join table for curador_municipal access control
CREATE TABLE public.user_municipios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  municipio_id UUID REFERENCES public.municipios(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, municipio_id)
);

-- Enable RLS
ALTER TABLE public.user_municipios ENABLE ROW LEVEL SECURITY;

-- Admin master can manage user_municipios
CREATE POLICY "Admin master can manage user_municipios"
ON public.user_municipios FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin_master'));

-- Users can view their own municipios
CREATE POLICY "Users can view own municipios"
ON public.user_municipios FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Add RLS policy for curador_municipal to view proposals in their municipality
CREATE POLICY "Curators can view proposals in their municipality"
ON public.propostas_tecnicas FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_municipios um
    WHERE um.user_id = auth.uid()
    AND um.municipio_id = propostas_tecnicas.municipio_id
  )
);

-- Add RLS policy for lider_tematico to view proposals via user_eixos (not just eixos_tematicos.lider_id)
CREATE POLICY "Leaders via user_eixos can view proposals in their axis"
ON public.propostas_tecnicas FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_eixos ue
    WHERE ue.user_id = auth.uid()
    AND ue.eixo_id = propostas_tecnicas.eixo_id
  )
);

-- Add RLS policy for curador_municipal to view leads from their municipality
CREATE POLICY "Curators can view leads from their municipality"
ON public.leads FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_municipios um
    JOIN public.municipios m ON m.id = um.municipio_id
    WHERE um.user_id = auth.uid()
    AND m.nome = leads.municipio
  )
);