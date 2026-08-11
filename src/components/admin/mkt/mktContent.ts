// Conteúdo curado — personas, argumentos por eixo e cases de sucesso.
// Números e narrativas regionais são ao vivo (vêm do banco); este arquivo
// guarda só o conteúdo analítico estável, no mesmo padrão do artefato
// original construído no chat.

export interface Persona {
  nome: string;
  regioes: string;
  desc: string;
  emocional: string;
  racional: string;
  insights: string[];
  ganchos: string[];
  cuidados: string;
}

export const PERSONAS: Persona[] = [
  {
    nome: 'Mãe/cuidadora urbana',
    regioes: 'Metropolitana de Curitiba e Norte Central',
    desc: 'Mulher, tema dominante Desenvolvimento Social. Ela não está pedindo política pública em abstrato — está pedindo alívio de uma carga que ela carrega sozinha.',
    emocional: 'O gatilho não é carinho genérico, é trabalho invisível reconhecido. Ela é quem liga pra marcar consulta, quem corre atrás de vaga em creche, quem cobra material escolar — e isso cansa antes de qualquer decepção com o serviço em si. Ativar esse campo é dizer em voz alta o que ela faz sem ser vista, não prometer que vai cuidar dela.',
    racional: 'Ela compara — mesmo sem pagar plano de saúde ou escola particular, ela sabe o que existe porque vê nas redes. Não convence com verba investida, convence com tempo: dias de espera, vaga disponível, professor em sala.',
    insights: [
      'Nas sugestões femininas, educação e saúde quase sempre aparecem ao lado de crianças e família.',
      'Professor aparece emparelhado com salário e valorização — ela reconhece o mesmo trabalho invisível na professora.',
      'Atendimento e fila pesam mais que investimento no vocabulário dela.',
    ],
    ganchos: [
      'Cena na cozinha de manhã: mãe no celular tentando marcar consulta, cronômetro correndo — corte para dado real de fila naquela cidade.',
      'Depoimento real: uma mãe lendo em voz alta a própria sugestão que ela mandou pra plataforma.',
      'Peça estática: relógio de parede travado com a frase seu tempo também é patrimônio público.',
    ],
    cuidados: 'Não usar empoderamento nem jargão de marketing feminino. Nunca abrir com número de investimento em reais; abra com tempo ou vaga.',
  },
  {
    nome: 'Produtor/trabalhador do interior',
    regioes: 'Centro Ocidental, Sudoeste, Oeste, Centro Oriental',
    desc: 'Homem, tema dominante Infraestrutura/Economia. Ele não tem medo, tem indignação de quem produz e sente que ninguém escoa o que ele constrói.',
    emocional: 'O gatilho é injustiça de reconhecimento — eu trabalho, eu produzo, e a estrada que eu preciso pra escoar minha safra não anda. Ele quer ouvir que o governo vai parar de atrapalhar, não que vai ajudar.',
    racional: 'Ele já fez a conta: hora parada em pedágio ou buraco é prejuízo direto — pneu, diesel, prazo de entrega. Fala a língua dele quem fala em produtividade, escoamento e prazo.',
    insights: [
      'Turismo aparece quase tão citado quanto empresas no eixo econômico — espaço pra falar de agroturismo.',
      'Duplicação e pedágio aparecem sempre juntos — pra ele infraestrutura e economia são a mesma coisa.',
      'Territorialidade específica (rios, trechos de rodovia nomeados) converte mais que Paraná genérico.',
    ],
    ganchos: [
      'Drone sobre a plantação, corte pra caminhão parado em pedágio, corte pra planilha de custo subindo.',
      'Depoimento real de produtor contando quanto já perdeu num trecho específico citado nas sugestões da região.',
      'Peça estática: mapa da rodovia local com selo aqui, exatamente no trecho reclamado.',
    ],
    cuidados: 'Nunca "apoio ao pequeno produtor" genérico sem citar a estrada ou região específica.',
  },
  {
    nome: 'Urbano preocupado com segurança',
    regioes: 'Metropolitana de Curitiba',
    desc: 'Público misto, mais masculino. O medo aqui é comparativo — de virar o que ele já viu outro lugar virar.',
    emocional: 'Medo de perder o que já foi conquistado, não medo de ameaça desconhecida. Fala-se em manter e proteger, não em prometer mudança radical.',
    racional: 'Quer prova de competência técnica, não bravata. Policiais, forças, dados e prevenção pesam tanto quanto o medo em si.',
    insights: [
      'Segurança aqui mistura medo do cidadão comum com pauta corporativa de quem trabalha com efetivo policial.',
      'Corrupção está no mesmo campo semântico de segurança — é insegurança institucional pra esse público.',
      'Trânsito e acidente de moto pesam tanto quanto criminalidade violenta.',
    ],
    ganchos: [
      'Moro caminhando por rua movimentada à noite, cita dado real da própria cidade, fecha com autoridade técnica de ex-juiz.',
      'Gráfico comparativo discreto, sem nomear outro estado, mas reconhecível.',
      'Depoimento de agente de segurança sobre efetivo e estrutura, não sobre medo.',
    ],
    cuidados: 'Nunca sensacionalizar com imagem de choque. Nunca prometer acabar com a violência.',
  },
  {
    nome: 'Regiões esquecidas',
    regioes: 'Sudeste, Centro-Sul, Norte Pioneiro',
    desc: 'Menor volume de sugestões não é menor necessidade — é sintoma de menor alcance de campanha até agora.',
    emocional: 'O gatilho certo é reconhecimento, não promessa. O sentimento dominante é resignação — prometer demais soa falso justamente aqui.',
    racional: 'O dado prova o argumento: essas regiões têm a maior concentração proporcional de menção a saúde do estado, mesmo com menor volume — a dor existe, só não está sendo ouvida.',
    insights: [
      'Saúde dispara nessas regiões pela distância física a atendimento especializado.',
      'Baixo volume é sintoma de baixo alcance de mídia paga até aqui, não de desinteresse.',
    ],
    ganchos: [
      'Moro visitando fisicamente uma cidade pequena, sem estúdio — a presença física é o próprio conteúdo.',
      'Peça simples com dado bruto: essa cidade tem X mil habitantes e Y sugestões — queremos ouvir mais gente daqui.',
    ],
    cuidados: 'Não prometer política pública específica ainda. Prioridade é awareness e convite à participação.',
  },
  {
    nome: 'Direita da moralidade pública (classe B/C1)',
    regioes: 'Validada por pesquisa qualitativa real (16 grupos focais, mai/2026) em Maringá, Londrina, Curitiba, Ponta Grossa e Cascavel — é um recorte de classe social, não de território fixo',
    desc: 'A pesquisa qualitativa mostra esse segmento como explicitamente diferente de moralidade religiosa — é anti-corrupção, anti-privilégio, rejeita um STF politizado, mas também rejeita radicalismo puro. É exatamente a faixa de classe onde a viabilidade de Moro pro governo está em disputa real contra Ratinho Jr.',
    emocional: 'O gatilho é indignação ética, não medo nem carência. Rejeita corrupção, privilégio e impunidade — mas assusta com radicalismo: discurso anti-STF explícito ou tom de confronto afasta parte desse público, mesmo entre quem rejeita o STF politizado. Quer firmeza sem truculência.',
    racional: 'Cobra função e entrega, não passado — a própria pesquisa registra a frase: cobra função, emendas, fiscalização, segurança firme e verbas para saúde e infraestrutura, resultado prático, não só passado. Esse público compara com Ratinho, que "dá certo" — se Moro não mostrar diferencial concreto e recente, a tendência é migrar pro conforto do resultado já provado.',
    insights: [
      'Pesquisa qualitativa real (16 grupos focais, 5 cidades, mai/2026): direita da moralidade pública é forte especificamente na classe média B/C1, e a própria pesquisa faz questão de separá-la de moralidade religiosa.',
      'Frase testada e mais aceita nos grupos: "menos briga ideológica e mais gente que entregue resultado" — agradou especialmente em Cascavel, Maringá e Londrina.',
      'Esse público rejeita tanto a esquerda quanto o radicalismo puro de direita — bem posicionado pra discurso técnico e institucional, não passional.',
      'A mesma pesquisa mostra a vulnerabilidade que essa persona expõe: Moro é visto como "sumido no Senado" e "melhor como juiz" — a força dele hoje está concentrada na classe A/B1 e no bolsonarismo raiz, exatamente fora desse recorte B/C1 que decide a eleição de governo.',
    ],
    ganchos: [
      'Peça com a frase já testada como headline: "menos briga ideológica e mais gente que entregue resultado".',
      'Roteiro que mostra Moro fiscalizando ou cobrando resultado concreto agora, não discursando sobre o passado da Lava Jato.',
      'Contraponto direto à percepção de ausência: nomear uma entrega recente e específica do mandato, nunca currículo genérico.',
    ],
    cuidados: 'Nunca usar linguagem anti-STF radical aqui — a própria pesquisa mostra que isso assusta parte desse público. Separar sempre "ser de direita" de "ser um radical de direita". Nunca deixar Moro parecer só reativo ao passado sem mostrar o que fez recentemente — essa é a vulnerabilidade nomeada pela pesquisa.',
  },
];

export interface CaseSucesso {
  eixo: string;
  titulo: string;
  local: string;
  dor: string;
  estrategia: string;
  resultado: string;
  licao: string;
}

export const CASES: CaseSucesso[] = [
  {
    eixo: 'Desenvolvimento Econômico Sustentável',
    titulo: 'Quando o medo do mercado ameaçou travar a virada',
    local: 'Eleição nacional, 2002',
    dor: 'Parte do eleitorado e do mercado temia que um governo de esquerda quebrasse as regras econômicas em vigor — o risco político travava a intenção de voto mesmo com o candidato liderando as pesquisas.',
    estrategia: 'Um documento público comprometendo-se a manter os fundamentos econômicos em vigor, sem abandonar a pauta social — remoção de um medo específico e nomeado, não promessa nova.',
    resultado: 'A intenção de voto travada por medo destravou; vitória em dois turnos, incluindo votos de quem antes tinha receio declarado.',
    licao: 'Quando uma persona trava por medo específico e nomeável, endereçar esse medo diretamente vale mais que reforçar a proposta positiva — vale para o público econômico do Oeste e Centro Oriental.',
  },
  {
    eixo: 'Segurança, Justiça, Combate à Corrupção',
    titulo: 'Quando a gestão técnica superou o discurso duro',
    local: 'Governo estadual, Nordeste, a partir de 2007',
    dor: 'O estado ocupava o 2º lugar no ranking nacional de homicídios, com a população pedindo resposta urgente e dura ao crime.',
    estrategia: 'Plano de estado com gestão por dado público, integração entre polícias, aumento de efetivo e liderança pessoal contínua do governador acompanhando os números mês a mês.',
    resultado: 'Queda de cerca de 35 a 40% na taxa de homicídios em poucos anos — mas o resultado reverteu quando o governador se afastou do cargo, mostrando dependência da presença contínua da liderança.',
    licao: 'Reforça que o tom sóbrio e institucional já definido pra voz do senador Moro tem encaixe direto no público de segurança da Metropolitana de Curitiba — e que sustentar o resultado exige presença contínua.',
  },
  {
    eixo: 'Segurança, Justiça, Combate à Corrupção',
    titulo: 'Quando a retórica extrema converteu rápido mas não sustentou',
    local: 'Governo estadual, Sudeste, 2018',
    dor: 'Onda de violência urbana e clamor público por resposta imediata e dura ao crime organizado.',
    estrategia: 'Discurso de confronto armado explícito como plataforma central de campanha.',
    resultado: 'Vitória eleitoral rápida e expressiva — mas o governo eleito foi interrompido por impeachment menos de dois anos depois.',
    licao: 'Contraponto direto ao case anterior: retórica extrema converte voto rápido, mas é o padrão mais associado a desgaste de governo depois.',
  },
  {
    eixo: 'Desenvolvimento Social',
    titulo: 'Quando a cooperação técnica virou referência nacional em educação',
    local: 'Governo estadual, Nordeste, a partir de 2007',
    dor: 'O estado tinha uma das piores notas educacionais do país — nota 3,2 no principal índice nacional em 2005.',
    estrategia: 'Pacto técnico de cooperação com todos os municípios, sem disputa de crédito político, com avaliação sistemática e forte investimento em formação de professores alfabetizadores.',
    resultado: 'Maior crescimento do índice educacional do Brasil no período; hoje concentra a maioria dos municípios mais bem colocados do ranking nacional.',
    licao: 'Pro Norte Pioneiro e Norte Central, onde educação já é a pauta dominante, o discurso pode prometer método replicável, não só mais recurso.',
  },
  {
    eixo: 'Desenvolvimento das Cidades e Infraestrutura',
    titulo: 'Quando medir o resultado da estrada virou política pública',
    local: 'Governo estadual, Sudeste, anos 2000',
    dor: 'Malha rodoviária deteriorada e orçamento insuficiente para manutenção constante em todas as regiões.',
    estrategia: 'Contratos de manutenção rodoviária pagos por desempenho comprovado, não por obra entregue, com acompanhamento público e metas mensuráveis.',
    resultado: 'A proporção de rodovias com contrato de manutenção por desempenho quase dobrou em poucos anos, com ganhos simultâneos em saúde e educação pelo mesmo modelo.',
    licao: 'Pro Centro Ocidental e Sudoeste, prometer que a manutenção vai ser cobrada por resultado entregue — não que some depois da inauguração.',
  },
  {
    eixo: 'Desenvolvimento Econômico Sustentável',
    titulo: 'Quando descentralizar o polo industrial reduziu desigualdade regional',
    local: 'Governo estadual, Sul, trajetória de décadas',
    dor: 'Risco comum a estados em crescimento: concentrar toda nova indústria na capital e no litoral, aprofundando a desigualdade com o interior.',
    estrategia: 'Descentralização industrial deliberada, com polos regionais distintos por vocação e infraestrutura logística acompanhando cada polo, não só a capital.',
    resultado: 'Menor taxa de desemprego do país e um dos menores índices de pobreza, com emprego distribuído entre múltiplas cidades do interior.',
    licao: 'Pro Centro Oriental, Noroeste e Oeste: emprego não precisa prometer mais uma fábrica na capital — pode prometer um polo com identidade própria em cada região.',
  },
];

// Argumentos por eixo — extraídos do campo semântico das sugestões (ver
// nuvem de palavras ao vivo na própria aba Temas).
export const ARGUMENTOS_POR_EIXO: Record<string, string[]> = {
  'Geral': [
    'Tríade educação-saúde-segurança como o "pacote mínimo" que o eleitor paranaense espera do próximo governo, independente de eixo formal.',
    '"Cidade", "cidades" e "municípios" no topo do vocabulário confirmam leitura municipalista: o eleitor quer sentir a mudança perto de casa.',
  ],
  'Desenvolvimento Social': [
    'Valorização do professor como política de Estado, ligada a plano de carreira e concurso público.',
    'Saúde com meta de tempo de fila, não promessa genérica de mais investimento.',
    'Educação como ponte de mobilidade social para a próxima geração.',
  ],
  'Desenvolvimento das Cidades e Infraestrutura': [
    'Duplicação de rodovias e fim de pedágio abusivo como pauta unificadora entre interior e fronteira.',
    'Estrada não é conforto, é economia — conecta infraestrutura a benefício social direto.',
    'Regionalização da obra — a demanda é territorial, não centrada só na capital.',
  ],
  'Desenvolvimento Econômico Sustentável': [
    'Redução de impostos e incentivo fiscal como motor de geração de emprego.',
    'Turismo como diversificação econômica regional — espaço de pauta pouco explorado.',
    'Energia e inovação como parte de um discurso econômico de futuro.',
  ],
  'Segurança, Justiça, Combate à Corrupção': [
    'Efetivo policial e valorização das forças de segurança — pauta corporativa tanto quanto medo do cidadão.',
    'Combate ao crime organizado e ao tráfico nomeado explicitamente.',
    'Gestão orientada por dado — accountability rende mais que discurso de repressão pura.',
  ],
  'Gestão Pública Eficiente': [
    'Plano de carreira e valorização de servidores como pauta corporativa específica do funcionalismo.',
    'Eficiência sem enxugamento raso — o vocabulário pede gestão e projeto, não corte.',
  ],
};

// Riscos e vulnerabilidades — achados de pesquisa qualitativa real (16 grupos
// focais, 5 cidades do PR, mai/2026) que a equipe de conteúdo não deve
// ignorar ao produzir peças pra campanha ao governo.
export interface RiscoVulnerabilidade {
  titulo: string;
  achado: string;
  implicacao: string;
  recomendacao: string;
}

export const RISCOS_VULNERABILIDADES: RiscoVulnerabilidade[] = [
  {
    titulo: '"Sumiu no Senado" — percepção de ausência de entrega',
    achado: 'A pesquisa qualitativa mostra Moro como conhecido, forte e competitivo, mas com poucas entregas percebidas no Senado — o mandato é visto como distante da realidade do eleitor paranaense, mais ligado à pauta nacional. Fissuras de imagem citadas nos grupos: "sumido no Senado", "melhor como juiz", "se perdeu na política".',
    implicacao: 'Qualquer peça que se apoie só no passado (Lava Jato, currículo de ex-juiz) sem mostrar entrega recente reforça essa vulnerabilidade em vez de resolvê-la.',
    recomendacao: 'Todo conteúdo institucional deveria nomear uma entrega concreta e recente do mandato — nunca só currículo ou passado.',
  },
  {
    titulo: 'Força concentrada em A/B1 — disputa real é a partir de B2',
    achado: 'A pesquisa mostra a força de Moro concentrada na classe rica (A/B1, principalmente Curitiba) e no bolsonarismo raiz. A partir da classe B2, quem domina a percepção é Ratinho Jr — eficaz para Senado, mas incompleto para governo.',
    implicacao: 'Mídia paga generalista por região corre o risco de reforçar quem já converte sozinho (A/B1) e não alcançar o público onde a eleição de governo realmente se decide.',
    recomendacao: 'Priorizar orçamento e enquadramento de conteúdo pra alcançar B2/C — é ali que fica a persona "Direita da moralidade pública", que ainda não está fechada com ninguém.',
  },
  {
    titulo: 'Risco de contágio ao atacar adversários ligados a Ratinho',
    achado: 'A pesquisa aponta que casos de corrupção específicos de um adversário poderiam desestabilizar migração de voto — mas ataques mal calibrados correm o risco de respingar em Ratinho Jr, que é avaliado de forma muito positiva, e isso aumentaria a rejeição a Moro, não reduziria.',
    implicacao: 'Ratinho Jr não deve ser alvo direto de crítica em nenhuma peça — o risco de dano à própria campanha é maior que o ganho.',
    recomendacao: 'Se for necessário explorar vulnerabilidade de um adversário específico, mirar factualmente só no indivíduo, nunca no governo Ratinho como um todo.',
  },
  {
    titulo: 'Discurso anti-STF radical assusta parte do público moderado',
    achado: 'A pesquisa mostra que o combate visceral ao STF e a linha de discurso mais radical desagradam parte do público, mesmo entre quem rejeita um STF politizado — há uma linha clara entre "ser de direita" e "ser um radical de direita" nos grupos moderados.',
    implicacao: 'Um tom de confronto explícito reduz o alcance justamente na classe média B/C1 que decide a eleição.',
    recomendacao: 'Manter a linha institucional de "rejeição a um STF politizado", sem tom de confronto pessoal ou radicalização explícita — consistente com o enquadramento sóbrio já definido para a voz do senador.',
  },
];
