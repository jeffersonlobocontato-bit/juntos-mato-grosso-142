-- Tabela para rastrear eventos de analytics da LP
CREATE TABLE public.page_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Identificação da sessão/visitante
  session_id TEXT NOT NULL,
  visitor_id TEXT, -- Para identificar visitantes recorrentes (cookie)
  
  -- Tipo de evento
  event_type TEXT NOT NULL, -- 'pageview', 'click', 'scroll', 'form_submit', 'share'
  
  -- Origem de tráfego
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  
  -- Localização
  city TEXT,
  region TEXT,
  country TEXT DEFAULT 'BR',
  
  -- Dados do componente/página
  page_path TEXT NOT NULL DEFAULT '/',
  component_name TEXT, -- 'HeroSection', 'SuggestionForm', 'AboutSection', etc.
  component_action TEXT, -- 'view', 'click', 'scroll_into_view', 'interact'
  
  -- Dados do dispositivo
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,
  screen_width INTEGER,
  screen_height INTEGER,
  
  -- Scroll depth
  scroll_depth INTEGER, -- Porcentagem máxima de scroll na página
  
  -- Tempo na página
  time_on_page INTEGER, -- Segundos
  
  -- Metadados extras
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices para consultas eficientes
CREATE INDEX idx_analytics_session ON public.page_analytics_events(session_id);
CREATE INDEX idx_analytics_created_at ON public.page_analytics_events(created_at DESC);
CREATE INDEX idx_analytics_event_type ON public.page_analytics_events(event_type);
CREATE INDEX idx_analytics_component ON public.page_analytics_events(component_name);
CREATE INDEX idx_analytics_city ON public.page_analytics_events(city);
CREATE INDEX idx_analytics_utm_source ON public.page_analytics_events(utm_source);

-- Enable RLS
ALTER TABLE public.page_analytics_events ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Qualquer um pode inserir eventos (visitantes anônimos)
CREATE POLICY "Anyone can insert analytics events"
ON public.page_analytics_events
FOR INSERT
WITH CHECK (true);

-- Apenas admins e líderes podem visualizar
CREATE POLICY "Authorized users can view analytics"
ON public.page_analytics_events
FOR SELECT
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role));

-- Apenas admins podem gerenciar (delete, update)
CREATE POLICY "Admins can manage analytics"
ON public.page_analytics_events
FOR ALL
USING (is_admin(auth.uid()));