# Nuvem de termos da taxonomia + atualização em tempo real

## 1. Palavras cortadas na nuvem
As palavras aparecem cortadas ("paran", "públic", "seguranc") porque a função da nuvem usa o dicionário de busca do Postgres em português, que reduz cada palavra ao seu radical.

Faz sentido, sim, usar a taxonomia da plataforma. A nuvem passa a ser construída sobre os nomes oficiais de **Eixos, Temas e Subtemas** já cadastrados, e não sobre palavras soltas:

- Para cada eixo/tema/subtema, contar quantas sugestões mencionam aquele termo no texto (comparação sem acento e sem diferenciar maiúsculas, aceitando singular/plural simples).
- Exibir o nome oficial completo e legível ("Segurança Pública", "Educação", "Saneamento e Água"), com tamanho proporcional à frequência.
- Cores por nível: eixo (maior destaque), tema, subtema — permitindo enxergar a hierarquia na própria nuvem.
- Termos com zero menções ficam de fora; ordenação por frequência.

Assim a nuvem fica alinhada aos 5 eixos, 34 temas e subtemas da plataforma, sem palavras quebradas nem ruído.

## 2. Tempo real
Já está previsto e funcionando na base: a tabela de sugestões populares está publicada em tempo real e o painel escuta novas inserções, recarregando os gráficos. Melhorias:

- Incluir também atualizações (não só inserções) e recarregar a nuvem de palavras junto com os demais painéis (hoje ela só atualiza no ciclo de 60s).
- Agrupar recargas em janela de 3 segundos para evitar rajadas quando várias sugestões entram juntas.
- Selo "ao vivo" com o horário do último evento recebido.

## 3. As análises são refeitas automaticamente? Consome crédito?
Sim, e sem consumo de crédito de IA. A classificação por eixo/subeixo das sugestões desse painel é feita por uma função dentro do próprio banco (regras de palavras-chave), disparada automaticamente a cada nova sugestão. Todos os cruzamentos, ranking, heatmap e nuvem são calculados por consultas ao banco no momento da exibição — nenhuma chamada a modelo de IA está envolvida, então atualizar em tempo real não gera custo adicional de créditos.

Observação: existe um classificador por IA usado em outro fluxo do sistema. Ele não faz parte deste painel e não será acionado por essas atualizações.

## Detalhes técnicos
- Migração: reescrever `painel_cruzamento_nuvem_palavras(p_limit)` para retornar `(termo text, nivel text, freq bigint)`. Fonte dos termos: união de `eixos_tematicos.nome`, `temas.nome` e `subtemas.nome`. Contagem via join lateral em `sugestoes_populares` usando `public.unaccent(lower(descricao)) ~ ('\m' || regexp de palavras do termo)`; permanece `security definer` com checagem `pode_ver_painel_cruzamento()` e grants inalterados.
- `src/pages/AdminCruzamentoSugestoes.tsx`: renderizar a nuvem com `nivel` definindo cor/peso (eixo = NAVY forte, tema = RED, subtema = GOLD), incluir `nuvem` no `refetchAll`, ouvir eventos `*` no canal Realtime e aplicar debounce de 3s.
