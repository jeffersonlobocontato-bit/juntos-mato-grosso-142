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
  "e5000000-0000-0000-0000-000000000005": {
    nome: "Delegacia Inteligente",
    descricao: "Triagem digital de ocorrências com priorização por gravidade e encaminhamento automatizado",
  },
};

export const programaTesteGenerico: ProgramaTesteConfig = {
  nome: "Programa-Piloto",
  descricao: "Um programa-piloto que possa ser testado em 90 dias no seu setor",
};

export const getProgramaTeste = (eixoId: string): ProgramaTesteConfig => {
  return programaTestePorEixo[eixoId] || programaTesteGenerico;
};
