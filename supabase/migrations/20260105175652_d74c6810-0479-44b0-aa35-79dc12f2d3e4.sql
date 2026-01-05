-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS celular TEXT,
ADD COLUMN IF NOT EXISTS cargo TEXT;

-- Create user_eixos join table
CREATE TABLE public.user_eixos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  eixo_id UUID REFERENCES public.eixos_tematicos(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, eixo_id)
);

-- Enable RLS
ALTER TABLE public.user_eixos ENABLE ROW LEVEL SECURITY;

-- Policy: Admin master can manage all user_eixos
CREATE POLICY "Admin master can manage user_eixos"
ON public.user_eixos
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin_master'));

-- Policy: Users can view their own eixos
CREATE POLICY "Users can view own eixos"
ON public.user_eixos
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);