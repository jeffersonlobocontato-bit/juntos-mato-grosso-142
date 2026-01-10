-- Enum para tipo de pesquisa
CREATE TYPE pesquisa_tipo AS ENUM ('quantitativa', 'qualitativa', 'mista');

-- Enum para tipo de pergunta
CREATE TYPE pergunta_tipo AS ENUM (
  'intencao_espontanea', 
  'intencao_estimulada', 
  'rejeicao', 
  'avaliacao_governo', 
  'cenario', 
  'outro'
);

-- Enum para status da pesquisa
CREATE TYPE pesquisa_status AS ENUM ('rascunho', 'processando', 'ativa', 'arquivada');

-- Tabela principal de pesquisas eleitorais
CREATE TABLE public.pesquisas_eleitorais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  instituto TEXT NOT NULL,
  tipo_pesquisa pesquisa_tipo NOT NULL DEFAULT 'quantitativa',
  data_campo_inicio DATE,
  data_campo_fim DATE,
  data_publicacao DATE,
  registro_tse TEXT,
  metodologia JSONB DEFAULT '{}'::jsonb,
  universo TEXT,
  amostra_total INTEGER,
  margem_erro DECIMAL(4,2),
  nivel_confianca DECIMAL(5,2) DEFAULT 95,
  abrangencia TEXT DEFAULT 'estadual',
  municipio_id UUID REFERENCES public.municipios(id),
  regiao TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  content TEXT,
  status pesquisa_status NOT NULL DEFAULT 'rascunho',
  is_active BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de resultados (perguntas)
CREATE TABLE public.pesquisa_resultados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas_eleitorais(id) ON DELETE CASCADE,
  tipo_pergunta pergunta_tipo NOT NULL DEFAULT 'outro',
  pergunta TEXT NOT NULL,
  cenario_descricao TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de respostas (opções de cada pergunta)
CREATE TABLE public.pesquisa_respostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resultado_id UUID NOT NULL REFERENCES public.pesquisa_resultados(id) ON DELETE CASCADE,
  opcao TEXT NOT NULL,
  percentual DECIMAL(5,2),
  votos_absolutos INTEGER,
  ordem INTEGER DEFAULT 0
);

-- Tabela de cruzamentos (crosstabs por segmento)
CREATE TABLE public.pesquisa_cruzamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resultado_id UUID NOT NULL REFERENCES public.pesquisa_resultados(id) ON DELETE CASCADE,
  segmento_tipo TEXT NOT NULL,
  segmento_valor TEXT NOT NULL,
  opcao TEXT NOT NULL,
  percentual DECIMAL(5,2)
);

-- Tabela para dados qualitativos
CREATE TABLE public.pesquisa_qualitativa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas_eleitorais(id) ON DELETE CASCADE,
  tema TEXT NOT NULL,
  insight TEXT,
  verbatim TEXT,
  sentimento TEXT CHECK (sentimento IN ('positivo', 'negativo', 'neutro', 'misto')),
  relevancia INTEGER CHECK (relevancia BETWEEN 1 AND 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de vínculo entre agentes de IA e pesquisas
CREATE TABLE public.ai_agent_pesquisas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agent_config(id) ON DELETE CASCADE,
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas_eleitorais(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agent_id, pesquisa_id)
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pesquisas_eleitorais_updated_at
  BEFORE UPDATE ON public.pesquisas_eleitorais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_pesquisas_eleitorais_instituto ON public.pesquisas_eleitorais(instituto);
CREATE INDEX idx_pesquisas_eleitorais_tipo ON public.pesquisas_eleitorais(tipo_pesquisa);
CREATE INDEX idx_pesquisas_eleitorais_data_publicacao ON public.pesquisas_eleitorais(data_publicacao);
CREATE INDEX idx_pesquisas_eleitorais_status ON public.pesquisas_eleitorais(status);
CREATE INDEX idx_pesquisa_resultados_pesquisa_id ON public.pesquisa_resultados(pesquisa_id);
CREATE INDEX idx_pesquisa_respostas_resultado_id ON public.pesquisa_respostas(resultado_id);
CREATE INDEX idx_pesquisa_cruzamentos_resultado_id ON public.pesquisa_cruzamentos(resultado_id);

-- Enable RLS
ALTER TABLE public.pesquisas_eleitorais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisa_resultados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisa_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisa_cruzamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisa_qualitativa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_pesquisas ENABLE ROW LEVEL SECURITY;

-- RLS Policies para pesquisas_eleitorais
CREATE POLICY "Admins can manage pesquisas_eleitorais"
  ON public.pesquisas_eleitorais FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view pesquisas_eleitorais"
  ON public.pesquisas_eleitorais FOR SELECT
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role) OR has_role(auth.uid(), 'admin_master'::app_role));

-- RLS Policies para pesquisa_resultados
CREATE POLICY "Admins can manage pesquisa_resultados"
  ON public.pesquisa_resultados FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view pesquisa_resultados"
  ON public.pesquisa_resultados FOR SELECT
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role) OR has_role(auth.uid(), 'admin_master'::app_role));

-- RLS Policies para pesquisa_respostas
CREATE POLICY "Admins can manage pesquisa_respostas"
  ON public.pesquisa_respostas FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view pesquisa_respostas"
  ON public.pesquisa_respostas FOR SELECT
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role) OR has_role(auth.uid(), 'admin_master'::app_role));

-- RLS Policies para pesquisa_cruzamentos
CREATE POLICY "Admins can manage pesquisa_cruzamentos"
  ON public.pesquisa_cruzamentos FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view pesquisa_cruzamentos"
  ON public.pesquisa_cruzamentos FOR SELECT
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role) OR has_role(auth.uid(), 'admin_master'::app_role));

-- RLS Policies para pesquisa_qualitativa
CREATE POLICY "Admins can manage pesquisa_qualitativa"
  ON public.pesquisa_qualitativa FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view pesquisa_qualitativa"
  ON public.pesquisa_qualitativa FOR SELECT
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role) OR has_role(auth.uid(), 'admin_master'::app_role));

-- RLS Policies para ai_agent_pesquisas
CREATE POLICY "Admins can manage ai_agent_pesquisas"
  ON public.ai_agent_pesquisas FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Authorized users can view ai_agent_pesquisas"
  ON public.ai_agent_pesquisas FOR SELECT
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role) OR has_role(auth.uid(), 'admin_master'::app_role));

-- Storage bucket para arquivos de pesquisas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pesquisas-eleitorais', 'pesquisas-eleitorais', false);

-- Storage policies
CREATE POLICY "Admins can manage pesquisas files"
  ON storage.objects FOR ALL
  USING (bucket_id = 'pesquisas-eleitorais' AND is_admin(auth.uid()));

CREATE POLICY "Authorized users can view pesquisas files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pesquisas-eleitorais' AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'lider_tematico'::app_role) OR has_role(auth.uid(), 'admin_master'::app_role)));

CREATE POLICY "Admins can upload pesquisas files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pesquisas-eleitorais' AND is_admin(auth.uid()));