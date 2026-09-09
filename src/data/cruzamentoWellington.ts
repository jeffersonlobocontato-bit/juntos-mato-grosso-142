// Cruzamento Quali-Quanti — Wellington Fagundes / Governo de Mato Grosso 2026
// Matriz de convergência de O'Cathain, Murphy & Nicholl (2010).
//
// QUANTI: PercentBrasil — Estado de Mato Grosso, 1.200 entrevistas presenciais,
// margem de erro 2,83 p.p., campo até 10/08/2026, registros TSE BR-01495/2026 e MT-03154/2026.
// QUALI: Vetor Pesquisas — 3 grupos de discussão presenciais na Grande Cuiabá,
// 18 e 19/08/2026 (mulheres 30-60, misto 18-29 indecisos, homens 30-60; C1/C2, até ensino médio).
//
// Todos os dados abaixo vêm exclusivamente desses dois relatórios reais.

export const DATA_CRUZAMENTO_WELLINGTON = {
  fontes: {
    quanti:
      "PercentBrasil — MT, 1.200 entrevistas presenciais, margem de erro 2,83 p.p., campo até 10/08/2026 (TSE BR-01495/2026 e MT-03154/2026). Estimulada Governo: Wellington 32,0% · Pivetta 21,0% · Natasha 11,0% · NS/Indeciso 24,5% · Nulo/Branco 7,5%.",
    quali:
      "Vetor Pesquisas — 3 grupos de discussão presenciais na Grande Cuiabá, 18 e 19/08/2026: mulheres 30-60 anos, grupo misto 18-29 anos (indecisos com propensão a Wellington) e homens 30-60 anos. Classe C1/C2, até ensino médio.",
  },
  limitacoes: [
    "A qualitativa cobre apenas a Grande Cuiabá (região Centro-Sul) e classes C1/C2 até ensino médio; a quantitativa é estadual. Leituras cruzadas fora da Grande Cuiabá são inferência, não evidência.",
    "Os grupos foram compostos majoritariamente por indecisos, o que amplifica a percepção de baixa informação em relação ao eleitorado geral.",
    "A 'segunda rodada de voto' dos grupos é movimento de percepção dentro da dinâmica, não projeção de intenção de voto.",
    "Cruzamentos por sexo, idade, escolaridade, renda e posicionamento na quanti têm base 'perfil' (composição do eleitorado de Wellington); região e voto para presidente têm base 'segmento' (desempenho dentro do grupo). Não devem ser lidos na mesma escala.",
    "A quali não foi delineada para medir intenção de voto: comparar magnitudes entre as duas bases não é válido, apenas direções.",
  ],
  analiseQualitativaIsolada: {
    descricao:
      "Leitura fechada do relatório qualitativo Vetor Pesquisas (Grande Cuiabá, ago/2026), antes de qualquer cruzamento com a quantitativa.",
    fichaMetodologica: {
      cobertura:
        "3 grupos presenciais na Grande Cuiabá (18 e 19/08/2026): mulheres 30-60, misto 18-29 (indecisos com propensão a Wellington), homens 30-60. Todos C1/C2, até ensino médio.",
      lacunas: [
        "Nenhum grupo no interior (Rondonópolis, Sinop, Sorriso, Cáceres, Barra do Garças) — justamente onde a quanti mostra o melhor desempenho de Wellington (Sudeste 44,2%, Noroeste 35,3%).",
        "Nenhum grupo com ensino superior ou classes A/B, faixa em que a quanti aponta menor peso relativo de Wellington.",
        "Nenhum grupo exclusivo de eleitores decididos de Pivetta ou de Natasha, o que limita a leitura de rejeição adversária.",
        "Sem teste de peças de vídeo dos adversários além de um recorte curto por candidato.",
      ],
      recomendacao:
        "Próxima onda qualitativa deve incluir Rondonópolis e Sinop, um grupo A/B com ensino superior e um grupo de eleitores decididos de Pivetta, para validar se os achados de Cuiabá se sustentam onde a quanti mostra força.",
    },
    diagnosticoMacro: {
      titulo: "Eleitor em formação de opinião",
      achado:
        "O eleitor da Grande Cuiabá está em processo de formação de voto: baixo acompanhamento da disputa, pouco contato com debates e forte demanda por informação sobre trajetórias, realizações e propostas. A indecisão está ligada à falta de informação, não à rejeição aos nomes.",
      forcaDoAchado:
        "Alta — o padrão apareceu nos três grupos, com convergência entre mulheres, homens e jovens.",
      leituraLula:
        "A disputa é percebida hoje mais por conflito (troca de acusações entre Pivetta e Wellington nas redes) do que por propostas. Quem ocupar primeiro o espaço propositivo tende a se diferenciar.",
    },
    tipologiaDireitaEstadual: [
      {
        subtipo: "Direita identitária (apoio bolsonarista)",
        descricao:
          "Em todos os grupos ser do PL, ser 'de direita' e ter apoio de Flávio Bolsonaro foi citado espontaneamente como diferencial positivo de Wellington. Frase recorrente: 'Ele é de Direita e isso pra mim é muito bom'.",
      },
      {
        subtipo: "Direita de gestão / continuidade",
        descricao:
          "Segmento que ancora o voto na continuidade da gestão Mauro Mendes e migra naturalmente para Pivetta como vice e perfil de gestor (Lucas do Rio Verde, agronegócio, maior patrimônio declarado).",
      },
      {
        subtipo: "Direita pragmática de entregas",
        descricao:
          "Vota por obra, emenda e recurso trazido para o estado — base espontânea da preferência por Wellington ('ele trouxe dinheiro para esses asfaltos'). É indiferente a rótulo e sensível a prova concreta.",
      },
      {
        subtipo: "Jovens desconectados do debate",
        descricao:
          "18-29 anos com contato apenas por cortes de redes sociais, sem repertório sobre candidatos. Demandam emprego, renda, concurso, tecnologia e capacitação; rejeitam linguagem caricata.",
      },
    ],
    eixoGravitacional: {
      leitura:
        "O eixo gravitacional da disputa em Cuiabá é a gestão Mauro Mendes: Pivetta é lido essencialmente como continuidade dela ('entrou no lugar do Mauro Mendes'), e não por atributos próprios.",
      limiteDoEfeitoHalo:
        "O halo tem limite claro: o Parque Novo Mato Grosso (FETHAB) é percebido por parte dos grupos como investimento voltado às classes mais abastadas e obra inacabada, e a Operação Heritage e a acusação de violência contra a ex-companheira corroem a imagem de Pivetta sobretudo entre mulheres.",
    },
    wellingtonLeituraFechada: {
      forca: [
        "Trajetória e experiência política (deputado federal e dois mandatos de senador)",
        "Obras, emendas e recursos para MT",
        "Presença no interior e ligação com o agronegócio",
        "Identificação com a direita/PL e apoio de Flávio Bolsonaro",
        "Confiança, firmeza e preparo",
        "Imagem pessoal e política mais preservada que a dos adversários",
      ],
      vulnerabilidadeCentral:
        "Desconhecimento sobre o que ele fez pela Grande Cuiabá: percebem ações em Rondonópolis, mas não sabem para onde foram as emendas na capital. A força de 'quem traz recurso' não está aterrissada em obra visível para o eleitor cuiabano.",
      autocriticaDoRelatorio:
        "O próprio relatório aponta que o slogan 'Tá no Coração da Gente' ainda não é reconhecido como a cara do candidato — 'ele não ganhou nosso coração, não mostrou o que fez'. A promessa afetiva chegou antes da prova.",
      segmentacaoInterna:
        "Homens 30-60 sustentam o voto por entregas em rodovias; mulheres 30-60 aderiram após ouvir o repertório de realizações no grupo; jovens 18-29 permanecem indecisos por ausência de conteúdo sobre emprego e oportunidades.",
      condicionanteMaisCritico:
        "Comentários espontâneos sobre aparência desgastada (magreza, suposição de doença grave ou uso de Mounjaro) surgiram no grupo feminino sem estímulo — é ruído de saúde não endereçado.",
    },
    achadoDestacado: {
      titulo: "Achado: o episódio dos neurodivergentes teve baixo impacto",
      achado:
        "A fala atribuída a Wellington sobre pessoas neurodivergentes circulou apenas como corte de debate entre os jovens; nenhum participante conhecia o contexto completo e o tema não moveu preferência nos grupos.",
      implicacao:
        "Não é prioridade de resposta ativa. Amplificar o assunto tende a dar sobrevida a um ruído que hoje é marginal; manter apenas resposta reativa preparada.",
    },
    outrosPlayers: {
      otavianoPivetta:
        "Reconhecido pela posição de vice e continuidade, experiência administrativa e agronegócio. Vulnerabilidades: Operação Heritage, acusação de violência contra a ex-companheira, tom percebido como arrogante no vídeo, desconhecimento entre jovens e o desgaste da troca do vice (Fábio Garcia por Gisela Simona).",
      natashaSlhessarenko:
        "Baixa familiaridade: lembrada como médica, filha de Serys e dona de clínica em Várzea Grande. O vídeo dela foi lido como ataque puro, sem propostas; perdeu a chance de se firmar como terceira via, mas ainda não tem mácula por nunca ter ocupado cargo.",
      apoiosEAlianças:
        "Jayme e Júlio Campos, Flávio Bolsonaro e Janaína Riva foram identificados espontaneamente como apoiadores de Wellington. A recusa de apoio de Abílio foi considerada irrelevante pelos grupos. Ser sogro de Janaína Riva é visto como neutro ou positivo.",
      passadoEmGovernosPetistas:
        "A participação em governos Lula, Dilma e Temer foi lembrada por homens e jovens, mas avaliada como sem efeito na disputa: 'hoje ninguém lembra'.",
    },
    pautasEstaduaisTestadas: {
      clipeOficialBoraComWellington:
        "Compreensão alta, envolvimento baixo. Bem produzido, mas percebido como peça convencional de campanha. O jingle ('Wellington é 22') fixa bem e a exibição de apoiadores foi valorizada; o slogan ainda não cola.",
      videoBolo:
        "Compreendido como crítica à repartição dos recursos, sem ataque direto — formato aprovado. Jingle memorável (batucaram na mesa), mas mensagem e imagens soaram repetitivas: poucas inserções.",
      videoPlanilhaFinal:
        "Mensagem de valorizar pessoas acima dos números foi bem entendida e contrapõe o perfil 'administrador' de Mauro Mendes. Repetição de imagens reduziu o interesse dos jovens. Mais eficaz que o Bolo.",
      prioridadesFethabParque:
        "Maior atenção e envolvimento de todo o pré-teste. Divide leituras: desenvolvimento econômico (turismo, comércio, eventos) x necessidades sociais (moradia e serviços). Merece maior veiculação, com acréscimo de tom propositivo.",
      violenciaContraAMulher:
        "Envolvimento muito alto entre mulheres e jovens, com relato pessoal de agressão em grupo. Entre homens gerou desconforto e sensação de desproteção. Sentiram falta de detalhar as leis aprovadas e o funcionamento da Secretaria da Mulher.",
      quemBateEmMulherNaoMereceSeuVoto:
        "Associado espontaneamente a Pivetta sem citação nominal. Eleitoras que declaravam propensão a Pivetta disseram que vão se informar e podem reavaliar o voto. Pedem veiculação em TV.",
      videoJovens:
        "Reprovado no formato: funk e óculos considerados caricatos por adultos, e os próprios jovens pedem conteúdo sobre emprego, renda, concurso, tecnologia e cultura. Recomendação do relatório: refazer inteiramente, formato pergunta-resposta para Instagram e TikTok.",
    },
    tensaoInternaNaoResolvida: {
      titulo: "Tensão não resolvida: pauta da mulher x desconforto masculino",
      achado:
        "A pauta de combate à violência contra a mulher é o maior mobilizador emocional entre mulheres e jovens e, ao mesmo tempo, gera reação defensiva entre homens 30-60, que se dizem desprotegidos e alegam uso indevido das leis.",
      implicacao:
        "A pauta deve ser sustentada — é território que Pivetta não pode ocupar e neutraliza Natasha — mas com enquadramento em proteção, aplicação da lei e serviços (Secretaria da Mulher), evitando formulações que soem acusatórias ao homem comum.",
    },
  },
  abas: [
    {
      id: 'jovens',
      label: 'Jovens 15-29',
      classificacao: 'agreement' as const,
      classificacaoNota: 'Quanti e quali apontam a mesma direção e mesma magnitude relativa.',
      media: 32.0,
      barras: [
        { seg: '15 a 24 (perfil do eleitorado WF)', v: 9.3 },
        { seg: '25 a 34', v: 22.0 },
        { seg: '35 a 44', v: 21.4 },
        { seg: '45 a 59', v: 26.7 },
        { seg: '60 ou mais', v: 20.6 },
      ],
      tema:
        '"Jovem quer emprego, salário bom, concurso público, faltou falar isso, só o funk não vai trazer votos." (Jovens) · "Não curti, não combina com ele, esse óculos então." (Mulheres)',
      leitura:
        'A menor presença de 15-24 anos na composição do eleitorado de Wellington (9,3%) tem eco direto na quali: os jovens não sabem o que ele fez, só o conhecem por cortes de redes e reprovaram a peça feita para eles.',
      gap:
        'A peça dirigida a jovens foi avaliada como caricata pelos adultos e vazia de conteúdo pelos próprios jovens — não há hoje oferta programática para essa faixa.',
      implicacao:
        'Refazer integralmente a comunicação jovem: formato pergunta-resposta curto para Instagram e TikTok, com pauta de emprego, renda, concurso, tecnologia, capacitação, cultura e esporte, sem forçar a imagem do candidato.',
    },
    {
      id: 'cuiaba',
      label: 'Grande Cuiabá / Centro-Sul',
      classificacao: 'partial_agreement' as const,
      classificacaoNota: 'Convergem no diagnóstico, divergem na causa atribuída.',
      media: 32.0,
      barras: [
        { seg: 'Sudeste', v: 44.2 },
        { seg: 'Noroeste', v: 35.3 },
        { seg: 'Norte', v: 31.6 },
        { seg: 'Nordeste', v: 31.1 },
        { seg: 'Centro-Sul (Grande Cuiabá)', v: 29.4 },
        { seg: 'Médio Norte', v: 26.5 },
        { seg: 'Oeste', v: 18.4 },
      ],
      tema:
        '"Eu já ouvi falar dele, mas não sei o que ele já fez aqui pra Várzea Grande." (Jovens) · "Tem uma pedra lá no Chapéu do Sol com o nome dele, acho que é de obra que ele mandou dinheiro." (Jovens)',
      leitura:
        'Centro-Sul (29,4%) fica abaixo do desempenho no Sudeste (44,2%) e no Noroeste (35,3%). A quali explica o porquê: na capital o eleitor não consegue nomear nenhuma entrega concreta de Wellington, enquanto associa suas ações a Rondonópolis.',
      gap:
        'A força "quem traz recurso para MT" não está aterrissada em obra identificável na Grande Cuiabá — a prova existe no discurso, não no repertório do eleitor da capital.',
      implicacao:
        'Campanha de prova territorial na Grande Cuiabá: mapear e mostrar, com endereço, o que as emendas dele financiaram em Cuiabá e Várzea Grande (saúde, asfalto, água, equipamentos), em peças curtas e locais.',
    },
    {
      id: 'mulheres',
      label: 'Mulheres',
      classificacao: 'agreement' as const,
      classificacaoNota: 'Achado qualitativo forte com sustentação na composição quanti.',
      media: 32.0,
      barras: [
        { seg: 'Feminino (composição do eleitorado WF)', v: 51.9 },
        { seg: 'Masculino', v: 48.1 },
      ],
      tema:
        '"Eu não sabia, mas se for verdade meu voto ele não tem mais. Quem bate em mulher é covarde." (Mulheres) · "Wellington porque o pessoal falou bem dele, não sabia que ele fez tanta coisa." (Mulheres)',
      leitura:
        'As mulheres já são maioria da composição do eleitorado de Wellington (51,9%) e foram o grupo com maior movimento positivo na quali: passaram a considerá-lo depois de conhecer suas realizações e reagiram fortemente à informação sobre violência contra a mulher envolvendo o adversário.',
      gap:
        'O material sobre violência contra a mulher não detalha as leis aprovadas nem como funcionaria a Secretaria da Mulher — falta o "como".',
      implicacao:
        'Sustentar a pauta com conteúdo concreto (leis aprovadas, desenho da Secretaria da Mulher, serviços de acolhimento) e levar a peça "Quem bate em mulher não merece seu voto" à TV, onde o alcance é maior.',
    },
    {
      id: 'homens',
      label: 'Homens 30-60',
      classificacao: 'dissonance' as const,
      classificacaoNota: 'A quali revela reação defensiva que a quanti não captura.',
      media: 32.0,
      barras: [
        { seg: 'Masculino (composição do eleitorado WF)', v: 48.1 },
        { seg: 'Feminino', v: 51.9 },
      ],
      tema:
        '"Vai ganhar o voto das mulheres, mas não veem o lado dos homens. Tem mulher que xinga, bate e você não pode nem empurrar que já pode ser preso." (Homens)',
      leitura:
        'Homens 30-60 são a base mais sólida de Wellington na quali (voto por obras em rodovias), mas foram os únicos a demonstrar desconforto com a pauta da mulher, alegando desproteção e uso indevido das leis.',
      gap:
        'A quantitativa não mede essa reação: ela aparece apenas como composição equilibrada por sexo, sem sinal de atrito temático.',
      implicacao:
        'Manter a pauta com enquadramento de proteção e aplicação da lei, e não de acusação genérica ao homem. Para esse público, reforçar em paralelo os eixos de entrega (rodovias, emendas, infraestrutura) que já sustentam o voto.',
    },
    {
      id: 'direita',
      label: 'Direita e apoios',
      classificacao: 'agreement' as const,
      classificacaoNota: 'Convergência clara entre voto presidencial e discurso dos grupos.',
      media: 32.0,
      barras: [
        { seg: 'Eleitor de Flávio Bolsonaro', v: 40.6 },
        { seg: 'Eleitor de Romeu Zema', v: 36.4 },
        { seg: 'Eleitor de Ronaldo Caiado', v: 30.2 },
        { seg: 'Eleitor de Lula', v: 28.7 },
        { seg: 'NS/Indeciso para presidente', v: 22.0 },
        { seg: 'Nulo/Branco para presidente', v: 16.9 },
      ],
      tema:
        '"Ele tem o apoio do Flávio Bolsonaro, só não vai ter do Abílio, mas esse nem conta." (Homens) · "Ele é de Direita e isso pra mim é muito bom."',
      leitura:
        'Wellington faz 40,6% entre eleitores de Flávio Bolsonaro — seu melhor segmento presidencial — e 69,5% do seu eleitorado se declara mais de direita. A quali confirma: em todos os grupos o PL, a direita e o apoio de Flávio foram citados espontaneamente como diferencial.',
      gap:
        'A passagem por governos Lula, Dilma e Temer foi lembrada, mas avaliada como irrelevante pelos participantes — o risco de contradição identitária é hoje baixo.',
      implicacao:
        'Consolidar a identidade de direita e a vitrine de apoios (Flávio Bolsonaro, Jayme e Júlio Campos, Janaína Riva), sem gastar energia defendendo o passado em governos anteriores.',
    },
    {
      id: 'indecisos',
      label: 'Indecisos',
      classificacao: 'silence' as const,
      classificacaoNota: 'A quanti dimensiona o bloco; a quali não foi desenhada para medi-lo.',
      media: 32.0,
      barras: [
        { seg: 'Wellington Fagundes', v: 32.0 },
        { seg: 'NS/Indeciso', v: 24.5 },
        { seg: 'Otaviano Pivetta', v: 21.0 },
        { seg: 'Natasha Slhessarenko', v: 11.0 },
        { seg: 'Nulo/Branco', v: 7.5 },
      ],
      tema:
        '"Não tem proposta, não sei o que vão fazer, o que querem para melhorar a nossa situação, assim não tem como decidir." (Jovens)',
      leitura:
        'O bloco de indecisos e nulos soma 32,0% da quanti — do mesmo tamanho da liderança de Wellington. A quali mostra que essa indecisão vem de falta de informação (baixo acompanhamento, conhecimento raso, ausência de propostas), não de rejeição.',
      gap:
        'Nenhuma das peças testadas entrega propostas concretas nas áreas que os grupos citam como prioridade: saúde, educação, segurança, emprego e renda, e combate à violência contra a mulher.',
      implicacao:
        'Ocupar primeiro o espaço propositivo: série de peças curtas com uma proposta concreta por área prioritária. Em um cenário de conflito percebido, quem apresentar proposta se diferencia com baixo custo.',
    },
    {
      id: 'fethab',
      label: 'Prioridades / FETHAB',
      classificacao: 'partial_agreement' as const,
      classificacaoNota: 'Alto engajamento qualitativo em tema que a quanti só capta indiretamente.',
      media: 32.0,
      barras: [
        { seg: 'Até 1 SM (composição do eleitorado WF)', v: 5.3 },
        { seg: 'Mais de 1 a 2 SM', v: 33.7 },
        { seg: 'Mais de 2 a 5 SM', v: 40.4 },
        { seg: 'Mais de 5 a 10 SM', v: 18.2 },
        { seg: 'Mais de 10 SM', v: 2.4 },
      ],
      tema:
        '"Meu sonho é ter minha casa própria, sabendo que poderia ter construído as casas e ele preferiu construir esse parque dá revolta." (Mulheres) · "Traz visibilidade para Cuiabá, mas temos outras necessidades. Eu preferiria a casa." (Jovens)',
      leitura:
        'O eleitorado de Wellington concentra-se em 1 a 5 salários mínimos (74,1%) — exatamente o público que na quali prioriza moradia e serviços essenciais sobre o Parque Novo Mato Grosso, lido como investimento para as classes mais abastadas.',
      gap:
        'A peça denuncia a prioridade errada, mas não oferece a alternativa: falta dizer o que seria feito no lugar.',
      implicacao:
        'Ampliar a veiculação da peça FETHAB em todas as mídias — foi a de maior impacto do pré-teste — acrescentando um fecho propositivo com moradia e serviços essenciais.',
    },
  ],
  sintese: {
    agreement: [
      'Wellington lidera com 32,0% na estimulada e é, na quali, o nome mais lembrado e mais respeitado — trajetória, obras e recursos para MT sustentam as duas leituras.',
      'A identidade de direita é ativo real: 40,6% entre eleitores de Flávio Bolsonaro na quanti e menção espontânea positiva ao PL e à direita nos três grupos.',
      'Mulheres são maioria do eleitorado de Wellington (51,9%) e foram o segmento de maior movimento positivo nos grupos.',
      'Baixa penetração entre jovens: 15-24 representa só 9,3% do seu eleitorado e os jovens dos grupos não sabem o que ele fez.',
    ],
    partial_agreement: [
      'Centro-Sul (29,4%) abaixo de Sudeste (44,2%) e Noroeste (35,3%): a quali atribui a diferença ao desconhecimento das entregas na Grande Cuiabá, não a rejeição.',
      'O perfil de renda do eleitorado (74,1% entre 1 e 5 SM) alinha-se à leitura qualitativa que prioriza moradia sobre o Parque Novo Mato Grosso — mas a quanti não mede a pauta diretamente.',
      'Pivetta aparece como segundo colocado (21,0%) e na quali é lido só como continuidade de Mauro Mendes, sem atributos próprios consolidados.',
    ],
    dissonance: [
      'A pauta de violência contra a mulher mobiliza fortemente mulheres e jovens e gera reação defensiva entre homens 30-60 — atrito invisível na quantitativa.',
      'O slogan "Tá no Coração da Gente" não é reconhecido como identidade do candidato pelos grupos, apesar da liderança quantitativa.',
      'Comentários espontâneos sobre aparência e suposta doença grave surgiram apenas na quali, sem qualquer contrapartida na quanti.',
    ],
    silence: [
      'A quanti não mede recall nem avaliação de peças de campanha: toda a leitura de comunicação vem exclusivamente do pré-teste qualitativo.',
      'A quali não cobre interior, classes A/B nem ensino superior — segmentos em que a quanti mostra comportamento distinto (superior é 20,4% da composição de WF).',
      'Nenhuma das fontes mede intenção de voto entre eleitores que conhecem as realizações de Wellington na Grande Cuiabá — hipótese central da campanha, ainda não testada.',
      'O episódio dos neurodivergentes não foi medido quantitativamente e teve impacto marginal na quali.',
    ],
    recomendacoes: [
      'Rodar grupos em Rondonópolis e Sinop para verificar se a força quantitativa no Sudeste e Noroeste tem lastro qualitativo.',
      'Incluir um grupo A/B com ensino superior e um grupo de eleitores decididos de Pivetta.',
      'Testar peças de prova territorial na Grande Cuiabá (emendas com endereço) antes de escalar investimento.',
      'Pré-testar a nova peça jovem em formato pergunta-resposta antes da veiculação.',
      'Testar enquadramentos da pauta da mulher que sustentem a agenda sem ativar a reação defensiva masculina.',
    ],
  },
  insightsMarketing: {
    avisoMetodologico:
      'Priorização derivada do cruzamento entre a quanti PercentBrasil (MT, ago/2026) e o pré-teste qualitativo Vetor Pesquisas (Grande Cuiabá, ago/2026). O mapa de ênfase abaixo indica peso estratégico atribuído na análise, não frequência medida de menções.',
    mapaEnfase: [
      { termo: 'emendas e obras para MT', peso: 5, valencia: 'positiva' as const },
      { termo: 'experiência e trajetória', peso: 5, valencia: 'positiva' as const },
      { termo: 'direita / PL / Flávio Bolsonaro', peso: 4, valencia: 'positiva' as const },
      { termo: 'confiança e firmeza', peso: 4, valencia: 'positiva' as const },
      { termo: 'violência contra a mulher', peso: 4, valencia: 'positiva' as const },
      { termo: 'prioridades do FETHAB', peso: 4, valencia: 'positiva' as const },
      { termo: 'jingle "Wellington é 22"', peso: 3, valencia: 'positiva' as const },
      { termo: 'apoios políticos', peso: 3, valencia: 'positiva' as const },
      { termo: 'o que fez pela Grande Cuiabá', peso: 5, valencia: 'negativa' as const },
      { termo: 'ausência de propostas', peso: 4, valencia: 'negativa' as const },
      { termo: 'desconexão com jovens', peso: 4, valencia: 'negativa' as const },
      { termo: 'aparência / saúde', peso: 3, valencia: 'negativa' as const },
      { termo: 'peças repetitivas', peso: 3, valencia: 'negativa' as const },
      { termo: 'slogan não reconhecido', peso: 3, valencia: 'negativa' as const },
      { termo: 'tempo longo de política', peso: 2, valencia: 'negativa' as const },
      { termo: 'governos Lula/Dilma/Temer', peso: 1, valencia: 'neutra' as const },
      { termo: 'sogro de Janaína Riva', peso: 1, valencia: 'neutra' as const },
      { termo: 'fala sobre neurodivergentes', peso: 1, valencia: 'neutra' as const },
    ],
    obrigatorios: [
      {
        tema: 'Prova das entregas na Grande Cuiabá',
        justificativa:
          'Maior gap do cruzamento: Centro-Sul é a região onde Wellington menos performa (29,4%) e onde o eleitor não consegue nomear uma entrega dele. Mostrar emendas com endereço em Cuiabá e Várzea Grande.',
        alvo: 'Grande Cuiabá · C1/C2 · todas as idades',
      },
      {
        tema: 'Prioridades do gasto público (FETHAB / Parque)',
        justificativa:
          'Peça de maior atenção e envolvimento de todo o pré-teste. Confronta a gestão sem ataque pessoal e conversa direto com o eleitorado de 1 a 5 SM, que é 74,1% da base de Wellington.',
        alvo: 'Todo o estado · renda de 1 a 5 SM',
      },
      {
        tema: 'Combate à violência contra a mulher com o "como"',
        justificativa:
          'Maior mobilização emocional dos grupos e território que Pivetta não pode ocupar. Precisa detalhar as leis aprovadas e o funcionamento da Secretaria da Mulher.',
        alvo: 'Mulheres 30-60 e jovens · 51,9% do eleitorado de WF',
      },
      {
        tema: 'Propostas concretas por área prioritária',
        justificativa:
          'Indecisos e nulos somam 32,0% e a indecisão é causada por falta de informação. Saúde, educação, segurança, emprego e renda foram citados espontaneamente.',
        alvo: 'Indecisos · 24,5% do eleitorado estadual',
      },
    ],
    possiveis: [
      {
        tema: 'Nova comunicação para jovens (pergunta-resposta)',
        justificativa:
          'A peça atual foi reprovada nos três grupos. O relatório recomenda refazer inteiramente com pauta de emprego, concurso, tecnologia e cultura, em formato curto para Instagram e TikTok. Pré-testar antes de escalar.',
        alvo: 'Jovens 15-29 · hoje apenas 9,3% da base de WF',
      },
      {
        tema: 'Vitrine de apoios políticos',
        justificativa:
          'Apoios (Flávio Bolsonaro, Jayme e Júlio Campos, Janaína Riva) foram identificados espontaneamente e valorizados, mas o clipe inteiro teve baixo envolvimento. Usar como bloco, não como peça.',
        alvo: 'Direita e eleitor de Flávio Bolsonaro · 40,6% de adesão a WF',
      },
      {
        tema: 'Reposicionamento do slogan',
        justificativa:
          '"Tá no Coração da Gente" não é reconhecido como a cara do candidato. Só ganha sentido depois da prova de realizações — testar novamente após a campanha de entregas.',
        alvo: 'Todo o estado',
      },
      {
        tema: 'Peça Planilha Final (olhar humano x números)',
        justificativa:
          'Contrapõe bem o perfil administrador da gestão atual e foi melhor avaliada que o Bolo, mas a repetição de imagens cansou. Renovar o material antes de mais inserções.',
        alvo: 'Adultos 30-60',
      },
    ],
    irrelevantes: [
      {
        tema: 'Resposta ativa ao episódio dos neurodivergentes',
        risco:
          'O tema chegou só como corte de rede social, sem contexto, e não moveu preferência em nenhum grupo. Amplificar dá sobrevida a um ruído hoje marginal.',
        alvo: 'Jovens · manter apenas resposta reativa',
      },
      {
        tema: 'Defesa da passagem por governos Lula, Dilma e Temer',
        risco:
          'Os próprios grupos avaliaram como irrelevante — "hoje ninguém lembra". Trazer o assunto cria um problema que o eleitor não tem.',
        alvo: 'Direita · nenhum ganho esperado',
      },
      {
        tema: 'Reforço do clipe oficial e do vídeo do Bolo',
        risco:
          'Compreensão alta, envolvimento baixo e sensação de repetição. Mais inserções tendem a acelerar a fadiga já detectada, principalmente entre jovens.',
        alvo: 'Todos os segmentos',
      },
      {
        tema: 'Ataque direto e nominal aos adversários',
        risco:
          'Os grupos rejeitaram o tom confrontativo de Pivetta e de Natasha. As peças de Wellington foram aprovadas justamente por criticar sem citar nomes.',
        alvo: 'Todos os segmentos',
      },
    ],
  },
};

export type CruzamentoWellingtonData = typeof DATA_CRUZAMENTO_WELLINGTON;
