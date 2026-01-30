
-- =====================================================
-- FASE 1: REORGANIZAÇÃO HIERÁRQUICA - v4 UUIDs VÁLIDOS
-- =====================================================

-- 1.1 Tornar eixo_id nullable
ALTER TABLE public.propostas_tecnicas 
  ALTER COLUMN eixo_id DROP NOT NULL;

-- 1.2 Adicionar colunas novas
ALTER TABLE public.eixos_tematicos 
  ADD COLUMN IF NOT EXISTS subtitulo TEXT,
  ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;

-- 1.3 Criar tabelas (DROP primeiro)
DROP TABLE IF EXISTS public.subtemas CASCADE;
DROP TABLE IF EXISTS public.temas CASCADE;

CREATE TABLE public.temas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eixo_id UUID NOT NULL REFERENCES public.eixos_tematicos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_temas_eixo_id ON public.temas(eixo_id);
ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view temas" ON public.temas FOR SELECT USING (true);
CREATE POLICY "Admins can manage temas" ON public.temas FOR ALL USING (is_admin(auth.uid()));

CREATE TABLE public.subtemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tema_id UUID NOT NULL REFERENCES public.temas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subtemas_tema_id ON public.subtemas(tema_id);
ALTER TABLE public.subtemas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view subtemas" ON public.subtemas FOR SELECT USING (true);
CREATE POLICY "Admins can manage subtemas" ON public.subtemas FOR ALL USING (is_admin(auth.uid()));

-- 1.4 Adicionar tema_id às tabelas
ALTER TABLE public.propostas_tecnicas ADD COLUMN IF NOT EXISTS tema_id UUID REFERENCES public.temas(id);
ALTER TABLE public.propostas_politicas ADD COLUMN IF NOT EXISTS tema_id UUID REFERENCES public.temas(id);
ALTER TABLE public.sugestoes_populares ADD COLUMN IF NOT EXISTS tema_id UUID REFERENCES public.temas(id);

-- =====================================================
-- LIMPAR REFERÊNCIAS
-- =====================================================
UPDATE public.propostas_tecnicas SET eixo_id = NULL, tema_id = NULL;
UPDATE public.propostas_politicas SET eixo_id = NULL, tema_id = NULL;
UPDATE public.ai_documents SET eixo_id = NULL;
DELETE FROM public.user_eixos;
DELETE FROM public.eixos_tematicos;

-- =====================================================
-- INSERIR EIXOS
-- =====================================================
INSERT INTO public.eixos_tematicos (id, nome, subtitulo, ordem, descricao) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Desenvolvimento Social', 'Qualidade de Vida', 1, 'Eixo focado em educação, cultura, esporte, saúde e assistência social'),
  ('e2000000-0000-0000-0000-000000000002', 'Desenvolvimento Econômico Sustentável', 'Geração de Emprego e Renda', 2, 'Eixo focado em agricultura, indústria, comércio, turismo, inovação e meio ambiente'),
  ('e3000000-0000-0000-0000-000000000003', 'Desenvolvimento das Cidades e Infraestrutura', 'Viver e Transitar', 3, 'Eixo focado em habitação, mobilidade, saneamento, logística e energia'),
  ('e4000000-0000-0000-0000-000000000004', 'Gestão Pública Eficiente', 'Controlar', 4, 'Eixo focado em modernização, responsabilidade fiscal, transparência e previdência'),
  ('e5000000-0000-0000-0000-000000000005', 'Segurança, Justiça, Combate à Corrupção', NULL, 5, 'Eixo focado em segurança pública, combate à corrupção, sistema prisional e defesa civil');

-- =====================================================
-- INSERIR TEMAS (UUIDs válidos começando com a)
-- =====================================================

-- EIXO 01
INSERT INTO public.temas (id, eixo_id, nome, codigo, ordem) VALUES
  ('a1100000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Educação', '1.1', 1),
  ('a1200000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Cultura', '1.2', 2),
  ('a1300000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'Esporte', '1.3', 3),
  ('a1400000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000001', 'Saúde', '1.4', 4),
  ('a1500000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000001', 'Assistência Social', '1.5', 5);

-- EIXO 02
INSERT INTO public.temas (id, eixo_id, nome, codigo, ordem) VALUES
  ('a2100000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000002', 'Agricultura', '2.1', 1),
  ('a2200000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000002', 'Indústria', '2.2', 2),
  ('a2300000-0000-0000-0000-000000000003', 'e2000000-0000-0000-0000-000000000002', 'Comércio e Serviços', '2.3', 3),
  ('a2400000-0000-0000-0000-000000000004', 'e2000000-0000-0000-0000-000000000002', 'Turismo', '2.4', 4),
  ('a2500000-0000-0000-0000-000000000005', 'e2000000-0000-0000-0000-000000000002', 'Transportes', '2.5', 5),
  ('a2600000-0000-0000-0000-000000000006', 'e2000000-0000-0000-0000-000000000002', 'Empreendedorismo e MPEs', '2.6', 6),
  ('a2700000-0000-0000-0000-000000000007', 'e2000000-0000-0000-0000-000000000002', 'Inovação, Pesquisa, Tecnologia e Economia Digital', '2.7', 7),
  ('a2800000-0000-0000-0000-000000000008', 'e2000000-0000-0000-0000-000000000002', 'Internacionalização e Atração de Investimentos', '2.8', 8),
  ('a2900000-0000-0000-0000-000000000009', 'e2000000-0000-0000-0000-000000000002', 'Apoio ao Crédito', '2.9', 9),
  ('a2a00000-0000-0000-0000-000000000010', 'e2000000-0000-0000-0000-000000000002', 'Trabalho, Renda e Qualificação', '2.10', 10),
  ('a2b00000-0000-0000-0000-000000000011', 'e2000000-0000-0000-0000-000000000002', 'Meio Ambiente e Sustentabilidade', '2.11', 11);

-- EIXO 03
INSERT INTO public.temas (id, eixo_id, nome, codigo, ordem) VALUES
  ('a3100000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000003', 'Habitação e Regularização Fundiária', '3.1', 1),
  ('a3200000-0000-0000-0000-000000000002', 'e3000000-0000-0000-0000-000000000003', 'Mobilidade Urbana e Regional', '3.2', 2),
  ('a3300000-0000-0000-0000-000000000003', 'e3000000-0000-0000-0000-000000000003', 'Infraestrutura Urbana e Reurbanização', '3.3', 3),
  ('a3400000-0000-0000-0000-000000000004', 'e3000000-0000-0000-0000-000000000003', 'Saneamento', '3.4', 4),
  ('a3500000-0000-0000-0000-000000000005', 'e3000000-0000-0000-0000-000000000003', 'Logística de Transportes', '3.5', 5),
  ('a3600000-0000-0000-0000-000000000006', 'e3000000-0000-0000-0000-000000000003', 'Energia e Gás', '3.6', 6),
  ('a3700000-0000-0000-0000-000000000007', 'e3000000-0000-0000-0000-000000000003', 'Conectividade e Telecomunicações', '3.7', 7),
  ('a3800000-0000-0000-0000-000000000008', 'e3000000-0000-0000-0000-000000000003', 'Consórcios Intermunicipais', '3.8', 8);

-- EIXO 04
INSERT INTO public.temas (id, eixo_id, nome, codigo, ordem) VALUES
  ('a4100000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000004', 'Modernização da Gestão Pública', '4.1', 1),
  ('a4200000-0000-0000-0000-000000000002', 'e4000000-0000-0000-0000-000000000004', 'Responsabilidade Fiscal', '4.2', 2),
  ('a4300000-0000-0000-0000-000000000003', 'e4000000-0000-0000-0000-000000000004', 'Transparência e Integridade', '4.3', 3),
  ('a4400000-0000-0000-0000-000000000004', 'e4000000-0000-0000-0000-000000000004', 'Previdência Social', '4.4', 4);

-- EIXO 05
INSERT INTO public.temas (id, eixo_id, nome, codigo, ordem) VALUES
  ('a5100000-0000-0000-0000-000000000001', 'e5000000-0000-0000-0000-000000000005', 'Segurança Pública e Combate ao Crime Organizado', '5.1', 1),
  ('a5200000-0000-0000-0000-000000000002', 'e5000000-0000-0000-0000-000000000005', 'Combate à Corrupção', '5.2', 2),
  ('a5300000-0000-0000-0000-000000000003', 'e5000000-0000-0000-0000-000000000005', 'Inteligência, Tecnologia e Prevenção', '5.3', 3),
  ('a5400000-0000-0000-0000-000000000004', 'e5000000-0000-0000-0000-000000000005', 'Sistema Prisional e Ressocialização', '5.4', 4),
  ('a5500000-0000-0000-0000-000000000005', 'e5000000-0000-0000-0000-000000000005', 'Defesa Civil e Proteção da Vida', '5.5', 5),
  ('a5600000-0000-0000-0000-000000000006', 'e5000000-0000-0000-0000-000000000005', 'Justiça e Cidadania', '5.6', 6);

-- =====================================================
-- INSERIR SUBTEMAS
-- =====================================================

-- 1.1 Educação
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a1100000-0000-0000-0000-000000000001', 'Educação Infantil (creches e ensino infantil – apoio às prefeituras)', 1),
  ('a1100000-0000-0000-0000-000000000001', 'Ensino Fundamental e Médio / Ensino Integral', 2),
  ('a1100000-0000-0000-0000-000000000001', 'Ensino Técnico e Profissionalizante', 3),
  ('a1100000-0000-0000-0000-000000000001', 'Ensino Superior e Pesquisa', 4),
  ('a1100000-0000-0000-0000-000000000001', 'Educação de Jovens e Adultos (EJA)', 5),
  ('a1100000-0000-0000-0000-000000000001', 'Educação Especial', 6),
  ('a1100000-0000-0000-0000-000000000001', 'Formação de Capital Humano', 7);

-- 1.2 Cultura
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a1200000-0000-0000-0000-000000000002', 'Atividades no Contraturno escolar', 1),
  ('a1200000-0000-0000-0000-000000000002', 'Museus, Parques, História, Música, Teatro, Dança, Literatura', 2),
  ('a1200000-0000-0000-0000-000000000002', 'Economia Criativa', 3);

-- 1.3 Esporte
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a1300000-0000-0000-0000-000000000003', 'Atividades no Contraturno escolar', 1),
  ('a1300000-0000-0000-0000-000000000003', 'Esporte, Lazer e Bem Estar', 2),
  ('a1300000-0000-0000-0000-000000000003', 'Desportos', 3),
  ('a1300000-0000-0000-0000-000000000003', 'Jogos da juventude', 4),
  ('a1300000-0000-0000-0000-000000000003', 'Esportes de alto desempenho', 5);

-- 1.4 Saúde
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a1400000-0000-0000-0000-000000000004', 'Atenção Básica e Saúde da Família', 1),
  ('a1400000-0000-0000-0000-000000000004', 'Média e Alta Complexidade - Especialistas', 2),
  ('a1400000-0000-0000-0000-000000000004', 'Saúde Mental e Dependência Química', 3),
  ('a1400000-0000-0000-0000-000000000004', 'Promoção da Saúde e Qualidade de Vida', 4),
  ('a1400000-0000-0000-0000-000000000004', 'Gestão Hospitalar / Filas', 5);

-- 1.5 Assistência Social
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a1500000-0000-0000-0000-000000000005', 'Proteção Social e Populações Vulneráveis', 1),
  ('a1500000-0000-0000-0000-000000000005', 'População em Situação de Rua e Dependência Química', 2),
  ('a1500000-0000-0000-0000-000000000005', 'Políticas para Mulheres, Crianças e Adolescentes', 3),
  ('a1500000-0000-0000-0000-000000000005', 'Políticas para Idosos', 4),
  ('a1500000-0000-0000-0000-000000000005', 'Políticas para Imigrantes e Refugiados', 5);

-- 2.1 Agricultura
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a2100000-0000-0000-0000-000000000001', 'Agronegócio', 1),
  ('a2100000-0000-0000-0000-000000000001', 'Abastecimento e Desenvolvimento Rural', 2),
  ('a2100000-0000-0000-0000-000000000001', 'Cooperativas', 3),
  ('a2100000-0000-0000-0000-000000000001', 'Silvicultura', 4);

-- 2.2 Indústria
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a2200000-0000-0000-0000-000000000002', 'Cadeias Produtivas', 1),
  ('a2200000-0000-0000-0000-000000000002', 'Competitividade', 2);

-- 2.10 Trabalho
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a2a00000-0000-0000-0000-000000000010', 'Conexão com setor produtivo e empregabilidade real', 1);

-- 2.11 Meio Ambiente
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a2b00000-0000-0000-0000-000000000011', 'Preservação Ambiental', 1),
  ('a2b00000-0000-0000-0000-000000000011', 'Desenvolvimento Sustentável – Licenciamentos', 2),
  ('a2b00000-0000-0000-0000-000000000011', 'Recursos Hídricos', 3),
  ('a2b00000-0000-0000-0000-000000000011', 'Logística Reversa', 4),
  ('a2b00000-0000-0000-0000-000000000011', 'Resíduos', 5);

-- 3.4 Saneamento
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a3400000-0000-0000-0000-000000000004', 'Água', 1),
  ('a3400000-0000-0000-0000-000000000004', 'Esgoto', 2),
  ('a3400000-0000-0000-0000-000000000004', 'Resíduos', 3);

-- 3.5 Logística
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a3500000-0000-0000-0000-000000000005', 'Portos', 1),
  ('a3500000-0000-0000-0000-000000000005', 'Ferrovias', 2),
  ('a3500000-0000-0000-0000-000000000005', 'Rodovias', 3),
  ('a3500000-0000-0000-0000-000000000005', 'Aeroportos', 4);

-- 3.6 Energia
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a3600000-0000-0000-0000-000000000006', 'Energias Renováveis', 1),
  ('a3600000-0000-0000-0000-000000000006', 'Transição Energética', 2),
  ('a3600000-0000-0000-0000-000000000006', 'Gás Natural e Biometano', 3);

-- 3.7 Conectividade
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a3700000-0000-0000-0000-000000000007', 'Conectividade Rural', 1),
  ('a3700000-0000-0000-0000-000000000007', 'Antenas', 2),
  ('a3700000-0000-0000-0000-000000000007', 'Segurança - Roubo de Cabos', 3),
  ('a3700000-0000-0000-0000-000000000007', 'Cobertura com Sinal nas Rodovias', 4);

-- 3.8 Consórcios
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a3800000-0000-0000-0000-000000000008', 'Aterros Sanitários e Industriais', 1),
  ('a3800000-0000-0000-0000-000000000008', 'Escritório de Projetos para captação de Recursos', 2);

-- 4.1 Modernização
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a4100000-0000-0000-0000-000000000001', 'Governo Digital', 1),
  ('a4100000-0000-0000-0000-000000000001', 'Desburocratização', 2);

-- 4.2 Responsabilidade Fiscal
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a4200000-0000-0000-0000-000000000002', 'Finanças e Tributação', 1),
  ('a4200000-0000-0000-0000-000000000002', 'Qualidade do Gasto Público', 2),
  ('a4200000-0000-0000-0000-000000000002', 'Compras', 3);

-- 4.3 Transparência
INSERT INTO public.subtemas (tema_id, nome, ordem) VALUES
  ('a4300000-0000-0000-0000-000000000003', 'Combate ao Desperdício', 1),
  ('a4300000-0000-0000-0000-000000000003', 'Compliance', 2);

-- =====================================================
-- ATRIBUIR EIXO PADRÃO
-- =====================================================
UPDATE public.propostas_tecnicas 
SET eixo_id = 'e1000000-0000-0000-0000-000000000001' 
WHERE eixo_id IS NULL;

UPDATE public.propostas_politicas 
SET eixo_id = 'e1000000-0000-0000-0000-000000000001' 
WHERE eixo_id IS NULL;
