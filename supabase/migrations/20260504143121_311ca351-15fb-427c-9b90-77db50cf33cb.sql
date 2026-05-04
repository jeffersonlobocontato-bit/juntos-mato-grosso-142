CREATE TABLE public.plano_governo_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  mode TEXT NOT NULL DEFAULT 'plano',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plano_gov_conv_user_updated 
  ON public.plano_governo_conversations (user_id, updated_at DESC);

ALTER TABLE public.plano_governo_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plano governo conversations"
ON public.plano_governo_conversations
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all plano governo conversations"
ON public.plano_governo_conversations
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'admin_master'::app_role));

CREATE TRIGGER update_plano_gov_conv_updated_at
BEFORE UPDATE ON public.plano_governo_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();