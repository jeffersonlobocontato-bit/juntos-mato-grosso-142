/**
 * Perguntas parametrizadas por eixo para o Bloco F (Visão Setorial)
 * 5 perguntas técnicas específicas + 1 pergunta aberta comum a todos os eixos
 *
 * Programa-Teste parametrizado por eixo para o Bloco G (Cocriação)
 */

const PERGUNTA_ABERTA_COMUM =
  "Além do que discutimos, o que você pessoalmente pretende ou gostaria de ver acontecer na sua área nos próximos 4 anos? Fale livremente.";

export interface BlocoFConfig {
  eixoNome: string;
  perguntas: string[]; // 6 perguntas (5 técnicas + 1 aberta)
}

export interface ProgramaTesteConfig {
  nome: string;
  descricao: string;
}

export const blocoFPorEixo: Record<string, BlocoFConfig> = {
  // 1. Desenvolvimento Social
  "e1000000-0000-0000-0000-000000000001": {
    eixoNome: "Desenvolvimento Social",
    perguntas: [
      "Na sua área de atuação, quais indicadores sociais do Paraná estão estagnados ou piorando, apesar dos programas existentes? O que explica essa ineficácia?",
      "Qual política pública social do Estado hoje tem boa cobertura mas baixa resolutividade — ou seja, atende muitos mas resolve pouco? O que precisa mudar no desenho?",
      "Na integração entre saúde, educação e assistência social, onde está o maior gap operacional: protocolo, sistema, equipe, governança? Cite um exemplo prático.",
      "Qual marco regulatório ou normativa estadual está travando a modernização dos serviços sociais na sua área? O que deveria ser revisado?",
      "Se você tivesse que redesenhar o modelo de financiamento estadual para a sua área (fundo, repasse, convênio), o que mudaria para que o recurso chegue mais rápido e com menos desperdício?",
      PERGUNTA_ABERTA_COMUM,
    ],
  },

  // 2. Desenvolvimento Econômico Sustentável
  "e2000000-0000-0000-0000-000000000002": {
    eixoNome: "Desenvolvimento Econômico Sustentável",
    perguntas: [
      "Na cadeia produtiva do seu setor, onde está o maior gargalo de competitividade no Paraná hoje: tributação, regulação, crédito, logística, mão de obra ou tecnologia? Por quê?",
      "Qual instrumento de política econômica do Estado (incentivo fiscal, fundo, programa de crédito, desburocratização) tem o melhor custo-benefício e qual tem o pior? Justifique.",
      "A reforma tributária muda a dinâmica do seu setor no Paraná. Qual risco operacional concreto você enxerga na transição e o que o Estado deveria fazer para mitigar?",
      "Em termos de regulação e licenciamento, qual exigência hoje é desproporcional ao risco e poderia ser simplificada sem perda de controle? Cite o caso concreto.",
      "Qual elo da cadeia de valor do seu setor está mais vulnerável à informalidade ou evasão, e que mecanismo de incentivo (não punitivo) funcionaria para trazer esse elo para a formalidade?",
      PERGUNTA_ABERTA_COMUM,
    ],
  },

  // 3. Desenvolvimento das Cidades e Infraestrutura
  "e3000000-0000-0000-0000-000000000003": {
    eixoNome: "Desenvolvimento das Cidades e Infraestrutura",
    perguntas: [
      "Considerando o déficit de infraestrutura na sua área de atuação, qual investimento tem o maior multiplicador econômico e social no Paraná e por que não está sendo priorizado?",
      "Na modelagem de projetos de infraestrutura (PPP, concessão, contrato de obras), onde está o maior gargalo técnico: estudos de viabilidade, licenciamento ambiental, desapropriação, engenharia de custos? O que resolveria?",
      "Qual norma técnica ou marco regulatório estadual/federal está defasado e impacta diretamente a execução de projetos na sua área? O que deveria mudar?",
      "Na gestão de ativos de infraestrutura existentes (manutenção, operação, fiscalização), onde o Estado mais perde dinheiro por falta de gestão técnica? Cite um exemplo.",
      "Consórcios intermunicipais são uma saída para escala em saneamento, mobilidade e resíduos. Na prática, o que impede que funcionem melhor: governança, financiamento, capacidade técnica, ou falta de incentivo estadual?",
      PERGUNTA_ABERTA_COMUM,
    ],
  },

  // 4. Gestão Pública Eficiente
  "e4000000-0000-0000-0000-000000000004": {
    eixoNome: "Gestão Pública Eficiente",
    perguntas: [
      "Qual processo administrativo do Estado você considera o mais ineficiente em termos de custo por transação? O que a transformação digital resolveria e o que precisa de redesenho de processo antes?",
      "Em termos de governança de dados, o Estado do Paraná tem capacidade de cruzar informações entre secretarias para tomada de decisão? Onde está o maior silo de dados e qual o impacto?",
      "Na sua experiência, qual mecanismo de controle (TCE, CGE, ouvidoria, auditorias) gera mais compliance real e qual gera mais burocracia sem retorno? O que ajustaria?",
      "A gestão de pessoal no Estado (concurso, capacitação, avaliação de desempenho, remuneração) está adequada para entregar serviços de qualidade? Qual é a principal distorção?",
      "Se o Paraná adotasse um modelo de orçamento por resultados (vinculando repasse a indicadores de entrega), quais áreas se beneficiariam mais e quais resistiriam? Como implementar sem paralisar?",
      PERGUNTA_ABERTA_COMUM,
    ],
  },

  // 5. Segurança, Justiça, Combate à Corrupção
  "e5000000-0000-0000-0000-000000000005": {
    eixoNome: "Segurança, Justiça, Combate à Corrupção",
    perguntas: [
      "Na sua área de atuação, qual indicador de segurança/justiça está piorando apesar dos investimentos? O que a abordagem atual não está capturando?",
      "Integração entre forças estaduais (PM, PC, Bombeiros) e entre Estado e municípios (guardas municipais): onde o gap operacional é mais crítico e o que resolveria em termos de protocolo, sistema ou cadeia de comando?",
      "No sistema de justiça criminal do Paraná, onde está o maior gargalo de fluxo: inquérito, denúncia, instrução, execução penal? Qual reforma processual ou operacional destravaria?",
      "Qual tecnologia ou ferramenta de inteligência (câmeras, analytics, cruzamento de bases, georreferenciamento) tem mais potencial de impacto no Paraná e o que impede a adoção em escala?",
      "Nos mecanismos de combate à corrupção e lavagem de dinheiro no âmbito estadual, o que funciona, o que é teatro e o que falta? Qual a principal lacuna institucional?",
      PERGUNTA_ABERTA_COMUM,
    ],
  },
};

/** Fallback genérico para eixos não mapeados */
export const blocoFGenerico: BlocoFConfig = {
  eixoNome: "Geral",
  perguntas: [
    "Quais são os principais indicadores da sua área que estão estagnados ou piorando? O que explica isso?",
    "Qual política pública existente tem boa cobertura mas baixa resolutividade?",
    "Onde está o maior gap operacional na integração entre órgãos na sua área?",
    "Qual marco regulatório está travando a modernização do seu setor?",
    "Se pudesse redesenhar o modelo de financiamento da sua área, o que mudaria?",
    PERGUNTA_ABERTA_COMUM,
  ],
};

export const getBlocoFConfig = (eixoId: string): BlocoFConfig => {
  return blocoFPorEixo[eixoId] || blocoFGenerico;
};

/** Programa-Teste parametrizado por eixo (Bloco G, pergunta 2) */
export const programaTestePorEixo: Record<string, ProgramaTesteConfig> = {
  "e1000000-0000-0000-0000-000000000001": {
    nome: "Porta Única Social",
    descricao: "Prontuário único integrado entre CRAS, UBS e escola para famílias em vulnerabilidade",
  },
  "e2000000-0000-0000-0000-000000000002": {
    nome: "Rua Produtiva Digital",
    descricao: "Modernização de comércio de rua com pagamento, catálogo, vendas online e gestão simples",
  },
  "e3000000-0000-0000-0000-000000000003": {
    nome: "Obra Transparente",
    descricao: "Dashboard público com rastreamento de obras, medições, prazos e desvios em tempo real",
  },
  "e4000000-0000-0000-0000-000000000004": {
    nome: "Licença Zero Clique",
    descricao: "Licença automática para atividades de baixo risco com checagem por dados e fiscalização posterior",
  },
};

export const programaTesteGenerico: ProgramaTesteConfig = {
  nome: "Programa-Piloto",
  descricao: "Um programa-piloto que possa ser testado em 90 dias no seu setor",
};

export const getProgramaTeste = (eixoId: string): ProgramaTesteConfig => {
  return programaTestePorEixo[eixoId] || programaTesteGenerico;
};

/** Exemplos contextualizados por eixo para os hints do formulário */
export interface ExemplosFormulario {
  a1_area_atuacao: string;
  a2_desafios_hint: string;
  b1_acoes_hint: string;
  b2_impacto_hint: string;
  c1_causas_hint: string;
  c2_caso_hint: string;
  c3_prioridade_hint: string;
  d1_rotinas_hint: string;
  d2_substituicao_hint: string;
  e1_planejamento_hint: string;
  e2_integracao_hint: string;
  g1_entregas_hint: string;
}

export const exemplosFormularioPorEixo: Record<string, ExemplosFormulario> = {
  // 1. Desenvolvimento Social
  "e1000000-0000-0000-0000-000000000001": {
    a1_area_atuacao: 'Ex: "Atenção primária em saúde no litoral" ou "Proteção social em municípios de alta vulnerabilidade".',
    a2_desafios_hint: "Foque nos desafios operacionais: filas de espera no SUS, cobertura do CRAS, evasão escolar, etc.",
    b1_acoes_hint: "Programas sociais que dão resultado — ex: Programa Família Paranaense, Leite das Crianças, rede de CRAS.",
    b2_impacto_hint: "Quantifique: quantas famílias ficariam desassistidas? Qual indicador pioraria?",
    c1_causas_hint: "Vá além dos sintomas — ex: falta de prontuário integrado entre saúde e assistência, subfinanciamento do SUAS.",
    c2_caso_hint: "Um caso concreto — ex: família atendida no CRAS sem acesso a consulta na UBS por falta de integração.",
    c3_prioridade_hint: "A ação de maior impacto — ex: unificar cadastro social entre secretarias.",
    d1_rotinas_hint: "Ex: programas assistenciais duplicados entre CRAS e UBS sem prontuário integrado.",
    d2_substituicao_hint: "Ex: prontuário social único inspirado no modelo de Maricá-RJ ou no CadÚnico integrado.",
    e1_planejamento_hint: "Ex: programa anunciado de creches que não saiu do papel, metas do PPA não executadas na assistência.",
    e2_integracao_hint: "Ex: repasse estadual que chega atrasado aos municípios, falta de protocolo único entre CRAS e UBS.",
    g1_entregas_hint: "Ações rápidas — ex: mutirão de atualização do CadÚnico, ampliação de horário dos CRAS, força-tarefa de vacinação.",
  },

  // 2. Desenvolvimento Econômico Sustentável
  "e2000000-0000-0000-0000-000000000002": {
    a1_area_atuacao: 'Ex: "Logística de grãos na região Oeste" ou "Crédito para micro e pequenas empresas".',
    a2_desafios_hint: "Foque nos gargalos: tributação, crédito, infraestrutura logística, mão de obra qualificada.",
    b1_acoes_hint: "Programas que funcionam — ex: Bom Emprego, incentivos do BRDE, cooperativismo agroindustrial.",
    b2_impacto_hint: "Quantifique: quantos empregos seriam perdidos? Qual impacto no PIB regional?",
    c1_causas_hint: "Vá além dos sintomas — ex: burocracia para abertura de empresa, custo logístico, falta de crédito acessível.",
    c2_caso_hint: "Um caso concreto — ex: empresa que desistiu de investir no PR por demora no licenciamento.",
    c3_prioridade_hint: "A ação de maior impacto — ex: simplificar o licenciamento para atividades de baixo risco.",
    d1_rotinas_hint: "Ex: incentivos fiscais sem contrapartida de emprego, processos de licenciamento que levam meses.",
    d2_substituicao_hint: "Ex: licença automática para baixo risco (modelo Redesim), crédito vinculado a resultados.",
    e1_planejamento_hint: "Ex: polo industrial anunciado sem estudo de viabilidade, metas de geração de emprego não acompanhadas.",
    e2_integracao_hint: "Ex: falta de alinhamento entre incentivos estaduais e municipais, duplicação de programas de crédito.",
    g1_entregas_hint: "Ações rápidas — ex: balcão único para empresas, desburocratização digital, pacote de crédito emergencial para MEIs.",
  },

  // 3. Desenvolvimento das Cidades e Infraestrutura
  "e3000000-0000-0000-0000-000000000003": {
    a1_area_atuacao: 'Ex: "Saneamento básico em municípios de pequeno porte" ou "Mobilidade urbana em Curitiba e região metropolitana".',
    a2_desafios_hint: "Foque nos gargalos: déficit de saneamento, manutenção viária, transporte público, habitação.",
    b1_acoes_hint: "O que funciona — ex: concessões de rodovias, programa Paraná Trifásico, consórcios de saneamento.",
    b2_impacto_hint: "Quantifique: quantos km de estrada deteriorariam? Quantos municípios sem água tratada?",
    c1_causas_hint: "Vá além dos sintomas — ex: licenciamento ambiental travado, falta de projetos executivos, desapropriação lenta.",
    c2_caso_hint: "Um caso concreto — ex: obra de saneamento parada por 2 anos por falta de licença ambiental.",
    c3_prioridade_hint: "A ação de maior impacto — ex: criar banco de projetos executivos pré-aprovados para saneamento.",
    d1_rotinas_hint: "Ex: obras sem fiscalização técnica que geram aditivos, manutenção corretiva ao invés de preventiva.",
    d2_substituicao_hint: "Ex: contratos de manutenção por desempenho, dashboard público de obras (modelo Obra Transparente).",
    e1_planejamento_hint: "Ex: duplicação de rodovia anunciada sem projeto executivo, PAC com obras paralisadas.",
    e2_integracao_hint: "Ex: consórcios intermunicipais sem governança clara, repasses do Estado que não chegam na ponta.",
    g1_entregas_hint: "Ações rápidas — ex: operação tapa-buraco emergencial, retomada de obras paralisadas, licitação de projetos-chave.",
  },

  // 4. Gestão Pública Eficiente
  "e4000000-0000-0000-0000-000000000004": {
    a1_area_atuacao: 'Ex: "Transformação digital nos processos de licenciamento" ou "Capacitação de servidores na área tributária".',
    a2_desafios_hint: "Foque nos gargalos: burocracia, sistemas legados, falta de dados integrados, gestão de pessoal.",
    b1_acoes_hint: "O que funciona — ex: Nota Paraná, sistema e-Protocolo, concursos regulares para carreiras estratégicas.",
    b2_impacto_hint: "Quantifique: quanto tempo/custo seria perdido? Qual processo voltaria ao papel?",
    c1_causas_hint: "Vá além dos sintomas — ex: silos de dados entre secretarias, ausência de avaliação de desempenho, sistemas incompatíveis.",
    c2_caso_hint: "Um caso concreto — ex: processo de licenciamento que exige 5 sistemas diferentes sem integração.",
    c3_prioridade_hint: "A ação de maior impacto — ex: criar barramento de dados entre secretarias (interoperabilidade).",
    d1_rotinas_hint: "Ex: relatórios manuais em planilha que poderiam ser automatizados, auditorias meramente formais.",
    d2_substituicao_hint: "Ex: dashboards em tempo real, auditorias baseadas em risco, avaliação de desempenho por entregas.",
    e1_planejamento_hint: "Ex: governo digital anunciado mas com 80% dos serviços ainda presenciais, PPA desconectado do orçamento.",
    e2_integracao_hint: "Ex: municípios sem acesso aos sistemas estaduais, capacitação centralizada que não chega no interior.",
    g1_entregas_hint: "Ações rápidas — ex: portal único de serviços digitais, publicação de dados abertos, simplificação de formulários.",
  },

  // 5. Segurança, Justiça, Combate à Corrupção
  "e5000000-0000-0000-0000-000000000005": {
    a1_area_atuacao: 'Ex: "Inteligência policial na região metropolitana" ou "Gestão penitenciária no interior".',
    a2_desafios_hint: "Foque nos gargalos: efetivo policial, tecnologia, integração entre forças, sistema prisional.",
    b1_acoes_hint: "O que funciona — ex: câmeras de monitoramento em Curitiba, programa de policiamento comunitário, GAECO.",
    b2_impacto_hint: "Quantifique: qual indicador criminal pioraria? Quantas investigações ficariam sem recurso?",
    c1_causas_hint: "Vá além dos sintomas — ex: falta de integração entre PM e PC, inquéritos represados, sistema penal superlotado.",
    c2_caso_hint: "Um caso concreto — ex: boletins de ocorrência em papel que atrasam o fluxo de inquéritos.",
    c3_prioridade_hint: "A ação de maior impacto — ex: digitalizar o registro de ocorrências com triagem automática por gravidade.",
    d1_rotinas_hint: "Ex: boletins de ocorrência em papel, rondas sem georreferenciamento, processos de corregedoria lentos.",
    d2_substituicao_hint: "Ex: BO digital com triagem automatizada, patrulhamento guiado por dados (hotspot policing), corregedoria digital.",
    e1_planejamento_hint: "Ex: metas de redução de homicídios anunciadas sem plano operacional, compra de viaturas sem plano de manutenção.",
    e2_integracao_hint: "Ex: guardas municipais sem integração com a PM, falta de protocolo unificado para atendimento de emergências.",
    g1_entregas_hint: "Ações rápidas — ex: instalação de câmeras em pontos críticos, delegacia digital piloto, força-tarefa anti-facções.",
  },
};

export const exemplosFormularioGenerico: ExemplosFormulario = {
  a1_area_atuacao: 'Ex: "Atenção primária em saúde no litoral" ou "Logística de grãos na região Oeste".',
  a2_desafios_hint: "Foque nos desafios operacionais e estruturais que enfrenta no dia a dia.",
  b1_acoes_hint: "O que o próximo governo NÃO deve mexer — programas que dão resultado.",
  b2_impacto_hint: "Quantifique ou descreva o impacto de descontinuar o que funciona.",
  c1_causas_hint: "Vá além dos sintomas — qual é a raiz do problema (regulatória, institucional, financeira, de gestão)?",
  c2_caso_hint: "Um caso concreto que exemplifique o problema — pode ser anônimo.",
  c3_prioridade_hint: "A ação de maior impacto com menor resistência ou custo.",
  d1_rotinas_hint: "Identifique o que consome recurso e não entrega resultado. Pode ser um processo, programa, estrutura ou hábito institucional.",
  d2_substituicao_hint: "Proponha alternativas concretas ou modelos de referência (de outros estados, países ou setores).",
  e1_planejamento_hint: "Existe diferença entre o que é comunicado e o que efetivamente se executa na sua área? Dê exemplos.",
  e2_integracao_hint: "A cooperação funciona? Onde estão os gargalos de integração (protocolo, sistema, recurso, governança)?",
  g1_entregas_hint: "Ações rápidas, visíveis e de baixa complexidade que sinalizem mudança de direção.",
};

export const getExemplosFormulario = (eixoId: string): ExemplosFormulario => {
  return exemplosFormularioPorEixo[eixoId] || exemplosFormularioGenerico;
};
