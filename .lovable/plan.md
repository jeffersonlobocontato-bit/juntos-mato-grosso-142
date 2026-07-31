# Nuvem de palavras inteiras + atualização em tempo real

## 1. Palavras cortadas na nuvem
As palavras aparecem cortadas ("paran", "públic", "seguranc") porque a função que gera a nuvem usa o dicionário de busca do Postgres em português, que reduz cada palavra ao seu radical. Vamos trocar essa lógica por uma extração de palavras reais do texto das sugestões:

- Separar o texto por espaços/pontuação, manter a palavra completa (sem radicalização), em minúsculas e sem acento apenas para agrupar duplicatas — exibindo a forma acentuada mais frequente.
- Ignorar palavras com menos de 4 letras, números e uma lista de palavras vazias em português (que, para, com, mais, uma, dos, das, nos, nas, pelo, sobre, quando, muito, etc.).
- Manter o limite de 80 termos, ordenados por frequência.

Resultado: "Paraná", "público", "segurança", "educação", "saúde", "escola" — inteiras e acentuadas.

## 2. Tempo real
Já está previsto e funcionando na base: a tabela de sugestões populares está publicada em tempo real e o painel escuta novas inserções, recarregando os gráficos. Melhorias:

- Incluir também atualizações (não só inserções) e recarregar a nuvem de palavras junto com os demais painéis (hoje ela só atualiza no ciclo de 60s).
- Agrupar recargas em janela de 3 segundos para evitar rajadas quando várias sugestões entram juntas.
- Selo "ao vivo" com o horário do último evento recebido.

## 3. As análises são refeitas automaticamente? Consome crédito?
Sim, e sem consumo de crédito de IA. A classificação por eixo/subeixo das sugestões desse painel é feita por uma função dentro do próprio banco (regras de palavras-chave), disparada automaticamente a cada nova sugestão. Todos os cruzamentos, ranking, heatmap e nuvem são calculados por consultas ao banco no momento da exibição — nenhuma chamada a modelo de IA está envolvida, então atualizar em tempo real não gera custo adicional de créditos.

Observação: existe um classificador por IA usado em outro fluxo do sistema. Ele não faz parte deste painel e não será acionado por essas atualizações.

## Detalhes técnicos
- Migração: substituir `painel_cruzamento_nuvem_palavras` — trocar `tsvector_to_array(to_tsvector('portuguese', ...))` por `regexp_split_to_table(lower(descricao), '[^[:alpha:]áéíóúâêôãõç]+')`, agrupar por forma sem acento (`unaccent`) e retornar a variante mais comum; filtro de stopwords via array constante; permanece `security definer` com checagem `pode_ver_painel_cruzamento()`.
- `src/pages/AdminCruzamentoSugestoes.tsx`: incluir `nuvem` no `refetchAll`, ouvir eventos `*` no canal Realtime e aplicar debounce de 3s.
