-- =============================================
-- MÓDULO TSE - DADOS ELEITORAIS HISTÓRICOS
-- =============================================

-- 1. Tabela de Eleições (metadados)
CREATE TABLE public.tse_eleicoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  turno INTEGER NOT NULL DEFAULT 1,
  tipo TEXT NOT NULL CHECK (tipo IN ('municipal', 'estadual', 'federal')),
  data_eleicao DATE,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(ano, turno, tipo)
);

-- 2. Tabela de Cargos
CREATE TABLE public.tse_cargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_tse INTEGER NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  abrangencia TEXT NOT NULL CHECK (abrangencia IN ('municipal', 'estadual', 'federal')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabela de Partidos
CREATE TABLE public.tse_partidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero INTEGER NOT NULL UNIQUE,
  sigla TEXT NOT NULL,
  nome TEXT,
  cor_hex TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Tabela de Candidatos por Eleição
CREATE TABLE public.tse_candidatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eleicao_id UUID NOT NULL REFERENCES public.tse_eleicoes(id) ON DELETE CASCADE,
  cargo_id UUID REFERENCES public.tse_cargos(id),
  partido_id UUID REFERENCES public.tse_partidos(id),
  numero_urna INTEGER NOT NULL,
  nome_urna TEXT NOT NULL,
  nome_completo TEXT,
  uf TEXT NOT NULL,
  municipio_id UUID REFERENCES public.municipios(id),
  situacao TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabela de Locais de Votação com Coordenadas
CREATE TABLE public.tse_locais_votacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uf TEXT NOT NULL,
  municipio_id UUID REFERENCES public.municipios(id),
  codigo_municipio_tse INTEGER,
  nome_municipio TEXT,
  zona INTEGER NOT NULL,
  secao INTEGER,
  local_nome TEXT,
  endereco TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(uf, zona, secao)
);

-- 6. Tabela de Votos por Seção Eleitoral
CREATE TABLE public.tse_votos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  eleicao_id UUID NOT NULL REFERENCES public.tse_eleicoes(id) ON DELETE CASCADE,
  candidato_id UUID NOT NULL REFERENCES public.tse_candidatos(id) ON DELETE CASCADE,
  local_id UUID REFERENCES public.tse_locais_votacao(id),
  uf TEXT NOT NULL,
  codigo_municipio_tse INTEGER,
  zona INTEGER,
  secao INTEGER,
  quantidade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabela de Log de Importações
CREATE TABLE public.tse_importacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ano INTEGER NOT NULL,
  uf TEXT NOT NULL,
  tipo_arquivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),
  registros_importados INTEGER DEFAULT 0,
  total_registros INTEGER,
  erro_mensagem TEXT,
  iniciado_por UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para tse_candidatos
CREATE INDEX idx_tse_candidatos_eleicao ON public.tse_candidatos(eleicao_id);
CREATE INDEX idx_tse_candidatos_partido ON public.tse_candidatos(partido_id);
CREATE INDEX idx_tse_candidatos_uf ON public.tse_candidatos(uf);
CREATE INDEX idx_tse_candidatos_numero ON public.tse_candidatos(numero_urna);

-- Índices para tse_locais_votacao
CREATE INDEX idx_tse_locais_uf ON public.tse_locais_votacao(uf);
CREATE INDEX idx_tse_locais_municipio ON public.tse_locais_votacao(municipio_id);
CREATE INDEX idx_tse_locais_coords ON public.tse_locais_votacao(latitude, longitude) WHERE latitude IS NOT NULL;

-- Índices para tse_votos
CREATE INDEX idx_tse_votos_eleicao ON public.tse_votos(eleicao_id);
CREATE INDEX idx_tse_votos_candidato ON public.tse_votos(candidato_id);
CREATE INDEX idx_tse_votos_local ON public.tse_votos(local_id);
CREATE INDEX idx_tse_votos_uf ON public.tse_votos(uf);
CREATE INDEX idx_tse_votos_municipio ON public.tse_votos(codigo_municipio_tse);

-- Índices para tse_importacoes
CREATE INDEX idx_tse_importacoes_ano_uf ON public.tse_importacoes(ano, uf);
CREATE INDEX idx_tse_importacoes_status ON public.tse_importacoes(status);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.tse_eleicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tse_cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tse_partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tse_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tse_locais_votacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tse_votos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tse_importacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública (dados eleitorais são públicos)
CREATE POLICY "Dados eleitorais são públicos para leitura"
ON public.tse_eleicoes FOR SELECT USING (true);

CREATE POLICY "Cargos são públicos para leitura"
ON public.tse_cargos FOR SELECT USING (true);

CREATE POLICY "Partidos são públicos para leitura"
ON public.tse_partidos FOR SELECT USING (true);

CREATE POLICY "Candidatos são públicos para leitura"
ON public.tse_candidatos FOR SELECT USING (true);

CREATE POLICY "Locais de votação são públicos para leitura"
ON public.tse_locais_votacao FOR SELECT USING (true);

CREATE POLICY "Votos são públicos para leitura"
ON public.tse_votos FOR SELECT USING (true);

CREATE POLICY "Importações visíveis para admins"
ON public.tse_importacoes FOR SELECT
USING (public.is_admin(auth.uid()));

-- Políticas de escrita apenas para admins
CREATE POLICY "Admins podem inserir eleições"
ON public.tse_eleicoes FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar eleições"
ON public.tse_eleicoes FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir cargos"
ON public.tse_cargos FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir partidos"
ON public.tse_partidos FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar partidos"
ON public.tse_partidos FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir candidatos"
ON public.tse_candidatos FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir locais"
ON public.tse_locais_votacao FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar locais"
ON public.tse_locais_votacao FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir votos"
ON public.tse_votos FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem gerenciar importações"
ON public.tse_importacoes FOR ALL
USING (public.is_admin(auth.uid()));

-- =============================================
-- DADOS INICIAIS - CARGOS
-- =============================================

INSERT INTO public.tse_cargos (codigo_tse, nome, abrangencia) VALUES
(1, 'Presidente', 'federal'),
(3, 'Governador', 'estadual'),
(5, 'Senador', 'estadual'),
(6, 'Deputado Federal', 'estadual'),
(7, 'Deputado Estadual', 'estadual'),
(8, 'Deputado Distrital', 'estadual'),
(11, 'Prefeito', 'municipal'),
(13, 'Vereador', 'municipal');

-- =============================================
-- DADOS INICIAIS - PARTIDOS PRINCIPAIS
-- =============================================

INSERT INTO public.tse_partidos (numero, sigla, nome, cor_hex) VALUES
(10, 'REPUBLICANOS', 'Republicanos', '#0066CC'),
(11, 'PP', 'Progressistas', '#0033CC'),
(12, 'PDT', 'Partido Democrático Trabalhista', '#FF6600'),
(13, 'PT', 'Partido dos Trabalhadores', '#CC0000'),
(14, 'PTB', 'Partido Trabalhista Brasileiro', '#000000'),
(15, 'MDB', 'Movimento Democrático Brasileiro', '#00CC00'),
(17, 'PSL', 'Partido Social Liberal', '#FFD700'),
(19, 'PODE', 'Podemos', '#9933FF'),
(20, 'PSC', 'Partido Social Cristão', '#006633'),
(21, 'PCB', 'Partido Comunista Brasileiro', '#CC0000'),
(22, 'PL', 'Partido Liberal', '#003399'),
(23, 'CIDADANIA', 'Cidadania', '#FF9900'),
(25, 'DEM', 'Democratas', '#0099CC'),
(27, 'PSDC', 'Partido Social Democrata Cristão', '#336699'),
(28, 'PRTB', 'Partido Renovador Trabalhista Brasileiro', '#006600'),
(29, 'PCO', 'Partido da Causa Operária', '#990000'),
(30, 'NOVO', 'Partido Novo', '#FF6600'),
(33, 'PMN', 'Partido da Mobilização Nacional', '#FFCC00'),
(35, 'PMB', 'Partido da Mulher Brasileira', '#FF66CC'),
(36, 'PTC', 'Partido Trabalhista Cristão', '#663399'),
(40, 'PSB', 'Partido Socialista Brasileiro', '#FF3300'),
(43, 'PV', 'Partido Verde', '#009900'),
(44, 'UNIÃO', 'União Brasil', '#0066FF'),
(45, 'PSDB', 'Partido da Social Democracia Brasileira', '#0066CC'),
(50, 'PSOL', 'Partido Socialismo e Liberdade', '#FFCC00'),
(51, 'PATRIOTA', 'Patriota', '#00CC66'),
(55, 'PSD', 'Partido Social Democrático', '#003366'),
(65, 'PC do B', 'Partido Comunista do Brasil', '#CC0000'),
(70, 'AVANTE', 'Avante', '#FF3300'),
(77, 'SOLIDARIEDADE', 'Solidariedade', '#FF6600'),
(80, 'UP', 'Unidade Popular', '#990000')
ON CONFLICT (numero) DO NOTHING;

-- =============================================
-- TRIGGER PARA UPDATED_AT
-- =============================================

CREATE TRIGGER update_tse_importacoes_updated_at
BEFORE UPDATE ON public.tse_importacoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();