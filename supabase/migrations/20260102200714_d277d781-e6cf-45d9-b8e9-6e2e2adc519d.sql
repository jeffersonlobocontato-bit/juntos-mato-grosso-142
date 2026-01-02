-- Adicionar campos para nome do entrevistado e líder técnico responsável
ALTER TABLE public.propostas_tecnicas
ADD COLUMN entrevistado text,
ADD COLUMN lider_responsavel_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;