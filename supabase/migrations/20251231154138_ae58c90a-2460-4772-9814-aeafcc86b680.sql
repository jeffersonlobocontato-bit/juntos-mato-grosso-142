-- Tabela para rastrear última atividade dos usuários
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
  activity_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela para mensagens/alertas enviados
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_ids uuid[] NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'whatsapp', 'both')),
  message_type text NOT NULL CHECK (message_type IN ('manual', 'automatic_inactivity')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela para log de alertas de inatividade
CREATE TABLE public.inactivity_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_sent_at timestamp with time zone NOT NULL DEFAULT now(),
  hours_inactive integer NOT NULL,
  channel text NOT NULL,
  message_id uuid REFERENCES public.admin_messages(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inactivity_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_activity
CREATE POLICY "Admins can manage all activity"
ON public.user_activity FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own activity"
ON public.user_activity FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone authenticated can upsert own activity"
ON public.user_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
ON public.user_activity FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for admin_messages
CREATE POLICY "Admins can manage all messages"
ON public.admin_messages FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view messages sent to them"
ON public.admin_messages FOR SELECT
USING (auth.uid() = ANY(recipient_ids));

-- RLS policies for inactivity_alerts
CREATE POLICY "Admins can manage all alerts"
ON public.inactivity_alerts FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own alerts"
ON public.inactivity_alerts FOR SELECT
USING (auth.uid() = user_id);

-- Function to update user activity
CREATE OR REPLACE FUNCTION public.update_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_activity (user_id, last_activity_at, activity_type)
  VALUES (NEW.autor_id, now(), 'proposta_criada')
  ON CONFLICT (user_id) 
  DO UPDATE SET last_activity_at = now(), activity_type = 'proposta_criada';
  RETURN NEW;
END;
$$;

-- Trigger to update activity when proposal is created/updated
CREATE TRIGGER on_proposta_activity
  AFTER INSERT OR UPDATE ON public.propostas_tecnicas
  FOR EACH ROW EXECUTE FUNCTION public.update_user_activity();

-- Function to get inactive users (48+ hours)
CREATE OR REPLACE FUNCTION public.get_inactive_users(hours_threshold integer DEFAULT 48)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  last_activity_at timestamp with time zone,
  hours_inactive integer,
  roles text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    COALESCE(ua.last_activity_at, p.created_at) as last_activity_at,
    EXTRACT(EPOCH FROM (now() - COALESCE(ua.last_activity_at, p.created_at)))::integer / 3600 as hours_inactive,
    ARRAY_AGG(ur.role::text) as roles
  FROM public.profiles p
  LEFT JOIN public.user_activity ua ON ua.user_id = p.id
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role IN ('especialista', 'lider_tematico', 'curador_municipal')
  GROUP BY p.id, p.full_name, p.email, ua.last_activity_at, p.created_at
  HAVING EXTRACT(EPOCH FROM (now() - COALESCE(ua.last_activity_at, p.created_at)))::integer / 3600 >= hours_threshold
  ORDER BY hours_inactive DESC;
$$;