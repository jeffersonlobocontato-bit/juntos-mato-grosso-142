Vou ajustar apenas o exportador de PDF do fichamento para que cada nota da coluna direita tenha uma marcação clara no trecho correspondente da coluna esquerda.

Arquivos a modificar:

1. `src/utils/planoGovernoFichamentoExport.ts`

Alterações específicas:

- Corrigir o parser de referências do texto principal para reconhecer tanto o formato `[^N]` quanto o formato `[N]`.
  - Hoje os parágrafos só transformam `[^N]` em bolinha numerada.
  - As tabelas transformam as referências em texto `[N]`, e por isso a referência fica visualmente comum dentro da célula, sem a mesma marcação clara usada na nota lateral.

- Substituir, no PDF, a renderização textual das referências dentro das tabelas por marcadores visuais numerados.
  - Em vez de apenas mostrar `[1]`, `[12]`, `[10]`, etc. como texto preto comum dentro da célula, cada referência será desenhada como uma bolinha colorida numerada no próprio local do trecho citado.
  - Essa bolinha terá a mesma cor e número da nota correspondente na coluna direita.
  - O ponto de conexão da linha lateral passará a sair dessa bolinha, e não apenas de uma posição aproximada da célula.

- Ajustar o cálculo das posições registradas em `refPositions`.
  - Para parágrafos, manter o registro no ponto exato da bolinha já existente.
  - Para tabelas, registrar a posição de cada bolinha desenhada dentro da célula, evitando conectores genéricos no canto direito da linha da tabela.

- Melhorar o desenho dos conectores.
  - As linhas verdes/douradas/por tipo continuarão conectando coluna esquerda e nota direita.
  - Com a nova marcação, o leitor verá duas confirmações visuais: a bolinha numerada no texto/tabela e a mesma bolinha na nota lateral.

- Manter a lógica já corrigida anteriormente contra sobreposição/truncamento das notas laterais.
  - Não vou mexer no DOCX, backend, parser da IA ou UI.
  - A alteração será restrita ao PDF do fichamento.

Critério visual esperado após a correção:

- Onde hoje aparece algo como `região de fronteira [1].`, passará a aparecer o marcador numerado destacado no local da citação.
- A nota direita `1` ficará claramente associada à bolinha `1` no trecho da proposta.
- Em células com múltiplas fontes, como `[3][7]` ou `[17][27]`, cada número será destacado individualmente no mesmo local do texto.
- As notas que forem para `Notas (continuação)` continuarão com sua numeração correspondente no texto original.