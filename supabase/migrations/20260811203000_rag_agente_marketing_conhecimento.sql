-- Base de conhecimento (RAG) exclusiva do Agente de Marketing Eleitoral —
-- técnica de neuromarketing, cases e guia de copywriting. Categoria própria
-- (rag_tecnica_marketing_ia) pra garantir que a busca semântica do agente
-- nunca alcance outros documentos da plataforma (propostas, pesquisas etc.).
-- O agente filtra explicitamente por estes IDs via filter_doc_ids.

INSERT INTO public.ai_documents (title, content, doc_category, scope, is_active, description)
VALUES (
  $tit$Playbook de Neuromarketing Eleitoral$tit$,
  $cont$PLAYBOOK DE NEUROMARKETING ELEITORAL

Este documento é a base técnica do Agente de Marketing Eleitoral. Cada técnica abaixo deve ser citada pelo nome exato quando usada na nota técnica de uma peça de conteúdo.

1. PROVA SOCIAL DIRECIONADA
O que é: mostrar que pessoas do mesmo grupo/território/perfil do público-alvo já pensam ou agem de determinado jeito. Não é prova social genérica ("milhares já participaram") — é prova social espelhada: gente parecida com quem está assistindo.
Quando usar: públicos que decidem por pertencimento a grupo (produtor rural, servidor público, mãe de família). Funciona pior em públicos que se veem como individualistas ou contrários ao "senso comum".
Aplicação por eixo: em Desenvolvimento Social, mostrar outras mães/professores que já enviaram sugestão parecida. Em Segurança, mostrar policiais ou moradores do mesmo bairro relatando a mesma preocupação.

2. ANCORAGEM
O que é: a primeira informação apresentada define o referencial de julgamento de tudo que vem depois. Se a peça abre com um número ruim (fila de 6 meses), tudo que vier depois é comparado a essa âncora.
Quando usar: sempre que houver um dado concreto e chocante disponível no recorte de sugestões. Evitar quando o dado for frágil ou não verificável — uma âncora fraca destrói a credibilidade do resto da peça.
Cuidado: nunca ancorar em número que não vem direto do recorte de dados fornecido nesta conversa.

3. AVERSÃO À PERDA
O que é: o medo de perder algo que já se tem pesa mais na decisão do que a promessa de ganhar algo novo. Funciona com quem já tem algo a proteger (segurança, qualidade de vida, renda).
Quando usar: públicos urbanos de classe média/alta com padrão de vida a defender (persona "Urbano preocupado com segurança"). Não funciona bem com quem sente que nunca teve nada a perder (regiões historicamente esquecidas) — ali o gatilho certo é reconhecimento, não medo de piora.
Cuidado: aversão à perda vira alarmismo se não tiver base factual. A linha entre "alertar" e "assustar" é a precisão do dado usado.

4. RECIPROCIDADE
O que é: reconhecer o esforço do público antes de pedir qualquer coisa em troca (voto, engajamento, compartilhamento) aumenta a disposição de retribuir.
Quando usar: quase sempre como abertura de peça, antes do pedido de ação. Especialmente forte com quem já enviou uma sugestão pra plataforma — reconhecer que a pessoa foi ouvida é reciprocidade concreta, não retórica.

5. COMPROMISSO E CONSISTÊNCIA
O que é: pedir uma ação pequena (comentar, compartilhar, responder uma enquete) antes de pedir uma ação grande (votar, doar, engajar publicamente) aumenta a taxa de conversão da ação grande, porque a pessoa quer ser consistente com o que já fez.
Quando usar: estratégias de funil em redes sociais — nunca pedir a ação máxima na primeira peça.

6. AUTORIDADE
O que é: apoiar a mensagem em credencial técnica real e verificável, não em cargo ou bravata. Autoridade mal calibrada (arrogância, autoritarismo) gera rejeição, não confiança.
Quando usar: sempre que a credencial de ex-juiz/ex-ministro do senador for diretamente relevante ao tema (segurança, justiça, combate à corrupção). Evitar puxar autoridade jurídica pra temas onde ela não conversa naturalmente (ex: agronegócio) — ali a autoridade certa é de escuta territorial, não de currículo.

7. STORYTELLING EM TRÊS ATOS
O que é: contexto reconhecível (a pessoa se vê na cena) → conflito nomeado (o problema específico, não genérico) → resolução concreta (o que muda, quando, como). Ordem importa: pular direto pra resolução sem nomear o conflito específico enfraquece a peça inteira.
Quando usar: roteiro de vídeo institucional e reels. Em copy curta, os três atos podem virar três frases, mas a estrutura se mantém.

8. IDENTIDADE E PERTENCIMENTO
O que é: falar a língua e os símbolos do grupo específico (produtor rural, mãe, servidor público) em vez de falar com "o eleitor" genérico. Isso ativa identidade social, que pesa mais que argumento racional isolado.
Quando usar: sempre que houver persona definida pro conteúdo. Nunca escrever peça "para todo mundo" quando existe um recorte de público mais específico disponível.

9. CONTRASTE
O que é: estrutura de antes/depois, ou "isso vs. aquilo", torna a proposta mais concreta do que adjetivo solto ("vamos melhorar a saúde" é fraco; "de 6 meses de fila pra 30 dias" é forte).
Quando usar: sempre que houver dois estados comparáveis no recorte de dados (situação atual vs. proposta) ou entre regiões/grupos.

10. PRIMING EMOCIONAL
O que é: abrir pela emoção — uma cena, uma sensação, um som — antes de qualquer dado ou proposta. O cérebro processa emoção antes de processar lógica; abrir com dado técnico perde a primeira e mais importante janela de atenção.
Quando usar: primeiros 3 segundos de reels e primeiros 10 segundos de vídeo institucional são sempre priming emocional, nunca dado.

11. EFEITO DE DISTINTIVIDADE (VON RESTORFF)
O que é: o que foge do padrão visual ou verbal esperado é lembrado com mais força. Uma peça que parece igual a todas as outras peças políticas do feed é esquecida antes de terminar de rolar a tela.
Quando usar: escolha de abertura de reels e de primeira linha de copy — evitar clichês de campanha ("juntos vamos construir um novo Paraná").

12. REGRA DOS TRÊS
O que é: listas e argumentos com três itens são lembrados com mais facilidade e soam mais completos que dois ou mais confiáveis que cinco (que soa genérico/decorado).
Quando usar: pit de falas, bullets de copy, estrutura de roteiro de vídeo institucional (três blocos temáticos).

REGRA DE COMBINAÇÃO
Nunca usar mais de duas técnicas centrais na mesma peça de conteúdo curto (reels, copy). Peças mais longas (vídeo institucional) podem combinar até três, desde que uma seja a espinha dorsal (geralmente storytelling em três atos) e as outras reforcem pontos específicos dentro da estrutura.

REGRA DE HONESTIDADE
Nenhuma técnica desse playbook autoriza uso de dado inventado, número não verificado ou promessa sem lastro no plano de governo real. Neuromarketing eleitoral eficaz ativa percepção sobre fatos reais — não fabrica fatos para ativar percepção.
$cont$,
  'rag_tecnica_marketing_ia',
  'global',
  true,
  $desc$Repertório de técnicas de neuromarketing e persuasão para o Agente de Marketing Eleitoral, com regras de combinação e honestidade.$desc$
);

INSERT INTO public.ai_documents (title, content, doc_category, scope, is_active, description)
VALUES (
  $tit$Biblioteca de Cases Eleitorais — Repertório Estendido$tit$,
  $cont$BIBLIOTECA DE CASES ELEITORAIS — REPERTÓRIO ESTENDIDO

Casos reais de campanhas e governos brasileiros, documentados publicamente. Nenhum nome de estrategista é citado — o repertório é de padrão, não de autoria. Use como inspiração de estrutura, nunca como cópia literal de peça.

CASO — NEUTRALIZAR O PRÓPRIO PASSADO PELA AUTOCRÍTICA
Contexto: candidata a prefeitura de São Paulo, 1996, carregava rejeição por uma gestão anterior malvista pelo eleitorado, mesmo com base fiel de apoio.
Estratégia: em vez de evitar o tema ou atacar quem lembrava dele, a campanha assumiu publicamente que "aprendeu com os erros" da gestão anterior — transformou a crítica mais óbvia do adversário em autocrítica antecipada, tirando a força do ataque alheio.
Resultado: o tema de rejeição perdeu força como munição de adversário, porque já tinha sido nomeado e respondido pela própria candidata antes que o ataque viesse de fora.
Técnica de neuromarketing envolvida: consistência (a autocrítica pública cria compromisso com a mudança prometida) combinada com contraste (versão antiga vs. versão que aprendeu).
Lição aplicável: se existe uma vulnerabilidade conhecida e repetida sobre o candidato (ex: "sumiu no Senado"), a resposta mais forte não é ignorar nem negar — é nomear a lacuna e mostrar o que mudou, antes que o adversário nomeie primeiro.

CASO — O CANDIDATO COMO GARANTIDOR DE CONTINUIDADE
Contexto: candidato ao governo do Rio de Janeiro, eleição de 2006, concorrendo por um projeto de reconstrução da cidade e do estado.
Estratégia: a campanha colocou o próprio candidato como "garantidor" pessoal do projeto de reconstrução, reforçado pela continuidade com o governo estadual e a presidência da República do mesmo campo político — três níveis de governo alinhados como prova de capacidade de entrega.
Resultado: a narrativa de continuidade e capacidade de articulação (não apenas promessa individual) foi um dos eixos centrais da vitória.
Técnica de neuromarketing envolvida: autoridade (o candidato como figura central de entrega) combinada com prova social institucional (alinhamento com outros níveis de governo já aprovados).
Lição aplicável: quando o candidato tem histórico de entrega real e alinhamento com lideranças bem avaliadas, nomear esse alinhamento explicitamente reduz a percepção de risco — funciona melhor quando o aliado citado é genuinamente bem avaliado pelo público local (ver risco de contágio reverso: nunca fazer isso com um aliado malvisto).

CASO — CARTA PÚBLICA PARA DESTRAVAR MEDO DE MERCADO
Contexto: eleição nacional de 2002, parte do eleitorado e do mercado temia ruptura das regras econômicas em vigor com a vitória do candidato.
Estratégia: documento público comprometendo-se a manter os fundamentos econômicos, sem abandonar a pauta social. Não foi promessa nova — foi remoção de um medo específico e nomeado.
Resultado: a intenção de voto travada por medo destravou; vitória em dois turnos, incluindo eleitores que antes declaravam receio.
Técnica de neuromarketing envolvida: aversão à perda revertida — em vez de ativar medo, a peça neutralizou um medo já existente no público, nomeando-o diretamente.
Lição aplicável: quando uma persona trava por medo específico e nomeável (ex: medo de radicalização, medo de descontinuidade), endereçar esse medo diretamente por escrito, de forma pública e verificável, vale mais que reforçar a proposta positiva.

CASO — GESTÃO POR DADO SUPERANDO DISCURSO DURO
Contexto: governo estadual do Nordeste, a partir de 2007, estado em 2º lugar no ranking nacional de homicídios.
Estratégia: plano de estado com boletins públicos regulares, integração entre polícias, aumento de efetivo e liderança pessoal contínua do governador acompanhando os números mês a mês — não discurso de confronto.
Resultado: queda de 35 a 40% na taxa de homicídios em poucos anos, prêmio internacional — mas o resultado reverteu quando o governador se afastou do cargo, mostrando dependência de presença contínua.
Técnica de neuromarketing envolvida: prova social + autoridade técnica sustentada ao longo do tempo, não em pico de campanha.
Lição aplicável: reforça que tom sóbrio e institucional tem melhor sustentação de longo prazo que retórica de confronto — mas exige comunicação de resultado contínuo, não só peça de lançamento.

CASO — RETÓRICA EXTREMA: CONVERSÃO RÁPIDA, RISCO DE GOVERNO
Contexto: governo estadual do Sudeste, eleição de 2018, onda de violência urbana e clamor por resposta dura.
Estratégia: discurso de confronto armado explícito como plataforma central de campanha.
Resultado: vitória eleitoral rápida e expressiva — mas o governo eleito foi interrompido por impeachment menos de dois anos depois.
Técnica de neuromarketing envolvida: aversão à perda extrema + priming emocional de medo sem base institucional de sustentação.
Lição aplicável: contraponto direto ao caso anterior — retórica extrema converte voto rápido, mas é o padrão mais associado a desgaste de governo depois. Não deve ser usado como referência de estilo mesmo quando pressionado por conversão rápida.

CASO — COOPERAÇÃO TÉCNICA SEM DISPUTA DE CRÉDITO POLÍTICO
Contexto: governo estadual do Nordeste, a partir de 2007, uma das piores notas educacionais do país.
Estratégia: pacto técnico de cooperação com todos os municípios, sem disputa de crédito político entre estado e prefeituras, avaliação sistemática e forte investimento em formação de professores.
Resultado: maior crescimento do índice educacional do Brasil no período; hoje concentra a maioria dos municípios mais bem colocados do ranking nacional.
Técnica de neuromarketing envolvida: reciprocidade institucional (o estado oferece cooperação, não imposição) + regra dos três (metodologia com passos claros e replicáveis).
Lição aplicável: para públicos onde educação já é pauta dominante, o discurso pode prometer método replicável e mensurável, não só mais recurso.

CASO — MANUTENÇÃO PAGA POR RESULTADO, NÃO POR OBRA ENTREGUE
Contexto: governo estadual do Sudeste, anos 2000, malha rodoviária deteriorada e orçamento insuficiente.
Estratégia: contratos de manutenção rodoviária pagos por desempenho comprovado, não por obra entregue, com acompanhamento público e metas mensuráveis.
Resultado: proporção de rodovias com contrato de manutenção por desempenho quase dobrou em poucos anos, com ganhos simultâneos em saúde e educação pelo mesmo modelo de gestão.
Técnica de neuromarketing envolvida: contraste (antes/depois mensurável) + autoridade técnica (instrumento de gestão nomeado, não promessa vaga).
Lição aplicável: prometer que manutenção será cobrada por resultado entregue — não que "some" depois da inauguração — converte melhor com público que já foi decepcionado por obra inaugurada e depois abandonada.

CASO — DESCENTRALIZAÇÃO INDUSTRIAL REDUZINDO DESIGUALDADE REGIONAL
Contexto: governo estadual do Sul, trajetória de décadas, risco comum de concentrar toda nova indústria na capital e no litoral.
Estratégia: descentralização industrial deliberada, com polos regionais distintos por vocação e infraestrutura logística acompanhando cada polo, não só a capital.
Resultado: menor taxa de desemprego do país e um dos menores índices de pobreza, com emprego distribuído entre múltiplas cidades do interior.
Técnica de neuromarketing envolvida: identidade e pertencimento territorial (cada polo tem identidade própria, não é "mais uma fábrica na capital").
Lição aplicável: para regiões de interior, emprego não precisa prometer fábrica na capital — pode prometer um polo com identidade regional própria.
$cont$,
  'rag_tecnica_marketing_ia',
  'global',
  true,
  $desc$Cases reais de campanhas e governos brasileiros documentados publicamente, cada um com técnica de neuromarketing associada e lição aplicável.$desc$
);

INSERT INTO public.ai_documents (title, content, doc_category, scope, is_active, description)
VALUES (
  $tit$Guia de Copywriting Político por Formato$tit$,
  $cont$GUIA DE COPYWRITING POLÍTICO POR FORMATO

VÍDEO INSTITUCIONAL (60-120 segundos)
Estrutura fixa:
1. Abertura (0-10s): priming emocional puro — cena, som ambiente, ou frase curta que situa o espectador no problema, sem dado ainda.
2. Contexto (10-25s): nomeia o problema específico do território/persona, não genérico. Aqui entra o primeiro dado, se houver, funcionando como âncora.
3. Desenvolvimento (25-90s): até três blocos temáticos (regra dos três), cada um com uma frase de diagnóstico + uma frase de proposta. Nunca mais que três blocos — satura a retenção.
4. Fechamento (90-120s): chamada à ação clara, tom afirmativo, nunca pergunta retórica. Fecha com frase curta e replicável, que funcione fora de contexto (para virar corte de rede social).
Regra de ouro: o espectador médio decide se continua assistindo nos primeiros 5 segundos — nunca abrir com o nome do candidato ou cargo, abrir com a cena/problema.

REELS / VÍDEO VERTICAL CURTO (15-30 segundos)
Estrutura fixa:
1. Gancho (0-3s): inegociável. Testo visual ou fala que gera pausa no scroll — geralmente uma pergunta direta, um número chocante bem ancorado, ou uma cena de contraste.
2. Corpo (3-20s): corte rápido, sem transição lenta, um único argumento central (nunca mais que um — reels não comporta storytelling em três atos completo, comporta um ato só, bem executado).
3. CTA (20-30s): direto, visual, com texto na tela reforçando o áudio (parte do público assiste sem som).
Regra de ouro: se o roteiro precisar de mais de uma ideia central pra funcionar, é vídeo institucional, não reels — dividir em duas peças em vez de espremer num só reels.

COPY DE REDES SOCIAIS (legenda / anúncio pago)
Estrutura fixa:
1. Primeira linha: precisa funcionar sozinha, antes do "ver mais" — geralmente é o gancho de contraste ou a pergunta direta.
2. Corpo: 2-4 frases curtas, uma ideia por frase, sem parágrafo denso.
3. Fechamento: CTA explícito (comentar, compartilhar, acessar link) — nunca implícito.
Variações recomendadas por peça: gerar sempre 2-3 versões de copy pra mesma peça, cada uma podendo usar uma técnica de neuromarketing diferente (ex: uma versão em prova social, outra em contraste, outra em aversão à perda) — permite teste A/B real em vez de aposta única.

REGRAS TRANSVERSAIS A TODO FORMATO
- Nunca abrir peça de conteúdo com o nome do partido ou jargão de campanha ("juntos vamos construir", "o novo tempo chegou") — são frases que o público já filtra automaticamente como propaganda genérica.
- Toda peça deve ser ancorada em dado real do recorte de sugestões populares fornecido na conversa, ou em proposta documentada do plano de governo — nunca em número inventado.
- Peças de vídeo ou reels com qualquer edição assistida por inteligência artificial devem ser rotuladas de forma explícita, destacada e acessível, informando que houve uso de IA na produção — exigência da Resolução TSE nº 23.755/2026, artigo 9º-B. Peças de texto puro (copy) não exigem esse rótulo, mas o roteiro deve alertar a equipe de produção quando a peça for destinada a virar vídeo sintético ou gerado por IA.
- Toda peça termina com a nota técnica: técnica utilizada, por que funciona neste caso, e qual público (por gênero/região/eixo, conforme o recorte de dados da conversa) mais responde a ela.
$cont$,
  'rag_tecnica_marketing_ia',
  'global',
  true,
  $desc$Estruturas fixas de roteiro por formato (vídeo institucional, reels, copy de redes) e regras transversais, incluindo a exigência de rotulagem de conteúdo sintético da Resolução TSE 23.755/2026.$desc$
);
