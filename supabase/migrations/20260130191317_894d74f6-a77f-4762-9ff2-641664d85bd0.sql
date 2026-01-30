-- Add subtema_id column to propostas_tecnicas for hierarchical tagging
ALTER TABLE public.propostas_tecnicas 
ADD COLUMN subtema_id uuid REFERENCES public.subtemas(id);