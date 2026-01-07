-- 1. Criar tabela proposal_alerts para histórico de alertas
CREATE TABLE public.proposal_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas_tecnicas(id) ON DELETE CASCADE,
  responsavel_id UUID NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'system',
  hours_stale INTEGER NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage all proposal alerts"
  ON public.proposal_alerts FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Users can view own proposal alerts"
  ON public.proposal_alerts FOR SELECT
  USING (auth.uid() = responsavel_id);

-- 2. Criar função para buscar propostas atrasadas
CREATE OR REPLACE FUNCTION public.get_stale_proposals(hours_threshold INTEGER DEFAULT 48)
RETURNS TABLE (
  proposta_id UUID,
  titulo TEXT,
  status TEXT,
  etapa INTEGER,
  responsavel_id UUID,
  responsavel_email TEXT,
  responsavel_nome TEXT,
  eixo_id UUID,
  eixo_nome TEXT,
  municipio_id UUID,
  municipio_nome TEXT,
  hours_stale INTEGER,
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id as proposta_id,
    p.titulo,
    p.status::text,
    p.etapa,
    COALESCE(p.lider_responsavel_id, p.autor_id) as responsavel_id,
    pr.email as responsavel_email,
    pr.full_name as responsavel_nome,
    p.eixo_id,
    e.nome as eixo_nome,
    p.municipio_id,
    m.nome as municipio_nome,
    EXTRACT(EPOCH FROM (now() - p.updated_at))::integer / 3600 as hours_stale,
    p.updated_at,
    p.created_at
  FROM public.propostas_tecnicas p
  LEFT JOIN public.profiles pr ON pr.id = COALESCE(p.lider_responsavel_id, p.autor_id)
  LEFT JOIN public.eixos_tematicos e ON e.id = p.eixo_id
  LEFT JOIN public.municipios m ON m.id = p.municipio_id
  WHERE p.status NOT IN ('aprovada')
    AND EXTRACT(EPOCH FROM (now() - p.updated_at))::integer / 3600 >= hours_threshold
  ORDER BY hours_stale DESC;
$$;

-- 3. Inserir 80 propostas técnicas de teste
DO $$
DECLARE
  v_autor_id UUID;
  v_eixo RECORD;
  v_municipio RECORD;
  v_municipios TEXT[];
  v_titulos TEXT[];
  v_status TEXT[];
  v_etapas INTEGER[];
  v_created_days INTEGER[];
  v_updated_hours INTEGER[];
  i INTEGER;
BEGIN
  -- Buscar um autor existente
  SELECT id INTO v_autor_id FROM public.profiles LIMIT 1;
  
  -- Se não houver autor, usar um UUID fixo (será criado depois)
  IF v_autor_id IS NULL THEN
    v_autor_id := '00000000-0000-0000-0000-000000000001'::UUID;
  END IF;

  -- Arrays de configuração para as 10 propostas por eixo
  v_status := ARRAY['rascunho', 'rascunho', 'rascunho', 'validada', 'validada', 'validada', 'consolidada', 'consolidada', 'aprovada', 'aprovada'];
  v_etapas := ARRAY[1, 1, 2, 2, 2, 3, 3, 4, 4, 4];
  v_created_days := ARRAY[5, 15, 25, 35, 45, 55, 65, 75, 85, 90];
  v_updated_hours := ARRAY[72, 24, 96, 48, 6, 12, 120, 72, 24, 1];

  -- Loop por cada eixo
  FOR v_eixo IN SELECT id, nome FROM public.eixos_tematicos LOOP
    
    -- Definir municípios e títulos baseados no eixo
    CASE 
      WHEN v_eixo.nome ILIKE '%Agricultura%' THEN
        v_municipios := ARRAY['Nova Esperança', 'Bela Vista da Caroba', 'Ângulo', 'Quitandinha', 'Santa Inês', 'Santa Cruz de Monte Castelo', 'Congonhinhas', 'São Pedro do Paraná', 'Nova Aurora', 'São Jorge d''Oeste'];
        v_titulos := ARRAY['Programa de Irrigação Sustentável', 'Sistema Agroflorestal', 'Cooperativa de Agricultura Familiar', 'Mecanização Rural Compartilhada', 'Certificação Orgânica Municipal', 'Banco de Sementes Crioulas', 'Hortas Comunitárias Urbanas', 'Manejo Integrado de Pragas', 'Recuperação de Nascentes', 'Centro de Processamento Agrícola'];
      
      WHEN v_eixo.nome ILIKE '%Social%' THEN
        v_municipios := ARRAY['Campo Largo', 'Doutor Camargo', 'Cruz Machado', 'Paranacity', 'Mangueirinha', 'Palotina', 'Nova Laranjeiras', 'Santo Antônio do Caiuá', 'Lidianópolis', 'Uraí'];
        v_titulos := ARRAY['Centro de Assistência Familiar', 'Programa Primeira Infância', 'Casa de Acolhimento Idoso', 'Centro de Referência da Mulher', 'Programa Jovem Aprendiz', 'Cozinha Comunitária', 'Centro de Inclusão PCD', 'Programa Renda Mínima', 'Casa de Passagem', 'Centro de Convivência'];
      
      WHEN v_eixo.nome ILIKE '%Economia%' OR v_eixo.nome ILIKE '%Turismo%' THEN
        v_municipios := ARRAY['Cruzmaltina', 'Japurá', 'São Jorge do Patrocínio', 'Céu Azul', 'Andirá', 'Douradina', 'Guaratuba', 'Sertaneja', 'Ramilândia', 'Jaboti'];
        v_titulos := ARRAY['Rota Turística Regional', 'Feira do Produtor Local', 'Centro de Artesanato', 'Parque de Eventos', 'Incubadora de Negócios', 'Portal Turístico', 'Museu Regional', 'Centro Gastronômico', 'Trilha Ecológica', 'Pousada Comunitária'];
      
      WHEN v_eixo.nome ILIKE '%Educação%' THEN
        v_municipios := ARRAY['Altamira do Paraná', 'Terra Roxa', 'Cerro Azul', 'Pérola', 'Atalaia', 'São José dos Pinhais', 'Jesuítas', 'Carambeí', 'Bituruna', 'Primeiro de Maio'];
        v_titulos := ARRAY['Escola Técnica Profissionalizante', 'Centro de Educação Integral', 'Biblioteca Pública Digital', 'Laboratório de Robótica', 'Centro de Idiomas', 'Escola de Artes', 'Programa de Alfabetização', 'Centro de Reforço Escolar', 'Universidade Aberta', 'Creche Municipal 24h'];
      
      WHEN v_eixo.nome ILIKE '%Infraestrutura%' THEN
        v_municipios := ARRAY['Icaraíma', 'Campina da Lagoa', 'Lobato', 'Boa Ventura de São Roque', 'Flor da Serra do Sul', 'Quatro Barras', 'Lupionópolis', 'São João do Ivaí', 'Tupãssi', 'Floresta'];
        v_titulos := ARRAY['Pavimentação de Estradas Rurais', 'Sistema de Drenagem Urbana', 'Iluminação Pública LED', 'Ponte sobre Rio Municipal', 'Terminal Rodoviário', 'Parque Linear', 'Ciclovia Urbana', 'Praça Central', 'Revitalização Centro Histórico', 'Sistema de Esgoto'];
      
      WHEN v_eixo.nome ILIKE '%Saúde%' THEN
        v_municipios := ARRAY['Virmond', 'Braganey', 'Nova Santa Bárbara', 'Paranapoema', 'Indianópolis', 'Pitanga', 'Jardim Alegre', 'Abatiá', 'Medianeira', 'Marialva'];
        v_titulos := ARRAY['UBS 24 Horas', 'Centro de Especialidades', 'Farmácia Popular Municipal', 'CAPS Álcool e Drogas', 'Clínica da Mulher', 'Centro de Fisioterapia', 'Programa Saúde da Família', 'UPA Municipal', 'Centro de Diagnóstico', 'Hospital Regional'];
      
      WHEN v_eixo.nome ILIKE '%Segurança%' THEN
        v_municipios := ARRAY['Maripá', 'Bom Jesus do Sul', 'Mariluz', 'Almirante Tamandaré', 'Teixeira Soares', 'Floraí', 'São Jorge do Ivaí', 'Santo Inácio', 'Novo Itacolomi', 'Jacarezinho'];
        v_titulos := ARRAY['Base Comunitária de Segurança', 'Sistema de Videomonitoramento', 'Guarda Municipal', 'Ronda Escolar', 'Patrulha Rural', 'Centro Integrado de Operações', 'Programa Vizinhança Solidária', 'Delegacia da Mulher', 'PROERD Municipal', 'Batalhão de Trânsito'];
      
      WHEN v_eixo.nome ILIKE '%Tecnologia%' OR v_eixo.nome ILIKE '%Inovação%' THEN
        v_municipios := ARRAY['Vila Alta', 'Grandes Rios', 'Santo Antônio da Platina', 'Apucarana', 'Dois Vizinhos', 'Mandirituba', 'Guapirama', 'Londrina', 'Maringá', 'Cascavel'];
        v_titulos := ARRAY['Hub de Inovação Digital', 'Telecentro Comunitário', 'Cidade Inteligente', 'Fab Lab Municipal', 'Centro de Startups', 'WiFi Público', 'Governo Digital', 'Incubadora Tech', 'Centro de Capacitação TI', 'Parque Tecnológico'];
      
      ELSE
        v_municipios := ARRAY['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá'];
        v_titulos := ARRAY['Projeto Piloto 1', 'Projeto Piloto 2', 'Projeto Piloto 3', 'Projeto Piloto 4', 'Projeto Piloto 5', 'Projeto Piloto 6', 'Projeto Piloto 7', 'Projeto Piloto 8', 'Projeto Piloto 9', 'Projeto Piloto 10'];
    END CASE;

    -- Inserir 10 propostas para este eixo
    FOR i IN 1..10 LOOP
      -- Buscar ID do município
      SELECT m.id INTO v_municipio FROM public.municipios m WHERE m.nome = v_municipios[i] LIMIT 1;
      
      -- Inserir proposta
      INSERT INTO public.propostas_tecnicas (
        autor_id,
        eixo_id,
        municipio_id,
        titulo,
        descricao,
        status,
        etapa,
        metas,
        indicadores,
        created_at,
        updated_at
      ) VALUES (
        v_autor_id,
        v_eixo.id,
        v_municipio.id,
        v_titulos[i] || ' - ' || v_municipios[i],
        'Proposta técnica para implementação de ' || v_titulos[i] || ' no município de ' || v_municipios[i] || '. Este projeto visa melhorar a qualidade de vida da população local através de ações coordenadas entre governo estadual e municipal.',
        v_status[i]::proposal_status,
        v_etapas[i],
        'Meta 1: Implementação em 6 meses. Meta 2: Atender 1000 pessoas. Meta 3: Reduzir custos em 20%.',
        'Indicador 1: Número de beneficiários. Indicador 2: Satisfação do usuário. Indicador 3: Custo por atendimento.',
        now() - (v_created_days[i] || ' days')::interval,
        now() - (v_updated_hours[i] || ' hours')::interval
      );
    END LOOP;
  END LOOP;
END $$;